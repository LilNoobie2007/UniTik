<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/scans.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Saved gate results for one event. Unknown hashes are absent:
 * gate_scan_logs.ticket_id cannot be null.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can open a scan log.']);
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

    $scans = $pdo->prepare(
        'SELECT g.id, g.scanned_at, g.gate_identifier, g.scan_result,
                holder.full_name AS holder_name,
                scanner.full_name AS scanner_name,
                t.ticket_hash
         FROM gate_scan_logs g
         JOIN tickets t ON t.id = g.ticket_id
         JOIN users holder ON holder.id = t.student_id
         LEFT JOIN users scanner ON scanner.id = g.scanned_by
         WHERE t.event_id = :event_id
         ORDER BY g.scanned_at DESC'
    );
    $scans->execute(['event_id' => $eventId]);
    $rows = $scans->fetchAll();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load the scan log.']);
}

jsonResponse(200, [
    'status' => 'success',
    'data' => [
        'event_id' => $row['id'],
        'title' => $row['title'],
        'scans' => $rows,
    ],
]);
