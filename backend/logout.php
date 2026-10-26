<?php
declare(strict_types=1);

require_once __DIR__ . '/core/security.php';

unitik_bootstrap(false);
unitik_require_method('POST');
unitik_destroy_session();

unitik_json(200, ['ok' => true]);
