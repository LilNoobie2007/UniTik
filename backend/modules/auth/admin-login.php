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
    $stmt = $pdo->prepare("SELECT id, full_name, email, password_hash, committee_name, 'admin' as role FROM organizers WHERE email = ?");
    $stmt->execute([$email]);
    $admin = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$admin || !password_verify($password, $admin['password_hash'])) {
        http_response_code(401);
        echo json_encode(["status" => "error", "message" => "Invalid administrator credentials."]);
        exit();
    }

    unset($admin['password_hash']);

    ob_end_clean();
    echo json_encode([
        "status" => "success",
        "message" => "Administrator authentication successful.",
        "user" => $admin
    ]);

} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}