<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/show.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * One published event. page_views increments here, not on the catalog.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$eventId = strtolower(sanitizeText($_GET['event_id'] ?? ''));
if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $eventId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid event_id is required.']);
}

try {
    $bump = $pdo->prepare(
        "UPDATE events
         SET page_views = page_views + 1
         WHERE id = :id AND status = 'published'
         RETURNING id"
    );
    $bump->execute(['id' => $eventId]);
    if (!is_array($bump->fetch())) {
        jsonResponse(404, ['status' => 'error', 'message' => 'Event not found.']);
    }

    $stmt = $pdo->prepare(
        "SELECT e.id, e.title, e.description, e.event_date, e.ticket_price,
                e.category_tags, e.status, e.page_views,
                v.venue_name, v.location_details, v.max_capacity,
                u.full_name AS organizer_name, u.committee_name,
                (SELECT count(*)::int FROM tickets t WHERE t.event_id = e.id) AS tickets_sold
         FROM events e
         JOIN venues v ON v.id = e.venue_id
         JOIN users u ON u.id = e.organizer_id
         WHERE e.id = :id"
    );
    $stmt->execute(['id' => $eventId]);
    $event = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not open the event.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $event]);
