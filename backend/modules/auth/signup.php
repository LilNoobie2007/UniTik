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

if (!$data || empty($data['email']) || empty($data['password']) || empty($data['full_name'])) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Full name, email, and password are required."]);
    exit();
}

$full_name = sanitizeInput($data['full_name']);
$email = sanitizeInput($data['email']);
$password = $data['password'];
$roll_number = sanitizeInput($data['roll_number'] ?? '');

try {
    // Check if email already exists in students
    $check = $pdo->prepare("SELECT id FROM students WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        http_response_code(409);
        echo json_encode(["status" => "error", "message" => "An account with this email already exists."]);
        exit();
    }

    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // Insert new student record using database-generated UUID
    $stmt = $pdo->prepare("
        INSERT INTO students (id, full_name, email, password_hash, roll_number, is_verified, account_status) 
        VALUES (gen_random_uuid(), ?, ?, ?, ?, true, 'active')
    ");
    
    $stmt->execute([$full_name, $email, $password_hash, $roll_number]);

    ob_end_clean();
    echo json_encode([
        "status" => "success",
        "message" => "Registration successful. You can now log in."
    ]);

} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}