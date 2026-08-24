<?php
// backend/modules/events/create.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$title       = trim($input['title'] ?? '');
$description = trim($input['description'] ?? '');
$event_date  = trim($input['event_date'] ?? '');
$ticket_price= floatval($input['ticket_price'] ?? 0.00);
$organizer_id= trim($input['organizer_id'] ?? '');
$venue_id    = trim($input['venue_id'] ?? '');
$category    = trim($input['category_tags'] ?? 'General');

if (empty($title) || empty($event_date) || empty($organizer_id) || empty($venue_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing mandatory fields."]);
    exit;
}

try {
    require_once __DIR__ . '/../../core/db.php';

    $stmt = $pdo->prepare("
        INSERT INTO events (organizer_id, venue_id, title, description, event_date, ticket_price, category_tags, status) 
        VALUES (:org_id, :venue_id, :title, :desc, :date, :price, :cat, 'Upcoming')
    ");
    
    $stmt->execute([
        'org_id'   => $organizer_id,
        'venue_id' => $venue_id,
        'title'    => $title,
        'desc'     => $description,
        'date'     => $event_date,
        'price'    => $ticket_price,
        'cat'      => $category
    ]);

    echo json_encode(["status" => "success", "message" => "Event created successfully!"]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>