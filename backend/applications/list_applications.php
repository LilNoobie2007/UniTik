<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';

unitik_bootstrap(false);
unitik_require_method('GET');

try {
    unitik_require_role('admin');

    $stmt = db()->query(
        'SELECT a.id, a.corporate_details, a.id_card_path, a.status, a.created_at,
                s.full_name, s.email
         FROM organizer_applications a
         JOIN students s ON s.id = a.user_id
         WHERE a.status = \'pending\'
         ORDER BY a.created_at ASC'
    );
    if ($stmt === false) {
        unitik_json(500, ['ok' => false, 'error' => 'Applications could not be loaded.']);
    }

    $applications = [];
    foreach ($stmt as $row) {
        if (!is_array($row)) {
            continue;
        }
        $applications[] = [
            'id' => (string) $row['id'],
            'full_name' => (string) $row['full_name'],
            'email' => (string) $row['email'],
            'corporate_details' => (string) $row['corporate_details'],
            'id_card_path' => (string) $row['id_card_path'],
            'status' => (string) $row['status'],
            'created_at' => (string) $row['created_at'],
        ];
    }

    unitik_json(200, ['ok' => true, 'applications' => $applications]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Applications could not be loaded.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
