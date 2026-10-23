<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/gate.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Events this session may scan. Admins see the catalog.
 * Organizers see only rows they host.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, [
        'status' => 'error',
        'message' => 'Only hosts and campus admins can scan at the gate.',
    ]);
}

try {
    if ($user['role'] === 'admin') {
        $stmt = $pdo->query(
            "SELECT id, title, event_date
             FROM events
             WHERE status = 'published'
             ORDER BY event_date ASC"
        );
        $events = $stmt->fetchAll();
    } else {
        $stmt = $pdo->prepare(
            "SELECT id, title, event_date
             FROM events
             WHERE status = 'published' AND organizer_id = :organizer_id
             ORDER BY event_date ASC"
        );
        $stmt->execute(['organizer_id' => $user['id']]);
        $events = $stmt->fetchAll();
    }
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load the gate list.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $events]);
