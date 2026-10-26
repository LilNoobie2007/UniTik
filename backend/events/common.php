<?php
declare(strict_types=1);

/**
 * @param array<string, mixed> $body
 * @return array{title: string, description: ?string, event_date: string, venue: string, ticket_price: ?string}
 */
function unitik_event_input(array $body): array
{
    $title = isset($body['title']) && is_string($body['title']) ? trim($body['title']) : '';
    $venue = isset($body['venue']) && is_string($body['venue']) ? trim($body['venue']) : '';
    $description = isset($body['description']) && is_string($body['description']) ? trim($body['description']) : '';
    $rawDate = isset($body['event_date']) && is_string($body['event_date']) ? trim($body['event_date']) : '';
    $priceRaw = $body['ticket_price'] ?? null;

    $titleLength = function_exists('mb_strlen') ? mb_strlen($title) : strlen($title);
    $venueLength = function_exists('mb_strlen') ? mb_strlen($venue) : strlen($venue);
    $descriptionLength = function_exists('mb_strlen') ? mb_strlen($description) : strlen($description);

    if ($title === '' || $titleLength > 200) {
        unitik_json(400, ['ok' => false, 'error' => 'Title must be 1–200 characters.']);
    }
    if ($venue === '' || $venueLength > 200) {
        unitik_json(400, ['ok' => false, 'error' => 'Venue must be 1–200 characters.']);
    }
    if ($descriptionLength > 4000) {
        unitik_json(400, ['ok' => false, 'error' => 'Description must be 4000 characters or fewer.']);
    }
    if ($rawDate === '') {
        unitik_json(400, ['ok' => false, 'error' => 'Event date is required.']);
    }

    try {
        $when = new DateTimeImmutable($rawDate);
    } catch (Exception) {
        unitik_json(400, ['ok' => false, 'error' => 'Event date is not valid.']);
    }

    $price = null;
    if ($priceRaw !== null && $priceRaw !== '') {
        if (!is_numeric($priceRaw) || (float) $priceRaw < 0) {
            unitik_json(400, ['ok' => false, 'error' => 'Ticket price must be a number.']);
        }
        $price = number_format((float) $priceRaw, 2, '.', '');
    }

    return [
        'title' => $title,
        'description' => $description === '' ? null : $description,
        'event_date' => $when->format(DateTimeInterface::ATOM),
        'venue' => $venue,
        'ticket_price' => $price,
    ];
}

function unitik_resolve_venue(string $name): string
{
    $stmt = db()->prepare(
        'SELECT id FROM venues WHERE lower(venue_name) = lower(:name) LIMIT 1'
    );
    $stmt->execute(['name' => $name]);
    $existing = $stmt->fetch();
    if ($existing !== false) {
        return (string) $existing['id'];
    }

    $insert = db()->prepare(
        'INSERT INTO venues (id, venue_name, max_capacity)
         VALUES (gen_random_uuid(), :name, 200)
         RETURNING id'
    );
    $insert->execute(['name' => $name]);
    $created = $insert->fetch();
    if ($created === false) {
        unitik_json(500, ['ok' => false, 'error' => 'Venue could not be saved.']);
    }

    return (string) $created['id'];
}

/**
 * @param array<string, mixed> $row
 * @return array{id: string, title: string, description: ?string, event_date: string, venue: string, organizer_name: string, can_manage: bool}
 */
function unitik_event_payload(array $row, bool $canManage): array
{
    $venue = isset($row['venue']) && $row['venue'] !== null && $row['venue'] !== ''
        ? (string) $row['venue']
        : 'To be announced';

    return [
        'id' => (string) $row['id'],
        'title' => (string) $row['title'],
        'description' => isset($row['description']) && $row['description'] !== null ? (string) $row['description'] : null,
        'event_date' => isset($row['event_date']) && $row['event_date'] !== null ? (string) $row['event_date'] : '',
        'venue' => $venue,
        'organizer_name' => isset($row['organizer_name']) && $row['organizer_name'] !== null
            ? (string) $row['organizer_name']
            : 'Campus',
        'can_manage' => $canManage,
    ];
}

/**
 * @return array<string, mixed>|null
 */
function unitik_find_event(string $id): ?array
{
    $stmt = db()->prepare(
        'SELECT e.id, e.title, e.description, e.event_date, e.organizer_id, e.venue_id,
                v.venue_name AS venue,
                o.full_name AS organizer_name
         FROM events e
         LEFT JOIN venues v ON v.id = e.venue_id
         LEFT JOIN organizers o ON o.id = e.organizer_id
         WHERE e.id = :id
         LIMIT 1'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();

    return $row === false ? null : $row;
}
