<?php
declare(strict_types=1);

/*
 * File: backend/modules/events/venues.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Venue list is readable by a signed-in host. Creating one requires organizer or admin.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

$method = $_SERVER['REQUEST_METHOD'] ?? '';
$user = requireActiveUser($pdo);

if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can manage venues.']);
}

if ($method === 'GET') {
    try {
        $stmt = $pdo->query(
            'SELECT id, venue_name, location_details, max_capacity
             FROM venues
             ORDER BY venue_name ASC'
        );
        jsonResponse(200, ['status' => 'success', 'data' => $stmt->fetchAll()]);
    } catch (PDOException $e) {
        jsonResponse(500, ['status' => 'error', 'message' => 'Could not load venues.']);
    }
}

if ($method !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = readJsonBody();
$name = sanitizeText($data['venue_name'] ?? '');
$location = sanitizeText($data['location_details'] ?? '');
$capacity = (int) ($data['max_capacity'] ?? 0);

if ($name === '' || mb_strlen($name) > 100 || $location === '') {
    jsonResponse(400, ['status' => 'error', 'message' => 'Venue name and location are required.']);
}
if ($capacity < 1) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Capacity must be at least 1.']);
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO venues (venue_name, location_details, max_capacity)
         VALUES (:venue_name, :location_details, :max_capacity)
         RETURNING id, venue_name, location_details, max_capacity'
    );
    $stmt->execute([
        'venue_name' => $name,
        'location_details' => $location,
        'max_capacity' => $capacity,
    ]);
    $venue = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not add the venue.']);
}

jsonResponse(201, ['status' => 'success', 'data' => $venue]);
