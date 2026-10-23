<?php
declare(strict_types=1);

/*
 * File: backend/modules/ticketing/mine.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Wallet for the session user. tickets.student_id is the holder.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);

try {
    $stmt = $pdo->prepare(
        'SELECT t.id, t.ticket_hash, t.scan_status, t.issued_at,
                e.id AS event_id, e.title, e.event_date, e.ticket_price,
                e.category_tags, e.status,
                v.venue_name, v.location_details
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         JOIN venues v ON v.id = e.venue_id
         WHERE t.student_id = :student_id
         ORDER BY e.event_date ASC'
    );
    $stmt->execute(['student_id' => $user['id']]);
    $tickets = $stmt->fetchAll();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load tickets.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $tickets]);
