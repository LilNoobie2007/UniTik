<?php
// backend/modules/events/list.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    require_once __DIR__ . '/../../core/db.php';

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
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);

    foreach($events as &$event) {
        $event['date'] = date('M d, Y', strtotime($event['event_date']));
        $rawPrice = $event['ticket_price'] ?? 0;
        $event['price'] = ($rawPrice > 0) ? '₹' . number_format($rawPrice, 2) : 'Free';
        $event['location'] = $event['venue_name'] ? $event['venue_name'] . ' (' . $event['location_details'] . ')' : 'UniTik Campus';
        $event['category'] = $event['category_tags'] ?? 'General';
    }

    echo json_encode(["status" => "success", "data" => $events]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["status" => "error", "message" => $e->getMessage()]);
}
?>