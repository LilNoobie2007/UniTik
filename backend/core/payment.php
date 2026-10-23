<?php
declare(strict_types=1);

/*
 * File: backend/core/payment.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * The ticket row is inserted only after a Razorpay signature matches.
 * The amount is the payments row, never a number sent by the browser.
 */

function razorpayKeys(): array
{
    $keyId = getenv('RAZORPAY_KEY_ID') ?: '';
    $secret = getenv('RAZORPAY_KEY_SECRET') ?: '';
    return [$keyId, $secret];
}

function paymentSignature(string $orderId, string $paymentId, string $secret): string
{
    return hash_hmac('sha256', $orderId . '|' . $paymentId, $secret);
}

function createRazorpayOrder(string $keyId, string $secret, int $amountPaise, string $receipt): string
{
    $body = json_encode([
        'amount' => $amountPaise,
        'currency' => 'INR',
        'receipt' => $receipt,
    ]);
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Authorization: Basic " . base64_encode($keyId . ':' . $secret) . "\r\n"
                . "Content-Type: application/json\r\n",
            'content' => $body,
            'timeout' => 8,
            'ignore_errors' => true,
        ],
    ]);
    $raw = @file_get_contents('https://api.razorpay.com/v1/orders', false, $context);
    $parsed = is_string($raw) ? json_decode($raw, true) : null;
    $orderId = is_array($parsed) ? ($parsed['id'] ?? '') : '';
    if (!is_string($orderId) || !str_starts_with($orderId, 'order_')) {
        throw new RuntimeException('order');
    }
    return $orderId;
}

function fulfillPaidOrder(PDO $pdo, string $orderId, string $providerPaymentId, int $amountPaise, ?string $studentId): array
{
    $pdo->beginTransaction();
    try {
        $paymentStmt = $pdo->prepare(
            'SELECT id, student_id, event_id, ticket_id, amount, status
             FROM payments
             WHERE provider_order_id = :order_id
             FOR UPDATE'
        );
        $paymentStmt->execute(['order_id' => $orderId]);
        $payment = $paymentStmt->fetch();
        if (!is_array($payment)) {
            $pdo->rollBack();
            return ['http' => 404, 'body' => ['status' => 'error', 'message' => 'No payment matches that order.']];
        }
        if ($studentId !== null && $payment['student_id'] !== $studentId) {
            $pdo->rollBack();
            return ['http' => 403, 'body' => ['status' => 'error', 'message' => 'That payment belongs to another pass.']];
        }
        $expectedPaise = (int) round(((float) $payment['amount']) * 100);
        if ($expectedPaise !== $amountPaise) {
            $pdo->rollBack();
            return ['http' => 409, 'body' => ['status' => 'error', 'message' => 'The captured amount does not match the order.']];
        }
        if ($payment['status'] === 'paid' && $payment['ticket_id'] !== null) {
            $ticket = loadTicket($pdo, (string) $payment['ticket_id']);
            $pdo->commit();
            return ['http' => 200, 'body' => ['status' => 'success', 'data' => $ticket]];
        }

        $eventStmt = $pdo->prepare(
            'SELECT e.id, e.title, e.status, e.event_date, v.max_capacity,
                    (SELECT count(*)::int FROM tickets t WHERE t.event_id = e.id) AS sold
             FROM events e
             JOIN venues v ON v.id = e.venue_id
             WHERE e.id = :id
             FOR UPDATE OF e'
        );
        $eventStmt->execute(['id' => $payment['event_id']]);
        $event = $eventStmt->fetch();
        if (!is_array($event) || $event['status'] !== 'published' || strtotime((string) $event['event_date']) < time()) {
            markPaid($pdo, (string) $payment['id'], $providerPaymentId, null);
            $pdo->commit();
            return ['http' => 409, 'body' => ['status' => 'error', 'message' => 'Payment captured, but this event is no longer bookable. The desk must refund it.']];
        }
        if ((int) $event['sold'] >= (int) $event['max_capacity']) {
            markPaid($pdo, (string) $payment['id'], $providerPaymentId, null);
            $pdo->commit();
            return ['http' => 409, 'body' => ['status' => 'error', 'message' => 'Payment captured, but the event sold out. The desk must refund it.']];
        }

        $hash = bin2hex(random_bytes(16));
        $insert = $pdo->prepare(
            'INSERT INTO tickets (event_id, student_id, ticket_hash, booking_device)
             VALUES (:event_id, :student_id, :ticket_hash, :booking_device)
             RETURNING id, ticket_hash'
        );
        $insert->execute([
            'event_id' => $payment['event_id'],
            'student_id' => $payment['student_id'],
            'ticket_hash' => $hash,
            'booking_device' => 'web',
        ]);
        $created = $insert->fetch();
        markPaid($pdo, (string) $payment['id'], $providerPaymentId, (string) $created['id']);
        $pdo->commit();
        return ['http' => 201, 'body' => ['status' => 'success', 'data' => [
            'id' => $created['id'],
            'ticket_hash' => $created['ticket_hash'],
            'event_id' => $payment['event_id'],
            'event_title' => $event['title'],
            'event_date' => $event['event_date'],
            'student_id' => $payment['student_id'],
            'mail_status' => 'pending',
        ]]];
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        if ($e->getCode() === '23505') {
            return linkExistingTicket($pdo, $orderId, $providerPaymentId);
        }
        return ['http' => 500, 'body' => ['status' => 'error', 'message' => 'Could not issue the paid ticket.']];
    }
}

function linkExistingTicket(PDO $pdo, string $orderId, string $providerPaymentId): array
{
    $pdo->beginTransaction();
    $paymentStmt = $pdo->prepare(
        'SELECT id, student_id, event_id FROM payments WHERE provider_order_id = :order_id FOR UPDATE'
    );
    $paymentStmt->execute(['order_id' => $orderId]);
    $payment = $paymentStmt->fetch();
    if (!is_array($payment)) {
        $pdo->rollBack();
        return ['http' => 404, 'body' => ['status' => 'error', 'message' => 'No payment matches that order.']];
    }
    $ticketStmt = $pdo->prepare(
        'SELECT id FROM tickets WHERE event_id = :event_id AND student_id = :student_id'
    );
    $ticketStmt->execute([
        'event_id' => $payment['event_id'],
        'student_id' => $payment['student_id'],
    ]);
    $ticket = $ticketStmt->fetch();
    if (is_array($payment) && is_array($ticket)) {
        markPaid($pdo, (string) $payment['id'], $providerPaymentId, (string) $ticket['id']);
    }
    $pdo->commit();
    return ['http' => 409, 'body' => ['status' => 'error', 'message' => 'You already hold a ticket for this event. The desk must refund this extra charge.']];
}

function markPaid(PDO $pdo, string $paymentId, string $providerPaymentId, ?string $ticketId): void
{
    $stmt = $pdo->prepare(
        'UPDATE payments
         SET status = \'paid\',
             provider_payment_id = :provider_payment_id,
             ticket_id = :ticket_id,
             paid_at = current_timestamp
         WHERE id = :id'
    );
    $stmt->execute([
        'provider_payment_id' => $providerPaymentId,
        'ticket_id' => $ticketId,
        'id' => $paymentId,
    ]);
}

function loadTicket(PDO $pdo, string $ticketId): array
{
    $stmt = $pdo->prepare(
        'SELECT t.id, t.ticket_hash, t.event_id, e.title AS event_title, t.student_id
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         WHERE t.id = :id'
    );
    $stmt->execute(['id' => $ticketId]);
    $row = $stmt->fetch();
    return is_array($row) ? $row : [];
}
