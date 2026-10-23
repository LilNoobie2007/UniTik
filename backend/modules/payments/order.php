<?php
declare(strict_types=1);

/*
 * File: backend/modules/payments/order.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Opens a Razorpay order for a paid event. No ticket is inserted here.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/payment.php';

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
$eventId = strtolower(sanitizeText($data['event_id'] ?? ''));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $eventId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid event_id is required.']);
}

try {
    $eventStmt = $pdo->prepare(
        'SELECT id, title, status, event_date, ticket_price
         FROM events
         WHERE id = :id'
    );
    $eventStmt->execute(['id' => $eventId]);
    $event = $eventStmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not open a payment.']);
}

if (!is_array($event)) {
    jsonResponse(404, ['status' => 'error', 'message' => 'Event not found.']);
}
if ($event['status'] !== 'published' || strtotime((string) $event['event_date']) < time()) {
    jsonResponse(409, ['status' => 'error', 'message' => 'This event is no longer accepting bookings.']);
}
$amount = (float) $event['ticket_price'];
if ($amount <= 0) {
    jsonResponse(400, ['status' => 'error', 'message' => 'This event is free. Book it without payment.']);
}

try {
    $verifiedStmt = $pdo->prepare('SELECT is_verified FROM users WHERE id = :id');
    $verifiedStmt->execute(['id' => $user['id']]);
    $verifiedRow = $verifiedStmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not open a payment.']);
}
$verified = is_array($verifiedRow) && ($verifiedRow['is_verified'] === true || $verifiedRow['is_verified'] === 't' || $verifiedRow['is_verified'] === '1');
if (!$verified) {
    jsonResponse(403, ['status' => 'error', 'message' => 'A campus admin must verify this pass before a paid booking.']);
}

$paise = (int) round($amount * 100);
if ($paise < 100) {
    jsonResponse(400, ['status' => 'error', 'message' => 'The price is below the payment minimum of ₹1.']);
}

try {
    $idStmt = $pdo->query('SELECT gen_random_uuid()::text AS id');
    $paymentId = (string) $idStmt->fetch()['id'];
    $orderId = createRazorpayOrder($keyId, $secret, $paise, str_replace('-', '', $paymentId));
    $insert = $pdo->prepare(
        'INSERT INTO payments (id, student_id, event_id, amount, provider_order_id)
         VALUES (:id, :student_id, :event_id, :amount, :provider_order_id)'
    );
    $insert->execute([
        'id' => $paymentId,
        'student_id' => $user['id'],
        'event_id' => $eventId,
        'amount' => number_format($amount, 2, '.', ''),
        'provider_order_id' => $orderId,
    ]);
} catch (Throwable $e) {
    jsonResponse(502, ['status' => 'error', 'message' => 'The payment provider did not open an order.']);
}

jsonResponse(201, [
    'status' => 'success',
    'data' => [
        'payment_id' => $paymentId,
        'provider_order_id' => $orderId,
        'amount_paise' => $paise,
        'currency' => 'INR',
        'key_id' => $keyId,
        'event_title' => $event['title'],
    ],
]);
