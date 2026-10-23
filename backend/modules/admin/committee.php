<?php
declare(strict_types=1);

/*
 * File: backend/modules/admin/committee.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * An admin writes users.committee_name. This does not change role.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

requireAdmin($pdo);
$data = readJsonBody();
$userId = strtolower(sanitizeText($data['user_id'] ?? ''));
$name = sanitizeText($data['committee_name'] ?? '');

if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $userId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid user_id is required.']);
}
if (mb_strlen($name) > 100) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Committee name must be 100 characters or fewer.']);
}

try {
    $stmt = $pdo->prepare(
        'UPDATE users
         SET committee_name = :committee_name
         WHERE id = :id
         RETURNING id, committee_name'
    );
    $stmt->execute([
        'committee_name' => $name === '' ? null : $name,
        'id' => $userId,
    ]);
    $saved = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not save the committee name.']);
}

if (!is_array($saved)) {
    jsonResponse(404, ['status' => 'error', 'message' => 'No account for that user.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $saved]);
