<?php
declare(strict_types=1);

function unitik_pg_bool(mixed $value): bool
{
    return $value === true || $value === 1 || $value === '1' || $value === 't' || $value === 'true';
}

/**
 * @param array<string, mixed> $row
 * @return array{event_id: string, title: string, description: ?string, event_date: string, venue: string, ticket_code: string, is_scanned: bool}
 */
function unitik_ticket_payload(array $row): array
{
    return [
        'event_id' => (string) $row['event_id'],
        'title' => (string) $row['title'],
        'description' => isset($row['description']) && $row['description'] !== null ? (string) $row['description'] : null,
        'event_date' => (string) $row['event_date'],
        'venue' => isset($row['venue']) && $row['venue'] !== null && $row['venue'] !== ''
            ? (string) $row['venue']
            : 'To be announced',
        'ticket_code' => (string) $row['ticket_code'],
        'is_scanned' => unitik_pg_bool($row['is_scanned'] ?? false),
    ];
}
