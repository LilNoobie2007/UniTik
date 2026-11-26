<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

$body = unitik_bootstrap();
unitik_require_method('POST');
$input = unitik_event_input($body);

$pdo = null;

try {
    $user = unitik_require_planner();
    $pdo = db();
    $pdo->beginTransaction();

    $venueId = unitik_resolve_venue($input['venue'], $input['venue_url'], $input['capacity']);

    $stmt = $pdo->prepare(
        'INSERT INTO events (
            id, organizer_id, title, description, event_date, venue_id,
            ticket_price, image_url, max_tickets_per_user, status
         )
         VALUES (
            gen_random_uuid(), :organizer_id, :title, :description, :event_date, :venue_id,
            :ticket_price, :image_url, :max_tickets_per_user, :status
         )
         RETURNING id'
    );

    $stmt->execute([
        'organizer_id' => $user['id'],
        'title' => $input['title'],
        'description' => $input['description'],
        'event_date' => $input['event_date'],
        'venue_id' => $venueId,
        'ticket_price' => $input['ticket_price'],
        'image_url' => $input['image_url'],
        'max_tickets_per_user' => $input['max_tickets_per_user'],
        'status' => 'published',
    ]);

    $created = $stmt->fetch();
    if ($created === false) {
        $pdo->rollBack();
        unitik_json(500, ['ok' => false, 'error' => 'Event could not be published.']);
    }

    $eventId = (string) $created['id'];
    unitik_sync_event_tiers($pdo, $eventId, $input['tiers']);
    $pdo->commit();

    $event = unitik_find_event($eventId);
    if ($event === null) {
        unitik_json(500, ['ok' => false, 'error' => 'Event could not be published.']);
    }

    $tiersMap = unitik_fetch_tiers_for_events([$eventId]);

    unitik_json(201, [
        'ok' => true,
        'event' => unitik_event_payload($event, true, $tiersMap[$eventId] ?? []),
    ]);
} catch (DomainException $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(409, ['ok' => false, 'error' => $e->getMessage()]);
} catch (PDOException) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(500, ['ok' => false, 'error' => 'Event could not be published.']);
} catch (RuntimeException) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}