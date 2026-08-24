<?php
/* 
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Endpoint: /ticketing/validate.php
 * - Purpose: Securely validate a ticket hash at the gate and prevent double-entry.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

// 1. Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die(json_encode(["status" => "error", "message" => "Method Not Allowed"]));
}

// 2. Parse and sanitize input
$data = json_decode(file_get_contents('php://input'), true);
$ticket_hash = sanitizeInput($data['ticket_hash'] ?? '');
$event_id = sanitizeInput($data['event_id'] ?? '');

if (empty($ticket_hash) || empty($event_id)) {
    http_response_code(400);
    die(json_encode(["status" => "error", "message" => "ticket_hash and event_id are required."]));
}

try {
    // 3. Find the ticket in the database
    $stmt = $pdo->prepare("
        SELECT id, status, user_id 
        FROM tickets 
        WHERE ticket_hash = :ticket_hash 
        AND event_id = :event_id
    ");
    
    $stmt->execute([
        ':ticket_hash' => $ticket_hash,
        ':event_id' => $event_id
    ]);
    
    $ticket = $stmt->fetch();

    // 4. SECURITY CHECK: Does the ticket exist for this event?
    if (!$ticket) {
        http_response_code(404);
        die(json_encode([
            "status" => "error", 
            "message" => "INVALID TICKET: Not found for this event. Do not allow entry."
        ]));
    }

    // 5. SECURITY CHECK: Has the ticket already been used?
    if ($ticket['status'] === 'scanned') {
        http_response_code(409); // 409 Conflict
        die(json_encode([
            "status" => "error", 
            "message" => "TICKET ALREADY USED! This person has already entered."
        ]));
    }

    // 6. SUCCESS: Mark the ticket as scanned
    $updateStmt = $pdo->prepare("UPDATE tickets SET status = 'scanned' WHERE id = :id");
    $updateStmt->execute([':id' => $ticket['id']]);

    // 7. Send Green Light to the guard's scanner app
    http_response_code(200);
    echo json_encode([
        "status" => "success",
        "message" => "VALID TICKET: Entry Approved.",
        "user_id" => $ticket['user_id']
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]));
}
?>