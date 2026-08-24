<?php
// 1. Force JSON output immediately
header('Content-Type: application/json');

// 2. Start output buffering to catch any "hidden" errors/warnings
ob_start();

// 3. Silence PHP notices/warnings so they don't break JSON
error_reporting(E_ALL);
ini_set('display_errors', '0');

try {
    // 4. Load dependencies
    require_once __DIR__ . '/../../../vendor/autoload.php';
    require_once __DIR__ . '/../../core/security.php';
    require_once __DIR__ . '/../../core/db.php';
    require_once __DIR__ . '/../../core/mailer.php';

    // 5. Parse payload
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) throw new Exception("Invalid JSON input");

    $user_id = sanitizeInput($data['user_id'] ?? '');
    $event_id = sanitizeInput($data['event_id'] ?? '');

    if (empty($user_id) || empty($event_id)) {
        throw new Exception("Missing required fields: user_id or event_id");
    }

    // 6. DB Operations
    $stmt = $pdo->prepare("INSERT INTO tickets (event_id, user_id, ticket_hash) VALUES (:eid, :uid, :hash) RETURNING id");
    $ticket_hash = bin2hex(random_bytes(16));
    
    $stmt->execute([':eid' => $event_id, ':uid' => $user_id, ':hash' => $ticket_hash]);
    $ticket = $stmt->fetch(PDO::FETCH_ASSOC);

    // 7. Get User/Event Info
    $user = $pdo->prepare("SELECT email, full_name FROM users WHERE id = ?");
    $user->execute([$user_id]);
    $userData = $user->fetch(PDO::FETCH_ASSOC);

    $event = $pdo->prepare("SELECT title FROM events WHERE id = ?");
    $event->execute([$event_id]);
    $eventData = $event->fetch(PDO::FETCH_ASSOC);

    // 8. Generate QR
    $qrResult = \Endroid\QrCode\Builder\Builder::create()
        ->writer(new \Endroid\QrCode\Writer\PngWriter())
        ->data($ticket_hash)
        ->size(400)
        ->build();

    // 9. Send Email (Assuming sendTicketEmail returns boolean)
    $emailSuccess = sendTicketEmail($userData['email'], $userData['full_name'], $eventData['title'], $ticket_hash, $qrResult->getString());

    // --- SUCCESS: CLEAN THE BUFFER AND SEND JSON ---
    ob_end_clean(); 
    echo json_encode([
        "status" => "success",
        "ticket_hash" => $ticket_hash,
        "email_sent" => $emailSuccess
    ]);

} catch (Exception $e) {
    // --- ERROR: CLEAN THE BUFFER AND SEND JSON ERROR ---
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => $e->getMessage()
    ]);
}
?>