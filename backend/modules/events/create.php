<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/create.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * organizer_id is the session user. Status is published, never a client string.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can publish events.']);
}

$data = readJsonBody();
$title = sanitizeText($data['title'] ?? '');
$description = sanitizeText($data['description'] ?? '');
$eventDate = sanitizeText($data['event_date'] ?? '');
$category = sanitizeText($data['category_tags'] ?? 'General');
$venueId = strtolower(sanitizeText($data['venue_id'] ?? ''));
$priceRaw = $data['ticket_price'] ?? 0;

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
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $venueId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Choose a venue.']);
}

try {
    $venue = $pdo->prepare('SELECT id FROM venues WHERE id = :id');
    $venue->execute(['id' => $venueId]);
    if (!is_array($venue->fetch())) {
        jsonResponse(404, ['status' => 'error', 'message' => 'Venue not found.']);
    }

    $stmt = $pdo->prepare(
        'INSERT INTO events (
            organizer_id, venue_id, title, description, event_date,
            ticket_price, category_tags, status
         ) VALUES (
            :organizer_id, :venue_id, :title, :description, :event_date,
            :ticket_price, :category_tags, :status
         )
         RETURNING id, title, status, organizer_id'
    );
    $stmt->execute([
        'organizer_id' => $user['id'],
        'venue_id' => $venueId,
        'title' => $title,
        'description' => $description,
        'event_date' => $when->format(DateTimeInterface::ATOM),
        'ticket_price' => number_format((float) $priceRaw, 2, '.', ''),
        'category_tags' => $category,
        'status' => 'published',
    ]);
    $event = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not publish the event.']);
}

jsonResponse(201, ['status' => 'success', 'data' => $event]);
