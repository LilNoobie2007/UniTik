<?php
declare(strict_types=1);

require_once __DIR__ . '/core/security.php';
require_once __DIR__ . '/core/db.php';

$body = unitik_bootstrap();
unitik_require_method('POST');

$email = isset($body['email']) && is_string($body['email']) ? strtolower(trim($body['email'])) : '';
$password = isset($body['password']) && is_string($body['password']) ? $body['password'] : '';

if ($email === '' || $password === '') {
    unitik_json(400, ['ok' => false, 'error' => 'Email and password are required.']);
}

const UNITIK_DUMMY_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

/**
 * @return array<string, mixed>|null
 */
function unitik_find_login(string $table, string $email): ?array
{
    $sql = $table === 'students'
        ? 'SELECT id, full_name, email, password_hash, created_at, account_status
           FROM students WHERE lower(email) = :email LIMIT 1'
        : 'SELECT id, full_name, email, password_hash, account_status
           FROM organizers WHERE lower(email) = :email LIMIT 1';
    $stmt = db()->prepare($sql);
    $stmt->execute(['email' => $email]);
    $row = $stmt->fetch();

    return $row === false ? null : $row;
}

try {
    $student = unitik_find_login('students', $email);
    $organizer = unitik_find_login('organizers', $email);
    $row = null;
    $kind = null;

    if (is_array($organizer) && isset($organizer['password_hash']) && is_string($organizer['password_hash'])
        && password_verify($password, $organizer['password_hash'])) {
        $row = $organizer;
        $kind = 'organizer';
    } elseif (is_array($student) && isset($student['password_hash']) && is_string($student['password_hash'])
        && password_verify($password, $student['password_hash'])) {
        $row = $student;
        $kind = 'student';
    } else {
        $pad = is_array($student) && is_string($student['password_hash'] ?? null)
            ? $student['password_hash']
            : (is_array($organizer) && is_string($organizer['password_hash'] ?? null)
                ? $organizer['password_hash']
                : UNITIK_DUMMY_HASH);
        password_verify($password, $pad);
        unitik_json(401, ['ok' => false, 'error' => 'Invalid email or password.']);
    }

    $status = strtolower((string) ($row['account_status'] ?? ''));
    if (in_array($status, ['locked', 'suspended', 'disabled'], true)) {
        unitik_json(403, ['ok' => false, 'error' => 'This account is not active.']);
    }

    $hash = (string) $row['password_hash'];
    if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
        $table = $kind === 'student' ? 'students' : 'organizers';
        $update = db()->prepare("UPDATE {$table} SET password_hash = :password_hash WHERE id = :id");
        $update->execute([
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'id' => $row['id'],
        ]);
    }

    $touch = db()->prepare(
        'UPDATE ' . ($kind === 'student' ? 'students' : 'organizers') . '
         SET last_login_at = CURRENT_TIMESTAMP, failed_login_attempts = 0
         WHERE id = :id'
    );
    $touch->execute(['id' => $row['id']]);

    $row['role'] = unitik_role_from_account($kind, $row['account_status'] ?? null);
    unitik_establish_session((string) $row['id'], $kind);
    unitik_json(200, ['ok' => true, 'user' => unitik_user_payload($row)]);
} catch (PDOException) {
    unitik_json(500, ['ok' => false, 'error' => 'Sign in could not be completed.']);
} catch (RuntimeException) {
    unitik_json(500, ['ok' => false, 'error' => 'Database connection failed.']);
}
