<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

unitik_bootstrap(false);
unitik_require_method('GET');

try {
    $student = unitik_require_student();
    $stmt = db()->prepare(
        'SELECT t.event_id, t.ticket_hash AS ticket_code, t.scan_status AS is_scanned,
                e.title, e.description, e.event_date, v.venue_name AS venue
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         LEFT JOIN venues v ON v.id = e.venue_id
         WHERE t.student_id = :student_id OR t.user_id = :student_id
         ORDER BY e.event_date ASC NULLS LAST'
    );
    $stmt->execute(['student_id' => $student['id']]);

    $tickets = [];
    foreach ($stmt as $row) {
        if (is_array($row)) {
            $tickets[] = unitik_ticket_payload($row);
        }
    }

    unitik_json(200, ['ok' => true, 'tickets' => $tickets]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Tickets could not be loaded.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
