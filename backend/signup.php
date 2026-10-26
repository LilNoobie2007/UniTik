<?php
declare(strict_types=1);

require_once __DIR__ . '/core/security.php';
require_once __DIR__ . '/core/db.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$fullName = isset($body['full_name']) && is_string($body['full_name']) ? trim($body['full_name']) : '';
$email = isset($body['email']) && is_string($body['email']) ? strtolower(trim($body['email'])) : '';
$password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';

$nameLength = function_exists('mb_strlen') ? mb_strlen($fullName) : strlen($fullName);
if ($fullName === '' || $nameLength > 100) {
    unitik_json(400, ['ok' => false, 'error' => 'Full name must be 1–100 characters.']);
}
if ($email === '' || strlen($email) > 255 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    unitik_json(400, ['ok' => false, 'error' => 'A valid email is required.']);
}
if (strlen($password) < 8 || strlen($password) > 72) {
    unitik_json(400, ['ok' => false, 'error' => 'Password must be 8–72 characters.']);
}

if (isset($body['role']) && $body['role'] !== 'student') {
    unitik_json(403, ['ok' => false, 'error' => 'Public signup can only create a student.']);
}

try {
    $stmt = db()->prepare(
        'INSERT INTO students (id, full_name, email, password_hash)
         VALUES (gen_random_uuid(), :full_name, :email, :password_hash)
         RETURNING id, full_name, email, created_at'
    );
    $stmt->execute([
        'full_name' => $fullName,
        'email' => $email,
        'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    ]);
    $row = $stmt->fetch();
    if ($row === false) {
        unitik_json(500, ['ok' => false, 'error' => 'Account could not be created.']);
    }

    $row['role'] = 'student';
    unitik_establish_session((string) $row['id'], 'student');
    unitik_json(201, ['ok' => true, 'user' => unitik_user_payload($row)]);
} catch (PDOException $e) {
    if ((string) $e->getCode() === '23505') {
        unitik_json(409, ['ok' => false, 'error' => 'An account with that email already exists.']);
    }
    unitik_json(500, ['ok' => false, 'error' => 'Account could not be created.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
