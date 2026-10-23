<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/update.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Corrects a published event. organizer_id, venue, and status stay put.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can edit events.']);
}

$data = readJsonBody();
$eventId = strtolower(sanitizeText($data['event_id'] ?? ''));
$title = sanitizeText($data['title'] ?? '');
$description = sanitizeText($data['description'] ?? '');
$eventDate = sanitizeText($data['event_date'] ?? '');
$category = sanitizeText($data['category_tags'] ?? 'General');
$priceRaw = $data['ticket_price'] ?? 0;

if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $eventId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid event_id is required.']);
}
if (mb_strlen($title) < 3 || mb_strlen($title) > 200) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Give the event a title.']);
}
if ($category === '' || mb_strlen($category) > 100) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Category is too long.']);
}
if (!is_numeric($priceRaw) || (float) $priceRaw < 0) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Price cannot be negative.']);
}
$when = date_create($eventDate);
if ($when === false) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Invalid event date.']);
}

try {
    $find = $pdo->prepare('SELECT id, organizer_id, status FROM events WHERE id = :id');
    $find->execute(['id' => $eventId]);
    $event = $find->fetch();
    if (!is_array($event)) {
        jsonResponse(404, ['status' => 'error', 'message' => 'Event not found.']);
    }
    if ($user['role'] !== 'admin' && $event['organizer_id'] !== $user['id']) {
        jsonResponse(403, ['status' => 'error', 'message' => 'You can only edit events you host.']);
    }
    if ($event['status'] !== 'published') {
        jsonResponse(409, ['status' => 'error', 'message' => 'Only a published event can be edited.']);
    }

    $update = $pdo->prepare(
        'UPDATE events
         SET title = :title,
             description = :description,
             event_date = :event_date,
             ticket_price = :ticket_price,
             category_tags = :category_tags
         WHERE id = :id
         RETURNING id, title, status'
    );
    $update->execute([
        'title' => $title,
        'description' => $description,
        'event_date' => $when->format(DateTimeInterface::ATOM),
        'ticket_price' => number_format((float) $priceRaw, 2, '.', ''),
        'category_tags' => $category,
        'id' => $eventId,
    ]);
    $saved = $update->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not update the event.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $saved]);
