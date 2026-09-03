<?php
declare(strict_types=1);

/**
 * Endpoint: /events/list.php
 * Purpose: Return the public event listing with venue and organizer details.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

/**
 * Fetches all events joined with venue and organizer data.
 *
 * @param PDO $pdo Active PDO connection.
 *
 * @return array<int, array<string, mixed>> Event rows.
 *
 * @throws PDOException When the query fails.
 */
function fetchEvents(PDO $pdo): array
{
    $stmt = $pdo->prepare("
        SELECT 
            e.id, e.title, e.description, e.event_date, e.ticket_price, e.category_tags, e.status, e.page_views,
            v.venue_name, v.location_details, v.max_capacity,
            o.full_name as organizer_name, o.committee_name
        FROM events e
        LEFT JOIN venues v ON e.venue_id = v.id
        LEFT JOIN organizers o ON e.organizer_id = o.id
        ORDER BY e.event_date ASC
    ");
    $stmt->execute();

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

/**
 * Adds display fields (date, price, location, category) without altering stored values.
 *
 * @param array<string, mixed> $event Raw event row.
 *
 * @return array<string, mixed> Event row with presentation fields.
 */
function formatEventRow(array $event): array
{
    $event['date'] = date('M d, Y', strtotime((string) $event['event_date']));
    $rawPrice = $event['ticket_price'] ?? 0;
    $event['price'] = ($rawPrice > 0) ? '₹' . number_format((float) $rawPrice, 2) : 'Free';
    $event['location'] = $event['venue_name'] ? $event['venue_name'] . ' (' . $event['location_details'] . ')' : 'UniTik Campus';
    $event['category'] = $event['category_tags'] ?? 'General';

    return $event;
}

try {
    require_once __DIR__ . '/../../core/db.php';

    $events = fetchEvents($pdo);

    foreach ($events as &$event) {
        $event = formatEventRow($event);
    }
    unset($event);

    echo json_encode(["status" => "success", "data" => $events]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
