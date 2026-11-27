<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/common.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$rawInput = isset($body['ticket_code']) && is_string($body['ticket_code'])
    ? $body['ticket_code']
    : '';
$parsed = unitik_parse_scan_token($rawInput);
$code = $parsed['ticket_code'];

$rawGate = isset($body['gate_identifier']) && is_string($body['gate_identifier'])
    ? trim($body['gate_identifier'])
    : 'main';
$gateIdentifier = $rawGate !== '' ? substr($rawGate, 0, 100) : 'main';

try {
    $user = unitik_require_planner();
    $pdo = db();

    $stmt = $pdo->prepare(
        'SELECT t.id AS ticket_id, t.event_id, t.ticket_hash AS ticket_code, t.scan_status AS is_scanned,
                t.tier_id, t.issued_at,
                tt.name AS tier_name, tt.price AS tier_price,
                e.title, e.description, e.event_date, e.organizer_id, v.venue_name AS venue,
                s.full_name AS holder_name, s.email AS holder_email
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         LEFT JOIN venues v ON v.id = e.venue_id
         LEFT JOIN ticket_tiers tt ON tt.id = t.tier_id
         LEFT JOIN students s ON s.id = t.student_id
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

    // Cryptographic HMAC-SHA256 verification for signed QR payloads
    if ($parsed['is_signed']) {
        $sigOk = unitik_verify_ticket_signature(
            $code,
            (string) $row['event_id'],
            (string) $parsed['provided_sig']
        );
        if (!$sigOk) {
            $forgedLog = $pdo->prepare(
                'INSERT INTO gate_scan_logs (id, ticket_id, scanned_at, gate_identifier, scan_result)
                 VALUES (gen_random_uuid(), :ticket_id, CURRENT_TIMESTAMP, :gate_identifier, :scan_result)'
            );
            $forgedLog->execute([
                'ticket_id' => $row['ticket_id'],
                'gate_identifier' => $gateIdentifier,
                'scan_result' => 'forged_signature',
            ]);

            unitik_json(403, [
                'ok' => false,
                'error' => 'Invalid QR cryptographic signature. Pass may be forged or tampered with.',
            ]);
        }
    }

    // Atomic check-in guard prevents race-condition double entry
    $claim = $pdo->prepare(
        'UPDATE tickets
         SET scan_status = TRUE
         WHERE id = :id AND scan_status = FALSE
         RETURNING id'
    );
    $claim->execute(['id' => $row['ticket_id']]);
    $claimed = $claim->fetch() !== false;

    $already = !$claimed;
    $scanResult = $claimed ? 'admitted' : 'duplicate';

    $log = $pdo->prepare(
        'INSERT INTO gate_scan_logs (id, ticket_id, scanned_at, gate_identifier, scan_result)
         VALUES (gen_random_uuid(), :ticket_id, CURRENT_TIMESTAMP, :gate_identifier, :scan_result)'
    );
    $log->execute([
        'ticket_id' => $row['ticket_id'],
        'gate_identifier' => $gateIdentifier,
        'scan_result' => $scanResult,
    ]);

    $firstScannedAt = null;
    if ($already) {
        $prev = $pdo->prepare(
            'SELECT scanned_at
             FROM gate_scan_logs
             WHERE ticket_id = :ticket_id AND scan_result = :result
             ORDER BY scanned_at ASC
             LIMIT 1'
        );
        $prev->execute([
            'ticket_id' => $row['ticket_id'],
            'result' => 'admitted',
        ]);
        $prevRow = $prev->fetch();
        if (is_array($prevRow) && isset($prevRow['scanned_at']) && $prevRow['scanned_at'] !== null) {
            $firstScannedAt = (string) $prevRow['scanned_at'];
        }
    }

    $row['is_scanned'] = true;

    unitik_json(200, [
        'ok' => true,
        'already_scanned' => $already,
        'signature_verified' => $parsed['is_signed'],
        'first_scanned_at' => $firstScannedAt,
        'gate_identifier' => $gateIdentifier,
        'holder_name' => isset($row['holder_name']) ? (string) $row['holder_name'] : null,
        'holder_email' => isset($row['holder_email']) ? (string) $row['holder_email'] : null,
        'ticket' => unitik_ticket_payload($row),
    ]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Ticket could not be scanned.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}