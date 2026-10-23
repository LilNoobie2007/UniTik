<?php
declare(strict_types=1);

/*
 * File: backend/modules/auth/password.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Replaces password_hash for the session user.
 * The current secret is checked first. There is no email reset.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
$data = readJsonBody();
$current = is_string($data['current_password'] ?? null) ? $data['current_password'] : '';
$next = is_string($data['new_password'] ?? null) ? $data['new_password'] : '';

if ($current === '' || $next === '') {
    jsonResponse(400, ['status' => 'error', 'message' => 'Current and new passwords are required.']);
}
if (strlen($next) < 8) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Password must be at least 8 characters.']);
}
if (hash_equals($current, $next)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Choose a different password.']);
}

try {
    $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
    $stmt->execute(['id' => $user['id']]);
    $row = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not change the password.']);
}

if (!is_array($row) || !password_verify($current, (string) $row['password_hash'])) {
    jsonResponse(401, ['status' => 'error', 'message' => 'Current password is wrong.']);
}

$hash = password_hash($next, PASSWORD_DEFAULT);
if ($hash === false) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not store the password.']);
}

try {
    $update = $pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id');
    $update->execute([
        'password_hash' => $hash,
        'id' => $user['id'],
    ]);
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not change the password.']);
}

session_regenerate_id(true);

jsonResponse(200, ['status' => 'success', 'data' => ['changed' => true]]);
