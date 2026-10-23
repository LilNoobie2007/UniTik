<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/attendees.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Door list for one event. Organizers only see events they host.
 * tickets.student_id is the holder. scan_status is the entry flag.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can open a door list.']);
}

$eventId = strtolower(sanitizeText($_GET['event_id'] ?? ''));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $eventId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid event_id is required.']);
}

try {
    $event = $pdo->prepare('SELECT id, organizer_id, title FROM events WHERE id = :id');
    $event->execute(['id' => $eventId]);
    $row = $event->fetch();
    if (!is_array($row)) {
        jsonResponse(404, ['status' => 'error', 'message' => 'Event not found.']);
    }
    if ($user['role'] !== 'admin' && $row['organizer_id'] !== $user['id']) {
        jsonResponse(403, ['status' => 'error', 'message' => 'That event is hosted by someone else.']);
    }

    $people = $pdo->prepare(
        'SELECT u.full_name, u.email, u.roll_number,
                t.id AS ticket_id, t.ticket_hash, t.scan_status, t.issued_at
         FROM tickets t
         JOIN users u ON u.id = t.student_id
         WHERE t.event_id = :event_id
         ORDER BY u.full_name ASC'
    );
    $people->execute(['event_id' => $eventId]);
    $attendees = $people->fetchAll();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load the door list.']);
}

jsonResponse(200, [
    'status' => 'success',
    'data' => [
        'event_id' => $row['id'],
        'title' => $row['title'],
        'attendees' => $attendees,
    ],
]);
