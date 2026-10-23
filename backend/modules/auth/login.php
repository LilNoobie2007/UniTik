<?php
declare(strict_types=1);

/*
 * File: backend/modules/auth/login.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * One users table. Role is whatever the row stores.
 * Organizers are not rewritten to admin.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = readJsonBody();
$email = strtolower(sanitizeText($data['email'] ?? ''));
$password = is_string($data['password'] ?? null) ? $data['password'] : '';

if ($email === '' || $password === '') {
    jsonResponse(400, ['status' => 'error', 'message' => 'Email and password are required.']);
}

try {
    $stmt = $pdo->prepare(
        'SELECT id, full_name, email, password_hash, role, roll_number,
                committee_name, account_status, is_verified
         FROM users
         WHERE email = :email'
    );
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Login failed.']);
}

$valid = is_array($user) && password_verify($password, (string) $user['password_hash']);
if (!$valid) {
    jsonResponse(401, ['status' => 'error', 'message' => 'Invalid email or password.']);
}

if ($user['account_status'] !== 'active') {
    jsonResponse(403, ['status' => 'error', 'message' => 'This campus pass is suspended.']);
}

try {
    $touch = $pdo->prepare('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = :id');
    $touch->execute(['id' => $user['id']]);
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Login failed.']);
}

startAuthSession();
session_regenerate_id(true);
$_SESSION['user_id'] = $user['id'];

jsonResponse(200, [
    'status' => 'success',
    'data' => [
        'id' => $user['id'],
        'full_name' => $user['full_name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'roll_number' => $user['roll_number'],
        'committee_name' => $user['committee_name'],
        'account_status' => $user['account_status'],
        'is_verified' => (bool) $user['is_verified'],
    ],
]);
