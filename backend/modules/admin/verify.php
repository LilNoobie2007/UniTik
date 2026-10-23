<?php
declare(strict_types=1);

/*
 * File: backend/modules/admin/verify.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Sets users.is_verified. Signup cannot do this. Only an admin can.
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
$flag = $data['is_verified'] ?? null;

if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $userId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid user_id is required.']);
}
if ($flag === true || $flag === 1 || $flag === 'true') {
    $verified = true;
} elseif ($flag === false || $flag === 0 || $flag === 'false') {
    $verified = false;
} else {
    jsonResponse(400, ['status' => 'error', 'message' => 'is_verified must be true or false.']);
}

try {
    $stmt = $pdo->prepare(
        'UPDATE users
         SET is_verified = :is_verified
         WHERE id = :id
         RETURNING id, is_verified'
    );
    $stmt->execute([
        'is_verified' => $verified ? 'true' : 'false',
        'id' => $userId,
    ]);
    $saved = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not update verification.']);
}

if (!is_array($saved)) {
    jsonResponse(404, ['status' => 'error', 'message' => 'No account for that user.']);
}
$saved['is_verified'] = $saved['is_verified'] === true || $saved['is_verified'] === 't' || $saved['is_verified'] === '1';

jsonResponse(200, ['status' => 'success', 'data' => $saved]);
