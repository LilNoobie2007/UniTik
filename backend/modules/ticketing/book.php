<?php
declare(strict_types=1);

/**
 * Endpoint: /ticketing/book.php
 * Purpose: Create a ticket, generate a QR payload, and email it to the user.
 */

// 1. Force JSON output immediately
header('Content-Type: application/json');

// 2. Start output buffering to catch any "hidden" errors/warnings
ob_start();

// 3. Silence PHP notices/warnings so they don't break JSON
error_reporting(E_ALL);
ini_set('display_errors', '0');

/**
 * Inserts a ticket and returns the new row (including id).
 *
 * @param PDO    $pdo        Active PDO connection.
 * @param string $eventId    Event UUID.
 * @param string $userId     User UUID.
 * @param string $ticketHash Unique ticket hash.
 *
 * @return array<string, mixed>|false Inserted ticket row.
 *
 * @throws PDOException When the insert fails.
 */
function insertTicket(PDO $pdo, string $eventId, string $userId, string $ticketHash): array|false
{
    $stmt = $pdo->prepare("INSERT INTO tickets (event_id, user_id, ticket_hash) VALUES (:eid, :uid, :hash) RETURNING id");
    $stmt->execute([':eid' => $eventId, ':uid' => $userId, ':hash' => $ticketHash]);

    return $stmt->fetch(PDO::FETCH_ASSOC);
}

/**
 * Loads email and full name for a user.
 *
 * @param PDO    $pdo    Active PDO connection.
 * @param string $userId User UUID.
 *
 * @return array<string, mixed>|false User row.
 *
 * @throws PDOException When the query fails.
 */
function fetchUserForTicket(PDO $pdo, string $userId): array|false
{
    $user = $pdo->prepare("SELECT email, full_name FROM users WHERE id = ?");
    $user->execute([$userId]);

    return $user->fetch(PDO::FETCH_ASSOC);
}

/**
 * Loads the event title for a ticket email.
 *
 * @param PDO    $pdo     Active PDO connection.
 * @param string $eventId Event UUID.
 *
 * @return array<string, mixed>|false Event row.
 *
 * @throws PDOException When the query fails.
 */
function fetchEventForTicket(PDO $pdo, string $eventId): array|false
{
    $event = $pdo->prepare("SELECT title FROM events WHERE id = ?");
    $event->execute([$eventId]);

    return $event->fetch(PDO::FETCH_ASSOC);
}

/**
 * Builds PNG QR bytes for a ticket hash.
 *
 * @param string $ticketHash Unique ticket hash.
 *
 * @return string PNG image bytes.
 */
function buildTicketQrPng(string $ticketHash): string
{
    $qrResult = \Endroid\QrCode\Builder\Builder::create()
        ->writer(new \Endroid\QrCode\Writer\PngWriter())
        ->data($ticketHash)
        ->size(400)
        ->build();

    return $qrResult->getString();
}

try {
    // 4. Load dependencies
    require_once __DIR__ . '/../../../vendor/autoload.php';
    require_once __DIR__ . '/../../core/security.php';
    require_once __DIR__ . '/../../core/db.php';
    require_once __DIR__ . '/../../core/mailer.php';

    // 5. Parse payload
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (!$data) {
        throw new Exception("Invalid JSON input");
    }

    $user_id = sanitizeInput($data['user_id'] ?? '');
    $event_id = sanitizeInput($data['event_id'] ?? '');

    if (empty($user_id) || empty($event_id)) {
        throw new Exception("Missing required fields: user_id or event_id");
    }

    $user_id = (string) $user_id;
    $event_id = (string) $event_id;

    // 6. DB Operations
    $ticket_hash = bin2hex(random_bytes(16));
    $ticket = insertTicket($pdo, $event_id, $user_id, $ticket_hash);

    // 7. Get User/Event Info
    $userData = fetchUserForTicket($pdo, $user_id);
    $eventData = fetchEventForTicket($pdo, $event_id);

    // 8. Generate QR
    $qrPng = buildTicketQrPng($ticket_hash);

    // 9. Send Email (Assuming sendTicketEmail returns boolean)
    $emailSuccess = sendTicketEmail($userData['email'], $userData['full_name'], $eventData['title'], $ticket_hash, $qrPng);

    // --- SUCCESS: CLEAN THE BUFFER AND SEND JSON ---
    ob_end_clean();
    echo json_encode([
        "status" => "success",
        "ticket_hash" => $ticket_hash,
        "email_sent" => $emailSuccess
    ]);
} catch (PDOException $e) {
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        "status" => "error",
        "message" => $e->getMessage()
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
