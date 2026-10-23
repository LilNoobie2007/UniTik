<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/list.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Public catalog. Organizer name comes from users, not an organizers table.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

try {
    $stmt = $pdo->query(
        "SELECT e.id, e.title, e.description, e.event_date, e.ticket_price,
                e.category_tags, e.status, e.page_views,
                v.venue_name, v.location_details, v.max_capacity,
                u.full_name AS organizer_name, u.committee_name,
                (SELECT count(*)::int FROM tickets t WHERE t.event_id = e.id) AS tickets_sold
         FROM events e
         JOIN venues v ON v.id = e.venue_id
         JOIN users u ON u.id = e.organizer_id
         WHERE e.status = 'published'
         ORDER BY e.event_date ASC"
    );
    $events = $stmt->fetchAll();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load events.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $events]);
