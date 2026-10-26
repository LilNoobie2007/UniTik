<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$eventId = isset($body['event_id']) && is_string($body['event_id']) ? strtolower(trim($body['event_id'])) : '';
if (!unitik_is_uuid($eventId)) {
    unitik_json(400, ['ok' => false, 'error' => 'A valid event id is required.']);
}

try {
    $student = unitik_require_student();

    $event = db()->prepare('SELECT id FROM events WHERE id = :id LIMIT 1');
    $event->execute(['id' => $eventId]);
    if ($event->fetch() === false) {
        unitik_json(404, ['ok' => false, 'error' => 'Event not found.']);
    }

    $existing = db()->prepare(
        'SELECT id FROM tickets WHERE event_id = :event_id AND student_id = :student_id LIMIT 1'
    );
    $existing->execute([
        'event_id' => $eventId,
        'student_id' => $student['id'],
    ]);
    if ($existing->fetch() !== false) {
        unitik_json(409, ['ok' => false, 'error' => 'You already have a ticket for this event.']);
    }

    $ticket = null;
    for ($attempt = 0; $attempt < 3; $attempt++) {
        $code = strtoupper(bin2hex(random_bytes(8)));
        try {
            $insert = db()->prepare(
                'INSERT INTO tickets (id, event_id, student_id, user_id, ticket_hash, scan_status, issued_at)
                 VALUES (gen_random_uuid(), :event_id, :student_id, :user_id, :ticket_hash, FALSE, CURRENT_TIMESTAMP)
                 RETURNING id'
            );
            $insert->execute([
                'event_id' => $eventId,
                'student_id' => $student['id'],
                'user_id' => $student['id'],
                'ticket_hash' => $code,
            ]);
            $ticket = $insert->fetch();
            break;
        } catch (PDOException $e) {
            if ((string) $e->getCode() !== '23505') {
                throw $e;
            }
        }
    }

    if (!is_array($ticket)) {
        unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be booked.']);
    }

    $stmt = db()->prepare(
        'SELECT t.event_id, t.ticket_hash AS ticket_code, t.scan_status AS is_scanned,
                e.title, e.description, e.event_date, v.venue_name AS venue
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         LEFT JOIN venues v ON v.id = e.venue_id
         WHERE t.event_id = :event_id AND t.student_id = :student_id
         LIMIT 1'
    );
    $stmt->execute([
        'event_id' => $eventId,
        'student_id' => $student['id'],
    ]);
    $row = $stmt->fetch();
    if ($row === false) {
        unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be booked.']);
    }

    unitik_json(201, ['ok' => true, 'ticket' => unitik_ticket_payload($row)]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be booked.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
