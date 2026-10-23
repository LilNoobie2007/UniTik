<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/cancel.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Sets events.status to cancelled. Organizers can cancel only their own events.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can cancel events.']);
}

$data = readJsonBody();
$eventId = strtolower(sanitizeText($data['event_id'] ?? ''));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $eventId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid event_id is required.']);
}

try {
    $find = $pdo->prepare('SELECT id, organizer_id, status FROM events WHERE id = :id');
    $find->execute(['id' => $eventId]);
    $event = $find->fetch();
    if (!is_array($event)) {
        jsonResponse(404, ['status' => 'error', 'message' => 'Event not found.']);
    }
    if ($user['role'] !== 'admin' && $event['organizer_id'] !== $user['id']) {
        jsonResponse(403, ['status' => 'error', 'message' => 'You can only cancel events you host.']);
    }

    $update = $pdo->prepare("UPDATE events SET status = 'cancelled' WHERE id = :id");
    $update->execute(['id' => $eventId]);
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not cancel the event.']);
}

jsonResponse(200, ['status' => 'success', 'data' => ['event_id' => $eventId, 'status' => 'cancelled']]);
