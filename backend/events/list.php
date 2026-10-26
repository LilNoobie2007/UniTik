<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

unitik_bootstrap(false);
unitik_require_method('GET');

try {
    $user = unitik_require_user();
    $stmt = db()->query(
        'SELECT e.id, e.title, e.description, e.event_date, e.organizer_id,
                v.venue_name AS venue,
                o.full_name AS organizer_name
         FROM events e
         LEFT JOIN venues v ON v.id = e.venue_id
         LEFT JOIN organizers o ON o.id = e.organizer_id
         ORDER BY e.event_date ASC NULLS LAST'
    );
    if ($stmt === false) {
        unitik_json(500, ['ok' => false, 'error' => 'Events could not be loaded.']);
    }

    $events = [];
    foreach ($stmt as $row) {
        if (!is_array($row)) {
            continue;
        }
        $events[] = unitik_event_payload(
            $row,
            unitik_can_manage_event($user, (string) ($row['organizer_id'] ?? ''))
        );
    }

    unitik_json(200, ['ok' => true, 'events' => $events]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Events could not be loaded.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
