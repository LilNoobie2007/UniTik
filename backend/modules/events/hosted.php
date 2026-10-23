<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/hosted.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Organizers see their rows. Admins see the board. No client owner filter.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can open the desk.']);
}

$sql = 'SELECT e.id, e.title, e.description, e.event_date, e.ticket_price, e.status, e.category_tags,
               v.venue_name, v.max_capacity,
               (SELECT count(*)::int FROM tickets t WHERE t.event_id = e.id) AS tickets_sold
        FROM events e
        JOIN venues v ON v.id = e.venue_id';

try {
    if ($user['role'] === 'admin') {
        $stmt = $pdo->query($sql . ' ORDER BY e.event_date DESC');
        $rows = $stmt->fetchAll();
    } else {
        $stmt = $pdo->prepare($sql . ' WHERE e.organizer_id = :organizer_id ORDER BY e.event_date DESC');
        $stmt->execute(['organizer_id' => $user['id']]);
        $rows = $stmt->fetchAll();
    }
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load hosted events.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $rows]);
