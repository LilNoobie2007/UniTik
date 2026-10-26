<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

$body = unitik_bootstrap();
unitik_require_method('POST');
$input = unitik_event_input($body);

try {
    $user = unitik_require_planner();
    $venueId = unitik_resolve_venue($input['venue']);
    $stmt = db()->prepare(
        'INSERT INTO events (id, organizer_id, title, description, event_date, venue_id, ticket_price, status)
         VALUES (gen_random_uuid(), :organizer_id, :title, :description, :event_date, :venue_id, :ticket_price, :status)
         RETURNING id'
    );
    $stmt->execute([
        'organizer_id' => $user['id'],
        'title' => $input['title'],
        'description' => $input['description'],
        'event_date' => $input['event_date'],
        'venue_id' => $venueId,
        'ticket_price' => $input['ticket_price'],
        'status' => 'published',
    ]);
    $created = $stmt->fetch();
    if ($created === false) {
        unitik_json(500, ['ok' => false, 'error' => 'Event could not be published.']);
    }

    $event = unitik_find_event((string) $created['id']);
    if ($event === null) {
        unitik_json(500, ['ok' => false, 'error' => 'Event could not be published.']);
    }

    unitik_json(201, ['ok' => true, 'event' => unitik_event_payload($event, true)]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Event could not be published.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
