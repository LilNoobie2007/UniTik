<?php
declare(strict_types=1);

function unitik_validate_optional_url(mixed $raw, string $label): ?string
{
    if (!is_string($raw)) {
        return null;
    }
    $trimmed = trim($raw);
    if ($trimmed === '') {
        return null;
    }
    if (strlen($trimmed) > 2048 || filter_var($trimmed, FILTER_VALIDATE_URL) === false) {
        unitik_json(400, ['ok' => false, 'error' => $label . ' must be a valid http(s) URL.']);
    }
    $scheme = strtolower((string) parse_url($trimmed, PHP_URL_SCHEME));
    if ($scheme !== 'http' && $scheme !== 'https') {
        unitik_json(400, ['ok' => false, 'error' => $label . ' must start with http:// or https://.']);
    }

    return $trimmed;
}

/**
 * @param array<string, mixed> $body
 * @return array{
 *   title: string,
 *   description: ?string,
 *   event_date: string,
 *   venue: string,
 *   venue_url: ?string,
 *   image_url: ?string,
 *   capacity: int,
 *   max_tickets_per_user: int,
 *   ticket_price: string,
 *   tiers: list<array{id: ?string, name: string, price: string, capacity: int, sort_order: int}>
 * }
 */
function unitik_event_input(array $body): array
{
    $title = isset($body['title']) && is_string($body['title']) ? trim($body['title']) : '';
    $venue = isset($body['venue']) && is_string($body['venue']) ? trim($body['venue']) : '';
    $description = isset($body['description']) && is_string($body['description']) ? trim($body['description']) : '';
    $rawDate = isset($body['event_date']) && is_string($body['event_date']) ? trim($body['event_date']) : '';

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

    $venueUrl = unitik_validate_optional_url($body['venue_url'] ?? null, 'Venue URL');
    $imageUrl = unitik_validate_optional_url($body['image_url'] ?? null, 'Event image URL');

    $maxPerUser = 5;
    if (isset($body['max_tickets_per_user']) && $body['max_tickets_per_user'] !== '') {
        if (!is_numeric($body['max_tickets_per_user'])) {
            unitik_json(400, ['ok' => false, 'error' => 'Max tickets per student must be a number between 1 and 10.']);
        }
        $maxPerUser = (int) $body['max_tickets_per_user'];
        if ($maxPerUser < 1 || $maxPerUser > 10) {
            unitik_json(400, ['ok' => false, 'error' => 'Max tickets per student must be between 1 and 10.']);
        }
    }

    $tiers = [];
    if (isset($body['tiers']) && is_array($body['tiers']) && count($body['tiers']) > 0) {
        if (count($body['tiers']) > 10) {
            unitik_json(400, ['ok' => false, 'error' => 'An event can have at most 10 ticket tiers.']);
        }
        $seenNames = [];
        foreach (array_values($body['tiers']) as $index => $rawTier) {
            if (!is_array($rawTier)) {
                unitik_json(400, ['ok' => false, 'error' => 'Invalid ticket tier format.']);
            }
            $tierId = isset($rawTier['id']) && is_string($rawTier['id']) && trim($rawTier['id']) !== ''
                ? strtolower(trim($rawTier['id']))
                : null;
            if ($tierId !== null && !unitik_is_uuid($tierId)) {
                unitik_json(400, ['ok' => false, 'error' => 'Invalid ticket tier id.']);
            }

            $tierName = isset($rawTier['name']) && is_string($rawTier['name']) ? trim($rawTier['name']) : '';
            $tierNameLen = function_exists('mb_strlen') ? mb_strlen($tierName) : strlen($tierName);
            if ($tierName === '' || $tierNameLen > 80) {
                unitik_json(400, ['ok' => false, 'error' => 'Each ticket tier needs a name (1–80 characters).']);
            }
            $nameKey = strtolower($tierName);
            if (isset($seenNames[$nameKey])) {
                unitik_json(400, ['ok' => false, 'error' => 'Ticket tier names must be unique per event.']);
            }
            $seenNames[$nameKey] = true;

            $rawPrice = $rawTier['price'] ?? 0;
            if ($rawPrice === '' || $rawPrice === null) {
                $rawPrice = 0;
            }
            if (!is_numeric($rawPrice) || (float) $rawPrice < 0 || (float) $rawPrice > 100000) {
                unitik_json(400, ['ok' => false, 'error' => 'Tier price must be between 0 and 100000.']);
            }

            $rawCap = $rawTier['capacity'] ?? null;
            if (!is_numeric($rawCap)) {
                unitik_json(400, ['ok' => false, 'error' => 'Each ticket tier needs a valid seat capacity.']);
            }
            $tierCap = (int) $rawCap;
            if ($tierCap < 1 || $tierCap > 10000) {
                unitik_json(400, ['ok' => false, 'error' => 'Tier capacity must be between 1 and 10000 seats.']);
            }

            $tiers[] = [
                'id' => $tierId,
                'name' => $tierName,
                'price' => number_format((float) $rawPrice, 2, '.', ''),
                'capacity' => $tierCap,
                'sort_order' => $index,
            ];
        }
    } else {
        $priceRaw = $body['ticket_price'] ?? 0;
        if ($priceRaw === '' || $priceRaw === null) {
            $priceRaw = 0;
        }
        if (!is_numeric($priceRaw) || (float) $priceRaw < 0 || (float) $priceRaw > 100000) {
            unitik_json(400, ['ok' => false, 'error' => 'Ticket price must be a non-negative number.']);
        }
        $fallbackCap = 200;
        if (isset($body['capacity']) && $body['capacity'] !== '') {
            if (!is_numeric($body['capacity'])) {
                unitik_json(400, ['ok' => false, 'error' => 'Capacity must be a valid integer.']);
            }
            $fallbackCap = (int) $body['capacity'];
            if ($fallbackCap < 1 || $fallbackCap > 10000) {
                unitik_json(400, ['ok' => false, 'error' => 'Capacity must be between 1 and 10000 seats.']);
            }
        }
        $tiers[] = [
            'id' => null,
            'name' => 'General Admission',
            'price' => number_format((float) $priceRaw, 2, '.', ''),
            'capacity' => $fallbackCap,
            'sort_order' => 0,
        ];
    }

    $totalCapacity = 0;
    $lowestPrice = null;
    foreach ($tiers as $tier) {
        $totalCapacity += $tier['capacity'];
        $p = (float) $tier['price'];
        if ($lowestPrice === null || $p < $lowestPrice) {
            $lowestPrice = $p;
        }
    }

    return [
        'title' => $title,
        'description' => $description === '' ? null : $description,
        'event_date' => $when->format(DateTimeInterface::ATOM),
        'venue' => $venue,
        'venue_url' => $venueUrl,
        'image_url' => $imageUrl,
        'capacity' => $totalCapacity,
        'max_tickets_per_user' => $maxPerUser,
        'ticket_price' => number_format($lowestPrice ?? 0.0, 2, '.', ''),
        'tiers' => $tiers,
    ];
}

function unitik_resolve_venue(string $name, ?string $venueUrl = null, int $capacity = 200): string
{
    $pdo = db();
    $stmt = $pdo->prepare(
        'SELECT id, venue_url FROM venues WHERE lower(venue_name) = lower(:name) LIMIT 1'
    );
    $stmt->execute(['name' => $name]);
    $existing = $stmt->fetch();
    if ($existing !== false) {
        $venueId = (string) $existing['id'];
        if ($venueUrl !== null && $venueUrl !== (string) ($existing['venue_url'] ?? '')) {
            $update = $pdo->prepare('UPDATE venues SET venue_url = :url WHERE id = :id');
            $update->execute(['url' => $venueUrl, 'id' => $venueId]);
        }
        return $venueId;
    }

    $insert = $pdo->prepare(
        'INSERT INTO venues (id, venue_name, venue_url, max_capacity)
         VALUES (gen_random_uuid(), :name, :venue_url, :max_capacity)
         RETURNING id'
    );
    $insert->execute([
        'name' => $name,
        'venue_url' => $venueUrl,
        'max_capacity' => max(1, $capacity),
    ]);
    $created = $insert->fetch();

    if ($created === false) {
        throw new RuntimeException('Venue could not be saved.');
    }

    return (string) $created['id'];
}

/**
 * @param list<array{id: ?string, name: string, price: string, capacity: int, sort_order: int}> $tiers
 */
function unitik_sync_event_tiers(PDO $pdo, string $eventId, array $tiers): void
{
    $existingStmt = $pdo->prepare(
        'SELECT id, name FROM ticket_tiers WHERE event_id = :event_id FOR UPDATE'
    );
    $existingStmt->execute(['event_id' => $eventId]);
    $existingById = [];
    foreach ($existingStmt->fetchAll() as $row) {
        if (is_array($row)) {
            $existingById[strtolower((string) $row['id'])] = (string) $row['name'];
        }
    }

    $soldStmt = $pdo->prepare(
        'SELECT tier_id, COUNT(*) AS sold
         FROM tickets
         WHERE event_id = :event_id AND tier_id IS NOT NULL
         GROUP BY tier_id'
    );
    $soldStmt->execute(['event_id' => $eventId]);
    $soldByTier = [];
    foreach ($soldStmt->fetchAll() as $row) {
        if (is_array($row)) {
            $soldByTier[strtolower((string) $row['tier_id'])] = (int) $row['sold'];
        }
    }

    $keptIds = [];
    foreach ($tiers as $tier) {
        if ($tier['id'] !== null && isset($existingById[$tier['id']])) {
            $keptIds[$tier['id']] = true;
        }
    }

    foreach ($existingById as $existingId => $existingName) {
        if (isset($keptIds[$existingId])) {
            continue;
        }
        $sold = $soldByTier[$existingId] ?? 0;
        if ($sold > 0) {
            throw new DomainException(
                'Cannot remove tier "' . $existingName . '" because ' . $sold . ' ticket(s) have already been booked.'
            );
        }
        $del = $pdo->prepare('DELETE FROM ticket_tiers WHERE id = :id AND event_id = :event_id');
        $del->execute(['id' => $existingId, 'event_id' => $eventId]);
    }

    $updateStmt = $pdo->prepare(
        'UPDATE ticket_tiers
         SET name = :name, price = :price, capacity = :capacity, sort_order = :sort_order
         WHERE id = :id AND event_id = :event_id'
    );
    $insertStmt = $pdo->prepare(
        'INSERT INTO ticket_tiers (id, event_id, name, price, capacity, sort_order)
         VALUES (gen_random_uuid(), :event_id, :name, :price, :capacity, :sort_order)'
    );

    foreach ($tiers as $tier) {
        if ($tier['id'] !== null && isset($existingById[$tier['id']])) {
            $sold = $soldByTier[$tier['id']] ?? 0;
            if ($tier['capacity'] < $sold) {
                throw new DomainException(
                    'Capacity for "' . $tier['name'] . '" cannot be below already booked seats (' . $sold . ').'
                );
            }
            $updateStmt->execute([
                'id' => $tier['id'],
                'event_id' => $eventId,
                'name' => $tier['name'],
                'price' => $tier['price'],
                'capacity' => $tier['capacity'],
                'sort_order' => $tier['sort_order'],
            ]);
        } else {
            $insertStmt->execute([
                'event_id' => $eventId,
                'name' => $tier['name'],
                'price' => $tier['price'],
                'capacity' => $tier['capacity'],
                'sort_order' => $tier['sort_order'],
            ]);
        }
    }
}

/**
 * @param list<string> $eventIds
 * @return array<string, list<array{id: string, name: string, price: string, capacity: int, sold: int, remaining: int, sort_order: int}>>
 */
function unitik_fetch_tiers_for_events(array $eventIds): array
{
    if (count($eventIds) === 0) {
        return [];
    }

    $placeholders = implode(', ', array_fill(0, count($eventIds), '?'));
    $stmt = db()->prepare(
        "SELECT tt.id, tt.event_id, tt.name, tt.price, tt.capacity, tt.sort_order,
                COUNT(t.id) AS sold
         FROM ticket_tiers tt
         LEFT JOIN tickets t ON t.tier_id = tt.id
         WHERE tt.event_id IN ({$placeholders})
         GROUP BY tt.id, tt.event_id, tt.name, tt.price, tt.capacity, tt.sort_order
         ORDER BY tt.sort_order ASC, tt.created_at ASC"
    );
    $stmt->execute(array_values($eventIds));

    $byEvent = [];
    foreach ($stmt->fetchAll() as $row) {
        if (!is_array($row)) {
            continue;
        }
        $eid = (string) $row['event_id'];
        $capacity = (int) $row['capacity'];
        $sold = (int) $row['sold'];
        $byEvent[$eid][] = [
            'id' => (string) $row['id'],
            'name' => (string) $row['name'],
            'price' => number_format((float) $row['price'], 2, '.', ''),
            'capacity' => $capacity,
            'sold' => $sold,
            'remaining' => max(0, $capacity - $sold),
            'sort_order' => (int) $row['sort_order'],
        ];
    }

    return $byEvent;
}

/**
 * @param array<string, mixed> $row
 * @param list<array{id: string, name: string, price: string, capacity: int, sold: int, remaining: int, sort_order: int}> $tiers
 * @return array<string, mixed>
 */
function unitik_event_payload(array $row, bool $canManage, array $tiers = []): array
{
    $venue = isset($row['venue']) && $row['venue'] !== null && $row['venue'] !== ''
        ? (string) $row['venue']
        : 'To be announced';

    $totalCapacity = 0;
    $totalSold = 0;
    foreach ($tiers as $tier) {
        $totalCapacity += $tier['capacity'];
        $totalSold += $tier['sold'];
    }

    if ($totalCapacity === 0 && isset($row['venue_capacity']) && $row['venue_capacity'] !== null) {
        $totalCapacity = (int) $row['venue_capacity'];
    }

    return [
        'id' => (string) $row['id'],
        'title' => (string) $row['title'],
        'description' => isset($row['description']) && $row['description'] !== null ? (string) $row['description'] : null,
        'event_date' => isset($row['event_date']) && $row['event_date'] !== null ? (string) $row['event_date'] : '',
        'venue' => $venue,
        'venue_url' => isset($row['venue_url']) && $row['venue_url'] !== null && $row['venue_url'] !== ''
            ? (string) $row['venue_url']
            : null,
        'image_url' => isset($row['image_url']) && $row['image_url'] !== null && $row['image_url'] !== ''
            ? (string) $row['image_url']
            : null,
        'capacity' => $totalCapacity,
        'sold_count' => $totalSold,
        'remaining_seats' => max(0, $totalCapacity - $totalSold),
        'max_tickets_per_user' => isset($row['max_tickets_per_user']) && $row['max_tickets_per_user'] !== null
            ? (int) $row['max_tickets_per_user']
            : 5,
        'organizer_name' => isset($row['organizer_name']) && $row['organizer_name'] !== null
            ? (string) $row['organizer_name']
            : 'Campus',
        'can_manage' => $canManage,
        'tiers' => $tiers,
    ];
}

/**
 * @return array<string, mixed>|null
 */
function unitik_find_event(string $id): ?array
{
    $stmt = db()->prepare(
        'SELECT e.id, e.title, e.description, e.event_date, e.organizer_id, e.venue_id,
                e.image_url, e.max_tickets_per_user,
                v.venue_name AS venue, v.venue_url, v.max_capacity AS venue_capacity,
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