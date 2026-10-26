<?php
declare(strict_types=1);

require_once __DIR__ . '/core/security.php';
require_once __DIR__ . '/core/db.php';

unitik_bootstrap(false);
unitik_require_method('GET');

try {
    $user = unitik_require_user();
    unitik_json(200, ['ok' => true, 'user' => $user]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Profile could not be loaded.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
