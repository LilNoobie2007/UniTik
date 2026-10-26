<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';

unitik_bootstrap(false);
unitik_require_method('GET');

try {
    unitik_require_role('admin');

    $students = db()->query(
        'SELECT id, full_name, email, created_at
         FROM students
         ORDER BY created_at DESC NULLS LAST'
    );
    $organizers = db()->query(
        'SELECT id, full_name, email, account_status
         FROM organizers
         ORDER BY full_name ASC'
    );
    if ($students === false || $organizers === false) {
        unitik_json(500, ['ok' => false, 'error' => 'Users could not be loaded.']);
    }

    $users = [];
    foreach ($students as $row) {
        if (!is_array($row)) {
            continue;
        }
        $row['role'] = 'student';
        $users[] = unitik_user_payload($row);
    }
    foreach ($organizers as $row) {
        if (!is_array($row)) {
            continue;
        }
        $row['role'] = unitik_role_from_account('organizer', $row['account_status'] ?? null);
        $row['created_at'] = '';
        $users[] = unitik_user_payload($row);
    }

    unitik_json(200, ['ok' => true, 'users' => $users]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Users could not be loaded.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
