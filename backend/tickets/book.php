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

$tierId = isset($body['tier_id']) && is_string($body['tier_id']) && trim($body['tier_id']) !== ''
    ? strtolower(trim($body['tier_id']))
    : null;
if ($tierId !== null && !unitik_is_uuid($tierId)) {
    unitik_json(400, ['ok' => false, 'error' => 'A valid ticket tier id is required.']);
}

$pdo = null;

try {
    $student = unitik_require_student();
    $pdo = db();
    $pdo->beginTransaction();

    // 1. Lock parent event row first (consistent lock order prevents deadlocks)
    $eventStmt = $pdo->prepare(
        'SELECT id, max_tickets_per_user
         FROM events
         WHERE id = :id
         FOR UPDATE'
    );
    $eventStmt->execute(['id' => $eventId]);
    $eventRow = $eventStmt->fetch();
    if ($eventRow === false) {
        $pdo->rollBack();
        unitik_json(404, ['ok' => false, 'error' => 'Event not found.']);
    }

    $maxPerUser = max(1, (int) ($eventRow['max_tickets_per_user'] ?? 5));

    // 2. Lock target ticket tier row
    if ($tierId !== null) {
        $tierStmt = $pdo->prepare(
            'SELECT id, name, price, capacity
             FROM ticket_tiers
             WHERE id = :tier_id AND event_id = :event_id
             FOR UPDATE'
        );
        $tierStmt->execute([
            'tier_id' => $tierId,
            'event_id' => $eventId,
        ]);
    } else {
        $tierStmt = $pdo->prepare(
            'SELECT id, name, price, capacity
             FROM ticket_tiers
             WHERE event_id = :event_id
             ORDER BY sort_order ASC, created_at ASC
             LIMIT 1
             FOR UPDATE'
        );
        $tierStmt->execute(['event_id' => $eventId]);
    }

    $tierRow = $tierStmt->fetch();
    if ($tierRow === false) {
        $pdo->rollBack();
        unitik_json(404, ['ok' => false, 'error' => 'Ticket tier not found for this event.']);
    }

    $lockedTierId = (string) $tierRow['id'];
    $tierCapacity = (int) $tierRow['capacity'];

    // 3. Enforce per-student event quota under the event lock
    $heldStmt = $pdo->prepare(
        'SELECT COUNT(*) AS held
         FROM tickets
         WHERE event_id = :event_id AND (student_id = :student_id OR user_id = :student_id)'
    );
    $heldStmt->execute([
        'event_id' => $eventId,
        'student_id' => $student['id'],
    ]);
    $heldCount = (int) (($heldStmt->fetch()['held'] ?? 0));

    if ($heldCount >= $maxPerUser) {
        $pdo->rollBack();
        unitik_json(409, [
            'ok' => false,
            'error' => 'You have reached the maximum of ' . $maxPerUser . ' ticket(s) for this event.',
        ]);
    }

    // 4. Enforce tier capacity under the tier lock (zero overselling)
    $soldStmt = $pdo->prepare(
        'SELECT COUNT(*) AS sold
         FROM tickets
         WHERE tier_id = :tier_id'
    );
    $soldStmt->execute(['tier_id' => $lockedTierId]);
    $soldCount = (int) (($soldStmt->fetch()['sold'] ?? 0));

    if ($soldCount >= $tierCapacity) {
        $pdo->rollBack();
        unitik_json(409, [
            'ok' => false,
            'error' => (string) $tierRow['name'] . ' is sold out.',
        ]);
    }

    // 5. Mint unique ticket hash with SAVEPOINT retry inside transaction
    $insertedId = null;
    for ($attempt = 0; $attempt < 3; $attempt++) {
        $code = strtoupper(bin2hex(random_bytes(8)));
        $pdo->exec('SAVEPOINT unitik_ticket_insert');
        try {
            $insert = $pdo->prepare(
                'INSERT INTO tickets (
                    id, event_id, tier_id, student_id, user_id, ticket_hash, scan_status, issued_at
                 )
                 VALUES (
                    gen_random_uuid(), :event_id, :tier_id, :student_id, :user_id, :ticket_hash, FALSE, CURRENT_TIMESTAMP
                 )
                 RETURNING id'
            );
            $insert->execute([
                'event_id' => $eventId,
                'tier_id' => $lockedTierId,
                'student_id' => $student['id'],
                'user_id' => $student['id'],
                'ticket_hash' => $code,
            ]);
            $inserted = $insert->fetch();
            $pdo->exec('RELEASE SAVEPOINT unitik_ticket_insert');
            if (is_array($inserted) && isset($inserted['id'])) {
                $insertedId = (string) $inserted['id'];
            }
            break;
        } catch (PDOException $e) {
            $pdo->exec('ROLLBACK TO SAVEPOINT unitik_ticket_insert');
            if ((string) $e->getCode() !== '23505') {
                throw $e;
            }
        }
    }

    if ($insertedId === null) {
        $pdo->rollBack();
        unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be booked.']);
    }

    // 6. Hydrate the exact minted pass by primary key before committing
    $stmt = $pdo->prepare(
        'SELECT t.event_id, t.ticket_hash AS ticket_code, t.scan_status AS is_scanned,
                t.tier_id, t.issued_at,
                tt.name AS tier_name, tt.price AS tier_price,
                e.title, e.description, e.event_date, v.venue_name AS venue
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         LEFT JOIN venues v ON v.id = e.venue_id
         LEFT JOIN ticket_tiers tt ON tt.id = t.tier_id
         WHERE t.id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $insertedId]);
    $row = $stmt->fetch();

    if ($row === false) {
        $pdo->rollBack();
        unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be booked.']);
    }

    $pdo->commit();

    $nextSold = $soldCount + 1;

    unitik_json(201, [
        'ok' => true,
        'ticket' => unitik_ticket_payload($row),
        'tier' => [
            'id' => $lockedTierId,
            'name' => (string) $tierRow['name'],
            'price' => number_format((float) $tierRow['price'], 2, '.', ''),
            'capacity' => $tierCapacity,
            'sold' => $nextSold,
            'remaining' => max(0, $tierCapacity - $nextSold),
        ],
    ]);
} catch (PDOException) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be booked.']);
} catch (RuntimeException) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}