<?php
declare(strict_types=1);

function unitik_pg_bool(mixed $value): bool
{
    return $value === true || $value === 1 || $value === '1' || $value === 't' || $value === 'true';
}

function unitik_qr_secret(): string
{
    static $cached = null;
    if (is_string($cached) && $cached !== '') {
        return $cached;
    }

    $fromEnv = $_ENV['UNITIK_QR_SECRET'] ?? getenv('UNITIK_QR_SECRET');
    if (is_string($fromEnv) && trim($fromEnv) !== '') {
        $cached = trim($fromEnv);
        return $cached;
    }

    $envPath = dirname(__DIR__, 2) . '/.env';
    if (is_file($envPath) && is_readable($envPath)) {
        $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines)) {
            foreach ($lines as $line) {
                $trimmed = trim($line);
                if ($trimmed === '' || str_starts_with($trimmed, '#')) {
                    continue;
                }
                if (str_starts_with($trimmed, 'UNITIK_QR_SECRET=')) {
                    $val = trim(substr($trimmed, strlen('UNITIK_QR_SECRET=')));
                    $val = trim($val, "\"'");
                    if ($val !== '') {
                        $cached = $val;
                        return $cached;
                    }
                }
            }
        }
    }

    $cached = 'unitik-local-dev-hmac-secret-change-in-prod';
    return $cached;
}

function unitik_sign_ticket_token(string $ticketCode, string $eventId): string
{
    $code = strtoupper(trim($ticketCode));
    $eid = strtolower(trim($eventId));
    $message = 'UT1|' . $eid . '|' . $code;
    $mac = strtoupper(substr(hash_hmac('sha256', $message, unitik_qr_secret()), 0, 32));

    return 'UT1.' . $code . '.' . $mac;
}

/**
 * @return array{ticket_code: string, is_signed: bool, provided_sig: ?string}
 */
function unitik_parse_scan_token(string $rawInput): array
{
    $normalized = strtoupper(trim($rawInput));
    if ($normalized === '' || strlen($normalized) > 128) {
        unitik_json(400, ['ok' => false, 'error' => 'A valid ticket code or signed QR token is required.']);
    }

    if (str_starts_with($normalized, 'UT1.')) {
        $parts = explode('.', $normalized);
        if (
            count($parts) !== 3 ||
            preg_match('/^[0-9A-F]{8,64}$/', $parts[1]) !== 1 ||
            preg_match('/^[0-9A-F]{32}$/', $parts[2]) !== 1
        ) {
            unitik_json(400, ['ok' => false, 'error' => 'Malformed signed QR token.']);
        }

        return [
            'ticket_code' => $parts[1],
            'is_signed' => true,
            'provided_sig' => $parts[2],
        ];
    }

    if (strlen($normalized) > 64) {
        unitik_json(400, ['ok' => false, 'error' => 'Ticket code must be 64 characters or fewer.']);
    }

    return [
        'ticket_code' => $normalized,
        'is_signed' => false,
        'provided_sig' => null,
    ];
}

function unitik_verify_ticket_signature(string $ticketCode, string $eventId, string $providedSig): bool
{
    $expectedToken = unitik_sign_ticket_token($ticketCode, $eventId);
    $expectedParts = explode('.', $expectedToken);
    $expectedSig = $expectedParts[2] ?? '';

    return $expectedSig !== '' && hash_equals($expectedSig, strtoupper(trim($providedSig)));
}

/**
 * @param array<string, mixed> $row
 * @return array{
 *   event_id: string,
 *   title: string,
 *   description: ?string,
 *   event_date: string,
 *   venue: string,
 *   ticket_code: string,
 *   qr_token: string,
 *   is_scanned: bool,
 *   tier_id: ?string,
 *   tier_name: string,
 *   tier_price: string,
 *   issued_at: ?string
 * }
 */
function unitik_ticket_payload(array $row): array
{
    $eventId = (string) $row['event_id'];
    $ticketCode = strtoupper((string) $row['ticket_code']);

    return [
        'event_id' => $eventId,
        'title' => (string) $row['title'],
        'description' => isset($row['description']) && $row['description'] !== null ? (string) $row['description'] : null,
        'event_date' => (string) $row['event_date'],
        'venue' => isset($row['venue']) && $row['venue'] !== null && $row['venue'] !== ''
            ? (string) $row['venue']
            : 'To be announced',
        'ticket_code' => $ticketCode,
        'qr_token' => unitik_sign_ticket_token($ticketCode, $eventId),
        'is_scanned' => unitik_pg_bool($row['is_scanned'] ?? false),
        'tier_id' => isset($row['tier_id']) && $row['tier_id'] !== null ? (string) $row['tier_id'] : null,
        'tier_name' => isset($row['tier_name']) && $row['tier_name'] !== null && $row['tier_name'] !== ''
            ? (string) $row['tier_name']
            : 'General Admission',
        'tier_price' => isset($row['tier_price']) && $row['tier_price'] !== null
            ? number_format((float) $row['tier_price'], 2, '.', '')
            : '0.00',
        'issued_at' => isset($row['issued_at']) && $row['issued_at'] !== null ? (string) $row['issued_at'] : null,
    ];
}