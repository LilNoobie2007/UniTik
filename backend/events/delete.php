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

try {
    $user = unitik_require_planner();
    $existing = unitik_find_event($id);
    if ($existing === null) {
        unitik_json(404, ['ok' => false, 'error' => 'Event not found.']);
    }
    if (!unitik_can_manage_event($user, (string) $existing['organizer_id'])) {
        unitik_json(403, ['ok' => false, 'error' => 'You can only change events you published.']);
    }

    $logs = db()->prepare(
        'DELETE FROM gate_scan_logs
         WHERE ticket_id IN (SELECT id FROM tickets WHERE event_id = :id)'
    );
    $logs->execute(['id' => $id]);

    $tickets = db()->prepare('DELETE FROM tickets WHERE event_id = :id');
    $tickets->execute(['id' => $id]);

    $stmt = db()->prepare('DELETE FROM events WHERE id = :id');
    $stmt->execute(['id' => $id]);

    unitik_json(200, ['ok' => true]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Event could not be deleted.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
