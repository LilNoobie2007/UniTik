<?php
declare(strict_types=1);

header('Content-Type: application/json');
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', '0');

require_once __DIR__ . '/../../core/cors.php';
require_once __DIR__ . '/../../core/db.php';
require_once __DIR__ . '/../../core/security.php';

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || empty($data['email']) || empty($data['password'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Email and password are required."]);
    exit();
}

$email = sanitizeInput($data['email']);
$password = $data['password'];

try {
    // 1. Check if user is an organizer (Admin)
    $stmt = $pdo->prepare("SELECT id, full_name, email, password_hash, 'admin' as role FROM organizers WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // 2. If not found in organizers, check students table
    if (!$user) {
        $stmt = $pdo->prepare("SELECT id, full_name, email, password_hash, 'student' as role FROM students WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$user || !password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid email or password."]);
        exit();
    }

    // Remove password hash before sending back user profile
    unset($user['password_hash']);

    ob_end_clean();
    echo json_encode([
        "status" => "success",
        "message" => "Login successful",
        "user" => $user
    ]);

} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}