<?php
declare(strict_types=1);

/*
 * File: backend/modules/auth/signup.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Creates a student only. Role is not read from the client.
 * users columns: full_name, email, password_hash, role, roll_number.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$data = readJsonBody();
$fullName = sanitizeText($data['full_name'] ?? '');
$email = strtolower(sanitizeText($data['email'] ?? ''));
$password = is_string($data['password'] ?? null) ? $data['password'] : '';
$rollNumber = sanitizeText($data['roll_number'] ?? '');
$rollNumber = $rollNumber === '' ? null : $rollNumber;

if ($fullName === '' || mb_strlen($fullName) < 2 || mb_strlen($fullName) > 100) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Full name is required.']);
}
if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid email is required.']);
}
if (strlen($password) < 8) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Password must be at least 8 characters.']);
}
if ($rollNumber !== null && mb_strlen($rollNumber) < 2) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Roll number looks too short.']);
}

$passwordHash = password_hash($password, PASSWORD_DEFAULT);
if ($passwordHash === false) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not store the password.']);
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO users (full_name, email, password_hash, role, roll_number)
         VALUES (:full_name, :email, :password_hash, :role, :roll_number)
         RETURNING id, full_name, email, role, roll_number, account_status'
    );
    $stmt->execute([
        'full_name' => $fullName,
        'email' => $email,
        'password_hash' => $passwordHash,
        'role' => 'student',
        'roll_number' => $rollNumber,
    ]);
    $user = $stmt->fetch();
} catch (PDOException $e) {
    $sqlState = $e->getCode();
    if ($sqlState === '23505') {
        $detail = $e->getMessage();
        $message = str_contains($detail, 'roll_number')
            ? 'That roll number is already registered.'
            : 'An account with this email already exists.';
        jsonResponse(409, ['status' => 'error', 'message' => $message]);
    }
    jsonResponse(500, ['status' => 'error', 'message' => 'Registration failed.']);
}

jsonResponse(201, [
    'status' => 'success',
    'data' => [
        'id' => $user['id'],
        'full_name' => $user['full_name'],
        'email' => $user['email'],
        'role' => $user['role'],
        'roll_number' => $user['roll_number'],
        'account_status' => $user['account_status'],
        'message' => 'Registration successful. You can now log in.',
    ],
]);
