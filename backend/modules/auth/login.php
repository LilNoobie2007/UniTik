<?php
/* 
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 */

header('Content-Type: application/json');
require_once '../../core/security.php';
require_once '../../core/db.php';

$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$email    = trim($data['email'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password are required."]);
    exit;
}

$stmt = $pdo->prepare("SELECT id, full_name, email, password_hash, role FROM users WHERE email = :email");
$stmt->execute(['email' => $email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    http_response_code(401);
    echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
    exit;
}

// Strip the password hash before sending user data to the frontend
unset($user['password_hash']);

echo json_encode([
    "status"  => "success",
    "message" => "Login successful.",
    "user"    => $user
]);
?>