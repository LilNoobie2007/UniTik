<?php
declare(strict_types=1);

/*
 * File: backend/modules/ticketing/validate.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Gate check. tickets.scan_status is the entry flag — there is no tickets.status.
 * Role is read from users, not from the request body.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);
$data = readJsonBody();

$rawHash = is_string($data['ticket_hash'] ?? null) ? trim($data['ticket_hash']) : '';
if (preg_match('/^UNITIK[:\-]/i', $rawHash, $prefix) === 1) {
    $rawHash = trim(substr($rawHash, strlen($prefix[0])));
}
$ticketHash = strtolower($rawHash);

$eventId = strtolower(sanitizeText($data['event_id'] ?? ''));
$eventId = $eventId === '' ? null : $eventId;
$gate = sanitizeText($data['gate_identifier'] ?? 'GATE-A');
if ($gate === '') {
    $gate = 'GATE-A';
}
$gate = mb_substr($gate, 0, 50);

if (!preg_match('/^[0-9a-f]{16,64}$/', $ticketHash)) {
    jsonResponse(400, [
        'status' => 'error',
        'message' => 'ticket_hash is required.',
        'data' => ['result' => 'invalid'],
    ]);
}
if ($eventId !== null && !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $eventId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'event_id is not a valid id.']);
}

if (!in_array($user['role'], ['organizer', 'admin'], true)) {
    jsonResponse(403, [
        'status' => 'error',
        'message' => 'Only hosts and campus admins can scan at the gate.',
        'data' => ['result' => 'forbidden'],
    ]);
}

try {
    $stmt = $pdo->prepare(
        'SELECT t.id, t.event_id, t.scan_status, t.ticket_hash,
                e.organizer_id, e.title,
                u.full_name AS holder_name
         FROM tickets t
         JOIN events e ON e.id = t.event_id
         JOIN users u ON u.id = t.student_id
         WHERE t.ticket_hash = :ticket_hash'
    );
    $stmt->execute(['ticket_hash' => $ticketHash]);
    $ticket = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Validation failed.']);
}

if (!is_array($ticket)) {
    jsonResponse(404, [
        'status' => 'error',
        'message' => 'INVALID TICKET — not in the ledger. Do not allow entry.',
        'data' => ['result' => 'invalid'],
    ]);
}

if ($user['role'] === 'organizer' && $ticket['organizer_id'] !== $user['id']) {
    jsonResponse(403, [
        'status' => 'error',
        'message' => 'This ticket belongs to another host\'s event.',
        'data' => [
            'result' => 'forbidden',
            'event_title' => $ticket['title'],
        ],
    ]);
}

function writeScan(PDO $pdo, string $ticketId, string $gate, string $result, string $scannedBy): void
{
    $log = $pdo->prepare(
        'INSERT INTO gate_scan_logs (ticket_id, scanned_by, gate_identifier, scan_result)
         VALUES (:ticket_id, :scanned_by, :gate_identifier, :scan_result)'
    );
    $log->execute([
        'ticket_id' => $ticketId,
        'scanned_by' => $scannedBy,
        'gate_identifier' => $gate,
        'scan_result' => $result,
    ]);
}

try {
    if ($eventId !== null && $eventId !== $ticket['event_id']) {
        writeScan($pdo, (string) $ticket['id'], $gate, 'wrong_event', (string) $user['id']);
        jsonResponse(409, [
            'status' => 'error',
            'message' => 'WRONG EVENT — this QR is valid, but not for the gate you selected.',
            'data' => [
                'result' => 'wrong_event',
                'event_title' => $ticket['title'],
                'ticket_hash' => $ticket['ticket_hash'],
            ],
        ]);
    }

    $flip = $pdo->prepare(
        'UPDATE tickets
         SET scan_status = TRUE
         WHERE id = :id AND scan_status = FALSE
         RETURNING id'
    );
    $flip->execute(['id' => $ticket['id']]);
    $updated = $flip->fetch();

    if (!is_array($updated)) {
        writeScan($pdo, (string) $ticket['id'], $gate, 'already_used', (string) $user['id']);
        jsonResponse(409, [
            'status' => 'error',
            'message' => 'ALREADY USED — this person has already entered.',
            'data' => [
                'result' => 'already_used',
                'holder_name' => $ticket['holder_name'],
                'event_title' => $ticket['title'],
                'ticket_hash' => $ticket['ticket_hash'],
            ],
        ]);
    }

    writeScan($pdo, (string) $ticket['id'], $gate, 'approved', (string) $user['id']);
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Validation failed.']);
}

jsonResponse(200, [
    'status' => 'success',
    'data' => [
        'result' => 'approved',
        'message' => 'VALID TICKET — entry approved.',
        'holder_name' => $ticket['holder_name'],
        'event_title' => $ticket['title'],
        'ticket_hash' => $ticket['ticket_hash'],
    ],
]);
