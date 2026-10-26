<?php
declare(strict_types=1);

/**
 * Event Modification Endpoint (POST)
 * 
 * Protected route: Validates dual-identity session against the event's original
 * organizer_id. Sanitizes and updates title, description, venue, and pricing data.
 * Resolves implicit venue creation if a new location is requested.
 */

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$id = isset($body['id']) && is_string($body['id']) ? strtolower(trim($body['id'])) : '';
if (!unitik_is_uuid($id)) {
    unitik_json(400, ['ok' => false, 'error' => 'A valid event id is required.']);
}
$input = unitik_event_input($body);

try {
    // 1. RBAC Barrier & Ownership Scope
    $user = unitik_require_planner();
    $existing = unitik_find_event($id);
    
    if ($existing === null) {
        unitik_json(404, ['ok' => false, 'error' => 'Event not found.']);
    }
    if (!unitik_can_manage_event($user, (string) $existing['organizer_id'])) {
        unitik_json(403, ['ok' => false, 'error' => 'You can only change events you published.']);
    }

    // 2. Safe Venue Mapping
    $venueId = unitik_resolve_venue($input['venue']);
    
    // 3. Execution of Update
    $stmt = db()->prepare(
        'UPDATE events
         SET title = :title,
             description = :description,
             event_date = :event_date,
             venue_id = :venue_id,
             ticket_price = :ticket_price
         WHERE id = :id'
    );
    
    $stmt->execute([
        'id' => $id,
        'title' => $input['title'],
        'description' => $input['description'],
        'event_date' => $input['event_date'],
        'venue_id' => $venueId,
        'ticket_price' => $input['ticket_price'],
    ]);

    // 4. State Hydration
    $event = unitik_find_event($id);
    if ($event === null) {
        unitik_json(500, ['ok' => false, 'error' => 'Event could not be updated.']);
    }

    unitik_json(200, [
        'ok' => true,
        'event' => unitik_event_payload($event, unitik_can_manage_event($user, (string) $event['organizer_id'])),
    ]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Event could not be updated.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}