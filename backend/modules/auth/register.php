<?php
declare(strict_types=1);

/**
 * Endpoint: /auth/register.php
 * Purpose: Register a new user with a bcrypt password hash.
 */

header('Content-Type: application/json');
require_once '../../core/security.php';
require_once '../../core/db.php';

/**
 * Returns whether an email is already registered.
 *
 * @param PDO    $pdo   Active PDO connection.
 * @param string $email Candidate email.
 *
 * @return bool True if the email exists.
 *
 * @throws PDOException When the query fails.
 */
function emailAlreadyRegistered(PDO $pdo, string $email): bool
{
    $checkStmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $checkStmt->execute(['email' => $email]);

    return (bool) $checkStmt->fetch();
}

/**
 * Inserts a new user and returns the created row (including id).
 *
 * @param PDO    $pdo          Active PDO connection.
 * @param string $fullName     Full name.
 * @param string $email        Email address.
 * @param string $passwordHash Bcrypt hash.
 * @param string $role         Role matching the Supabase CHECK constraint.
 *
 * @return array<string, mixed>|false Inserted user row.
 *
 * @throws PDOException When the insert fails.
 */
function registerUser(
    PDO $pdo,
    string $fullName,
    string $email,
    string $passwordHash,
    string $role
): array|false {
    $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, role) VALUES (:full_name, :email, :password_hash, :role) RETURNING id");
    $stmt->execute([
        'full_name'     => $fullName,
        'email'         => $email,
        'password_hash' => $passwordHash,
        'role'          => $role
    ]);

    return $stmt->fetch();
}

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

try {
    // Check if user exists
    if (emailAlreadyRegistered($pdo, $email)) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "Email already registered."]);
        exit;
    }

    // Secure hash
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    $user = registerUser($pdo, $full_name, $email, $password_hash, $role);

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
