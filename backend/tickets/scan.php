<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$code = isset($body['ticket_code']) && is_string($body['ticket_code'])
    ? strtoupper(trim($body['ticket_code']))
    : '';
if ($code === '' || strlen($code) > 64) {
    unitik_json(400, ['ok' => false, 'error' => 'A ticket code is required.']);
}

try {
    $user = unitik_require_planner();
    $stmt = db()->prepare(
        'SELECT t.id AS ticket_id, t.event_id, t.ticket_hash AS ticket_code, t.scan_status AS is_scanned,
                e.title, e.description, e.event_date, e.organizer_id, v.venue_name AS venue
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         LEFT JOIN venues v ON v.id = e.venue_id
         WHERE t.ticket_hash = :ticket_code
         LIMIT 1'
    );
    $stmt->execute(['ticket_code' => $code]);
    $row = $stmt->fetch();
    if ($row === false) {
        unitik_json(404, ['ok' => false, 'error' => 'Ticket not found.']);
    }
    if (!unitik_can_manage_event($user, (string) ($row['organizer_id'] ?? ''))) {
        unitik_json(403, ['ok' => false, 'error' => 'You can only scan tickets for events you published.']);
    }

    $already = unitik_pg_bool($row['is_scanned'] ?? false);
    if (!$already) {
        $update = db()->prepare('UPDATE tickets SET scan_status = TRUE WHERE id = :id');
        $update->execute(['id' => $row['ticket_id']]);
        $row['is_scanned'] = true;
        $log = db()->prepare(
            'INSERT INTO gate_scan_logs (id, ticket_id, scanned_at, gate_identifier, scan_result)
             VALUES (gen_random_uuid(), :ticket_id, CURRENT_TIMESTAMP, :gate_identifier, :scan_result)'
        );
        $log->execute([
            'ticket_id' => $row['ticket_id'],
            'gate_identifier' => 'main',
            'scan_result' => 'admitted',
        ]);
    }

    unitik_json(200, [
        'ok' => true,
        'already_scanned' => $already,
        'ticket' => unitik_ticket_payload($row),
    ]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be scanned.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
