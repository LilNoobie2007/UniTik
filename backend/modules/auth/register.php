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

$full_name = trim($data['full_name'] ?? '');
$email     = trim($data['email'] ?? '');
$password  = trim($data['password'] ?? '');
$role      = trim($data['role'] ?? 'student'); // Matches the CHECK constraint in Supabase

if (empty($full_name) || empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "All fields are required."]);
    exit;
}

// Check if user exists
$checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
$checkStmt->execute(['email' => $email]);

if ($checkStmt->fetch()) {
    http_response_code(409);
    echo json_encode(["status" => "error", "message" => "Email already registered."]);
    exit;
}

// Secure hash
$password_hash = password_hash($password, PASSWORD_BCRYPT);

try {
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role) VALUES (:full_name, :email, :password_hash, :role) RETURNING id");
    $stmt->execute([
        'full_name'     => $full_name,
        'email'         => $email,
        'password_hash' => $password_hash,
        'role'          => $role
    ]);
    
    $user = $stmt->fetch();

    http_response_code(201);
    echo json_encode([
        "status"  => "success",
        "message" => "User registered successfully.",
        "user_id" => $user['id']
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => "Registration failed."]);
}
?>