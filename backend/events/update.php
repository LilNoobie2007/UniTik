<?php
declare(strict_types=1);

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

$pdo = null;

try {
    $user = unitik_require_planner();
    $existing = unitik_find_event($id);

    if ($existing === null) {
        unitik_json(404, ['ok' => false, 'error' => 'Event not found.']);
    }
    if (!unitik_can_manage_event($user, (string) $existing['organizer_id'])) {
        unitik_json(403, ['ok' => false, 'error' => 'You can only change events you published.']);
    }

    $pdo = db();
    $pdo->beginTransaction();

    $venueId = unitik_resolve_venue($input['venue'], $input['venue_url'], $input['capacity']);

    $stmt = $pdo->prepare(
        'UPDATE events
         SET title = :title,
             description = :description,
             event_date = :event_date,
             venue_id = :venue_id,
             ticket_price = :ticket_price,
             image_url = :image_url,
             max_tickets_per_user = :max_tickets_per_user
         WHERE id = :id'
    );

    $stmt->execute([
        'id' => $id,
        'title' => $input['title'],
        'description' => $input['description'],
        'event_date' => $input['event_date'],
        'venue_id' => $venueId,
        'ticket_price' => $input['ticket_price'],
        'image_url' => $input['image_url'],
        'max_tickets_per_user' => $input['max_tickets_per_user'],
    ]);

    unitik_sync_event_tiers($pdo, $id, $input['tiers']);
    $pdo->commit();

    $event = unitik_find_event($id);
    if ($event === null) {
        unitik_json(500, ['ok' => false, 'error' => 'Event could not be updated.']);
    }

    $tiersMap = unitik_fetch_tiers_for_events([$id]);

    unitik_json(200, [
        'ok' => true,
        'event' => unitik_event_payload(
            $event,
            unitik_can_manage_event($user, (string) $event['organizer_id']),
            $tiersMap[$id] ?? []
        ),
    ]);
} catch (DomainException $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(409, ['ok' => false, 'error' => $e->getMessage()]);
} catch (PDOException $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ((string) $e->getCode() === '23505') {
        unitik_json(409, ['ok' => false, 'error' => 'Tier names must be unique per event.']);
    }
    unitik_json(500, ['ok' => false, 'error' => 'Event could not be updated.']);
} catch (RuntimeException) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}