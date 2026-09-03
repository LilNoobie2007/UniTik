<?php
declare(strict_types=1);

/**
 * Endpoint: /auth/login.php
 * Purpose: Authenticate a user by email and password hash.
 */

header('Content-Type: application/json');
require_once '../../core/security.php';
require_once '../../core/db.php';

/**
 * Loads a user row for login by email.
 *
 * @param PDO    $pdo   Active PDO connection.
 * @param string $email User email.
 *
 * @return array<string, mixed>|false User row or false if not found.
 *
 * @throws PDOException When the query fails.
 */
function findUserByEmail(PDO $pdo, string $email): array|false
{
    $stmt = $pdo->prepare("SELECT id, full_name, email, password_hash, role FROM users WHERE email = :email");
    $stmt->execute(['email' => $email]);

    return $stmt->fetch();
}

$data = json_decode(file_get_contents('php://input'), true) ?? $_POST;

$email    = trim($data['email'] ?? '');
$password = trim($data['password'] ?? '');

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password are required."]);
    exit;
}

try {
    $user = findUserByEmail($pdo, $email);

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
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
