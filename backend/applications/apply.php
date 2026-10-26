<?php
declare(strict_types=1);

require_once __DIR__ . '/../core/security.php';
require_once __DIR__ . '/../core/db.php';

unitik_bootstrap(false);
unitik_require_method('POST');

$details = isset($_POST['corporate_details']) && is_string($_POST['corporate_details'])
    ? trim($_POST['corporate_details'])
    : '';
$detailsLength = function_exists('mb_strlen') ? mb_strlen($details) : strlen($details);
if ($details === '' || $detailsLength > 4000) {
    unitik_json(400, ['ok' => false, 'error' => 'Committee details must be 1–4000 characters.']);
}

$file = $_FILES['id_card'] ?? null;
if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
    unitik_json(400, ['ok' => false, 'error' => 'An ID card file is required.']);
}
if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    unitik_json(400, ['ok' => false, 'error' => 'The ID card could not be uploaded.']);
}
if (!is_string($file['tmp_name'] ?? null) || !is_uploaded_file($file['tmp_name'])) {
    unitik_json(400, ['ok' => false, 'error' => 'The ID card could not be uploaded.']);
}
if (($file['size'] ?? 0) > 5 * 1024 * 1024) {
    unitik_json(400, ['ok' => false, 'error' => 'ID card must be 5 MB or smaller.']);
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
$extensions = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'application/pdf' => 'pdf',
];
if (!is_string($mime) || !isset($extensions[$mime])) {
    unitik_json(400, ['ok' => false, 'error' => 'ID card must be a JPEG, PNG, WebP, or PDF.']);
}

try {
    $student = unitik_require_student();

    $already = db()->prepare('SELECT id FROM organizers WHERE lower(email) = lower(:email) LIMIT 1');
    $already->execute(['email' => $student['email']]);
    if ($already->fetch() !== false) {
        unitik_json(409, ['ok' => false, 'error' => 'This account is already a planner.']);
    }

    $dir = dirname(__DIR__) . '/uploads';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        unitik_json(500, ['ok' => false, 'error' => 'Upload storage is not available.']);
    }

    $stored = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
    $destination = $dir . DIRECTORY_SEPARATOR . $stored;
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        unitik_json(500, ['ok' => false, 'error' => 'The ID card could not be saved.']);
    }
    chmod($destination, 0644);

    try {
        $insert = db()->prepare(
            'INSERT INTO organizer_applications (id, user_id, corporate_details, id_card_path)
             VALUES (gen_random_uuid(), :user_id, :corporate_details, :id_card_path)
             RETURNING id, status, created_at'
        );
        $insert->execute([
            'user_id' => $student['id'],
            'corporate_details' => $details,
            'id_card_path' => 'uploads/' . $stored,
        ]);
    } catch (PDOException $e) {
        unlink($destination);
        if ((string) $e->getCode() === '23505') {
            unitik_json(409, ['ok' => false, 'error' => 'You already have an application waiting for review.']);
        }
        throw $e;
    }

    $row = $insert->fetch();
    if ($row === false) {
        unlink($destination);
        unitik_json(500, ['ok' => false, 'error' => 'Application could not be saved.']);
    }

    unitik_json(201, [
        'ok' => true,
        'application' => [
            'id' => (string) $row['id'],
            'status' => (string) $row['status'],
            'created_at' => (string) $row['created_at'],
        ],
    ]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Application could not be saved.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
