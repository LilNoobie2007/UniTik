<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$targetId = isset($body['id']) && is_string($body['id']) ? trim($body['id']) : '';
$targetRole = isset($body['role']) && is_string($body['role']) ? strtolower(trim($body['role'])) : '';

if (!unitik_is_uuid($targetId)) {
    unitik_json(400, ['ok' => false, 'error' => 'A valid organizer id is required.']);
}
if ($targetRole !== 'admin' && $targetRole !== 'organizer') {
    unitik_json(400, ['ok' => false, 'error' => 'Role must be either admin or organizer.']);
}

try {
    $actor = unitik_require_role('admin');

    if (strtolower($actor['id']) === strtolower($targetId) && $targetRole !== 'admin') {
        unitik_json(400, ['ok' => false, 'error' => 'You cannot revoke your own super-admin access.']);
    }

    $nextStatus = $targetRole === 'admin' ? 'admin' : 'Active';

    $stmt = db()->prepare(
        'UPDATE organizers
         SET account_status = :status
         WHERE id = :id
         RETURNING id, full_name, email, account_status'
    );
    $stmt->execute([
        'status' => $nextStatus,
        'id' => $targetId,
    ]);
    $row = $stmt->fetch();

    if ($row === false) {
        unitik_json(404, ['ok' => false, 'error' => 'Organizer account not found.']);
    }

    $row['role'] = unitik_role_from_account('organizer', $row['account_status'] ?? null);
    $row['created_at'] = '';

    unitik_json(200, [
        'ok' => true,
        'user' => unitik_user_payload($row),
    ]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Role could not be updated.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}