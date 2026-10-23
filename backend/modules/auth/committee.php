<?php
declare(strict_types=1);

/*
 * File: backend/modules/auth/committee.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * The signed-in host sets users.committee_name on their own row.
 * Role is never read from the body.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, ['status' => 'error', 'message' => 'Only hosts can name a committee.']);
}

$data = readJsonBody();
$name = sanitizeText($data['committee_name'] ?? '');
if (mb_strlen($name) > 100) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Committee name must be 100 characters or fewer.']);
}

$stored = $name === '' ? null : $name;

try {
    $stmt = $pdo->prepare(
        'UPDATE users
         SET committee_name = :committee_name
         WHERE id = :id
         RETURNING id, committee_name'
    );
    $stmt->execute([
        'committee_name' => $stored,
        'id' => $user['id'],
    ]);
    $saved = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not save the committee name.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $saved]);
