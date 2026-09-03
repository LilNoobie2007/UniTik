<?php
declare(strict_types=1);

/**
 * Endpoint: /events/create.php
 * Purpose: Create a new campus event record.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

/**
 * Persists a new event using the same insert payload as before.
 *
 * @param PDO    $pdo         Active PDO connection.
 * @param string $organizerId Organizer UUID.
 * @param string $venueId     Venue UUID.
 * @param string $title       Event title.
 * @param string $description Event description.
 * @param string $eventDate   Event date/time string.
 * @param float  $ticketPrice Ticket price.
 * @param string $category    Category tags.
 *
 * @return void
 *
 * @throws PDOException When the insert fails.
 */
function createEvent(
    PDO $pdo,
    string $organizerId,
    string $venueId,
    string $title,
    string $description,
    string $eventDate,
    float $ticketPrice,
    string $category
): void {
    $stmt = $pdo->prepare("
        INSERT INTO events (organizer_id, venue_id, title, description, event_date, ticket_price, category_tags, status) 
        VALUES (:org_id, :venue_id, :title, :desc, :date, :price, :cat, 'Upcoming')
    ");

    $stmt->execute([
        'org_id'   => $organizerId,
        'venue_id' => $venueId,
        'title'    => $title,
        'desc'     => $description,
        'date'     => $eventDate,
        'price'    => $ticketPrice,
        'cat'      => $category
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["status" => "error", "message" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$title        = trim($input['title'] ?? '');
$description  = trim($input['description'] ?? '');
$event_date   = trim($input['event_date'] ?? '');
$ticket_price = floatval($input['ticket_price'] ?? 0.00);
$organizer_id = trim($input['organizer_id'] ?? '');
$venue_id     = trim($input['venue_id'] ?? '');
$category     = trim($input['category_tags'] ?? 'General');

if (empty($title) || empty($event_date) || empty($organizer_id) || empty($venue_id)) {
    http_response_code(400);
    echo json_encode(["status" => "error", "message" => "Missing mandatory fields."]);
    exit;
}

try {
    require_once __DIR__ . '/../../core/db.php';

    createEvent(
        $pdo,
        $organizer_id,
        $venue_id,
        $title,
        $description,
        $event_date,
        $ticket_price,
        $category
    );

    echo json_encode(["status" => "success", "message" => "Event created successfully!"]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
