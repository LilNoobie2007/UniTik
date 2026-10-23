<?php
declare(strict_types=1);

/*
 * File: backend/modules/ticketing/book.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Holder is the session user. tickets.student_id — there is no tickets.user_id.
 * Capacity is checked while the event row is locked.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/mail.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
$data = readJsonBody();
$eventId = strtolower(sanitizeText($data['event_id'] ?? ''));

if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $eventId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid event_id is required.']);
}

$ticketHash = bin2hex(random_bytes(16));

try {
    $pdo->beginTransaction();

    $eventStmt = $pdo->prepare(
        'SELECT e.id, e.title, e.status, e.event_date, e.ticket_price, v.max_capacity,
                (SELECT count(*)::int FROM tickets t WHERE t.event_id = e.id) AS sold
         FROM events e
         JOIN venues v ON v.id = e.venue_id
         WHERE e.id = :id
         FOR UPDATE OF e'
    );
    $eventStmt->execute(['id' => $eventId]);
    $event = $eventStmt->fetch();

    if (!is_array($event)) {
        $pdo->rollBack();
        jsonResponse(404, ['status' => 'error', 'message' => 'Event not found.']);
    }
    if ($event['status'] !== 'published') {
        $pdo->rollBack();
        jsonResponse(409, ['status' => 'error', 'message' => 'This event is no longer accepting bookings.']);
    }
    if ((float) $event['ticket_price'] > 0) {
        $pdo->rollBack();
        jsonResponse(402, ['status' => 'error', 'message' => 'This event requires payment before a ticket is issued.']);
    }
    if (strtotime((string) $event['event_date']) < time()) {
        $pdo->rollBack();
        jsonResponse(409, ['status' => 'error', 'message' => 'This event has already started.']);
    }
    if ((int) $event['sold'] >= (int) $event['max_capacity']) {
        $pdo->rollBack();
        jsonResponse(409, ['status' => 'error', 'message' => 'This event is sold out.']);
    }

    $insert = $pdo->prepare(
        'INSERT INTO tickets (event_id, student_id, ticket_hash, booking_device)
         VALUES (:event_id, :student_id, :ticket_hash, :booking_device)
         RETURNING id, ticket_hash'
    );
    $insert->execute([
        'event_id' => $eventId,
        'student_id' => $user['id'],
        'ticket_hash' => $ticketHash,
        'booking_device' => 'web',
    ]);
    $ticket = $insert->fetch();
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($e->getCode() === '23505') {
        jsonResponse(409, ['status' => 'error', 'message' => 'You already hold a ticket for this event.']);
    }
    jsonResponse(500, ['status' => 'error', 'message' => 'Booking failed.']);
}

$mail = ['mail_status' => 'skipped', 'mail_detail' => 'Mail transport is not configured.'];
try {
    $holder = $pdo->prepare('SELECT email, full_name FROM users WHERE id = :id');
    $holder->execute(['id' => $user['id']]);
    $person = $holder->fetch();
    if (is_array($person)) {
        $when = date('Y-m-d H:i T', strtotime((string) $event['event_date']) ?: time());
        $mail = sendTicketMail(
            (string) $person['email'],
            (string) $person['full_name'],
            (string) $event['title'],
            $when,
            (string) $ticket['ticket_hash']
        );
    }
} catch (Throwable $e) {
    $mail = ['mail_status' => 'failed', 'mail_detail' => 'The ticket is issued, but the email could not be sent.'];
}

jsonResponse(201, [
    'status' => 'success',
    'data' => [
        'id' => $ticket['id'],
        'ticket_hash' => $ticket['ticket_hash'],
        'event_id' => $eventId,
        'event_title' => $event['title'],
        'student_id' => $user['id'],
        'mail_status' => $mail['mail_status'],
        'mail_detail' => $mail['mail_detail'],
    ],
]);
