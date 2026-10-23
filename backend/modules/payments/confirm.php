<?php
declare(strict_types=1);

/*
 * File: backend/modules/payments/confirm.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Checkout return. The HMAC must match before a ticket is inserted.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/payment.php';
require_once __DIR__ . '/../../core/mail.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

[$keyId, $secret] = razorpayKeys();
if ($keyId === '' || $secret === '') {
    jsonResponse(503, ['status' => 'error', 'message' => 'Payment provider is not configured.']);
}

$user = requireActiveUser($pdo);
$data = readJsonBody();
$orderId = is_string($data['razorpay_order_id'] ?? null) ? $data['razorpay_order_id'] : '';
$paymentId = is_string($data['razorpay_payment_id'] ?? null) ? $data['razorpay_payment_id'] : '';
$signature = is_string($data['razorpay_signature'] ?? null) ? $data['razorpay_signature'] : '';

if (!preg_match('/^order_[A-Za-z0-9]+$/', $orderId) || !preg_match('/^pay_[A-Za-z0-9]+$/', $paymentId) || !preg_match('/^[a-f0-9]{64}$/', $signature)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Payment confirmation is incomplete.']);
}

$expected = paymentSignature($orderId, $paymentId, $secret);
if (!hash_equals($expected, $signature)) {
    jsonResponse(401, ['status' => 'error', 'message' => 'Payment signature does not match.']);
}

$lookup = $pdo->prepare('SELECT amount FROM payments WHERE provider_order_id = :order_id');
$lookup->execute(['order_id' => $orderId]);
$row = $lookup->fetch();
if (!is_array($row)) {
    jsonResponse(404, ['status' => 'error', 'message' => 'No payment matches that order.']);
}

$result = fulfillPaidOrder($pdo, $orderId, $paymentId, (int) round(((float) $row['amount']) * 100), $user['id']);
if (($result['body']['status'] ?? '') === 'success' && $result['http'] === 201) {
    $result['body']['data'] = attachTicketMail($pdo, $result['body']['data']);
}
jsonResponse($result['http'], $result['body']);

function attachTicketMail(PDO $pdo, array $ticket): array
{
    $ticket['mail_status'] = 'skipped';
    $ticket['mail_detail'] = 'Mail transport is not configured.';
    if (($ticket['ticket_hash'] ?? '') === '' || ($ticket['student_id'] ?? '') === '') {
        return $ticket;
    }
    try {
        $holder = $pdo->prepare('SELECT email, full_name FROM users WHERE id = :id');
        $holder->execute(['id' => $ticket['student_id']]);
        $person = $holder->fetch();
        if (is_array($person)) {
            $when = date('Y-m-d H:i T', strtotime((string) ($ticket['event_date'] ?? '')) ?: time());
            $mail = sendTicketMail(
                (string) $person['email'],
                (string) $person['full_name'],
                (string) ($ticket['event_title'] ?? 'Campus event'),
                $when,
                (string) $ticket['ticket_hash']
            );
            $ticket['mail_status'] = $mail['mail_status'];
            $ticket['mail_detail'] = $mail['mail_detail'];
        }
    } catch (Throwable $e) {
        $ticket['mail_status'] = 'failed';
        $ticket['mail_detail'] = 'The ticket is issued, but the email could not be sent.';
    }
    return $ticket;
}
