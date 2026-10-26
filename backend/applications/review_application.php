<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$id = isset($body['id']) && is_string($body['id']) ? strtolower(trim($body['id'])) : '';
$action = isset($body['action']) && is_string($body['action']) ? strtolower(trim($body['action'])) : '';

if (!unitik_is_uuid($id)) {
    unitik_json(400, ['ok' => false, 'error' => 'A valid application id is required.']);
}
if ($action !== 'approve' && $action !== 'reject') {
    unitik_json(400, ['ok' => false, 'error' => 'Action must be approve or reject.']);
}

try {
    $admin = unitik_require_role('admin');
    $pdo = db();
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'SELECT a.id, a.status, a.corporate_details,
                s.full_name, s.email, s.password_hash
         FROM organizer_applications a
         JOIN students s ON s.id = a.user_id
         WHERE a.id = :id
         FOR UPDATE OF a'
    );
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    if ($row === false) {
        $pdo->rollBack();
        unitik_json(404, ['ok' => false, 'error' => 'Application not found.']);
    }
    if ((string) $row['status'] !== 'pending') {
        $pdo->rollBack();
        unitik_json(409, ['ok' => false, 'error' => 'This application has already been reviewed.']);
    }

    if ($action === 'approve') {
        $committee = (string) $row['corporate_details'];
        if (function_exists('mb_substr')) {
            $committee = mb_substr($committee, 0, 200);
        } else {
            $committee = substr($committee, 0, 200);
        }

        $insert = $pdo->prepare(
            'INSERT INTO organizers (id, full_name, email, password_hash, committee_name)
             VALUES (gen_random_uuid(), :full_name, :email, :password_hash, :committee_name)'
        );
        try {
            $insert->execute([
                'full_name' => $row['full_name'],
                'email' => $row['email'],
                'password_hash' => $row['password_hash'],
                'committee_name' => $committee,
            ]);
        } catch (PDOException $e) {
            $pdo->rollBack();
            if ((string) $e->getCode() === '23505') {
                unitik_json(409, ['ok' => false, 'error' => 'This email is already a planner.']);
            }
            throw $e;
        }
    }

    $update = $pdo->prepare(
        'UPDATE organizer_applications
         SET status = :status, reviewed_by = :reviewed_by, updated_at = CURRENT_TIMESTAMP
         WHERE id = :id'
    );
    $update->execute([
        'status' => $action === 'approve' ? 'approved' : 'rejected',
        'reviewed_by' => $admin['id'],
        'id' => $id,
    ]);

    $pdo->commit();
    unitik_json(200, [
        'ok' => true,
        'status' => $action === 'approve' ? 'approved' : 'rejected',
    ]);
} catch (PDOException) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    unitik_json(500, ['ok' => false, 'error' => 'The application could not be reviewed.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
