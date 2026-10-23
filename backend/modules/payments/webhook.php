<?php
declare(strict_types=1);

/*
 * File: backend/modules/payments/webhook.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Razorpay server callback. There is no session. The raw body is signed.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/payment.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$secret = getenv('RAZORPAY_WEBHOOK_SECRET') ?: '';
if ($secret === '') {
    jsonResponse(503, ['status' => 'error', 'message' => 'Payment webhook is not configured.']);
}

$raw = file_get_contents('php://input');
if (!is_string($raw) || $raw === '') {
    jsonResponse(400, ['status' => 'error', 'message' => 'Empty webhook body.']);
}
$given = $_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '';
$expected = hash_hmac('sha256', $raw, $secret);
if (!is_string($given) || !hash_equals($expected, $given)) {
    jsonResponse(401, ['status' => 'error', 'message' => 'Webhook signature does not match.']);
}

$payload = json_decode($raw, true);
$eventName = is_array($payload) ? ($payload['event'] ?? '') : '';
if ($eventName !== 'payment.captured') {
    jsonResponse(200, ['status' => 'success', 'data' => ['ignored' => true]]);
}

$entity = $payload['payload']['payment']['entity'] ?? null;
$orderId = is_array($entity) && is_string($entity['order_id'] ?? null) ? $entity['order_id'] : '';
$paymentId = is_array($entity) && is_string($entity['id'] ?? null) ? $entity['id'] : '';
$amount = is_array($entity) ? (int) ($entity['amount'] ?? 0) : 0;
if (!str_starts_with($orderId, 'order_') || !str_starts_with($paymentId, 'pay_') || $amount < 100) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Webhook payment is incomplete.']);
}

$result = fulfillPaidOrder($pdo, $orderId, $paymentId, $amount, null);
jsonResponse($result['http'], $result['body']);
