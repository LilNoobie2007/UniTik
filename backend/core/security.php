<?php
declare(strict_types=1);

/**
 * UniTik Security & Access Control Module
 *
 * This file is the absolute core of the Zero-Trust RBAC system. 
 * It intercepts preflight requests, sanitizes origins, parses JSON bodies,
 * and maintains the dual-identity (Student vs. Organizer) HttpOnly sessions.
 * 
 * Security Flags Enforced:
 * - session.cookie_httponly = 1
 * - session.use_strict_mode = 1
 * - session.cookie_samesite = 'Lax'
 */

/**
 * Strict whitelist of allowed frontend origins for CORS.
 */
const UNITIK_ALLOWED_ORIGINS = [
    'http://localhost:3000',
];

/**
 * Injects access-control headers if the request origin matches the whitelist.
 * Required for the Next.js frontend to securely read HTTP status codes.
 */
function unitik_apply_cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!is_string($origin) || !in_array($origin, UNITIK_ALLOWED_ORIGINS, true)) {
        return;
    }

    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
}

/**
 * Intercepts the browser's secret OPTIONS request before it hits business logic.
 * Halts execution and returns an empty 200 OK to prevent frontend fetch failures.
 */
function unitik_handle_preflight(): void
{
    $method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($method !== 'OPTIONS') {
        return;
    }

    unitik_apply_cors();
    http_response_code(200);
    header('Content-Length: 0');
    header('Cache-Control: no-store');
    exit;
}

/**
 * Bootstraps the PHP session with maximum security constraints to prevent
 * session hijacking, XSS exposure, and CSRF attacks.
 */
function unitik_start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    // Determine protocol for the secure flag constraint
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');

    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_httponly', '1');
    ini_set('session.cookie_secure', $https ? '1' : '0');
    ini_set('session.cookie_samesite', 'Lax');

    session_name('UNITIK_SESSION');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'domain' => '',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Lax', // Prevents cross-site credential leakage
    ]);

    session_start();
}

/**
 * Safely extracts and validates the UUID from the active session.
 */
function unitik_current_user_id(): ?string
{
    unitik_start_session();
    $id = $_SESSION['user_id'] ?? null;
    
    // Regular expression gatekeeper for UUID v4 structure
    if (!is_string($id) || !preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $id
    )) {
        return null;
    }

    return strtolower($id);
}

/**
 * Instantiates the dual-identity session following a successful login event.
 * Regenerates the session ID to prevent fixation attacks.
 */
function unitik_establish_session(string $userId, string $kind): void
{
    if (!unitik_is_uuid($userId) || ($kind !== 'student' && $kind !== 'organizer')) {
        throw new InvalidArgumentException('Invalid account.');
    }

    unitik_start_session();
    session_regenerate_id(true);
    $_SESSION = [
        'user_id' => strtolower($userId),
        'account_kind' => $kind,
    ];
}

/**
 * Retrieves the base table designation (student vs organizer) from the session state.
 */
function unitik_account_kind(): ?string
{
    unitik_start_session();
    $kind = $_SESSION['account_kind'] ?? null;
    if ($kind === 'student' || $kind === 'organizer') {
        return $kind;
    }

    return null;
}

/**
 * Evaluates the hierarchical RBAC role based on table origin and admin flags.
 */
function unitik_role_from_account(string $kind, mixed $accountStatus): string
{
    if ($kind === 'student') {
        return 'student';
    }
    if (is_string($accountStatus) && strtolower($accountStatus) === 'admin') {
        return 'admin'; // Organizer row explicitly elevated to Super-Admin
    }

    return 'organizer';
}

/**
 * Hydrates the user profile from the database based on their session identity.
 * Adapts the query dynamically between `students` and `organizers` tables.
 *
 * @return array{id: string, full_name: string, email: string, role: string, created_at: string}|null
 */
function unitik_session_user(): ?array
{
    $id = unitik_current_user_id();
    $kind = unitik_account_kind();
    
    if ($id === null || $kind === null) {
        return null;
    }
    if (!function_exists('db')) {
        throw new RuntimeException('Database is not loaded.');
    }

    // Branching query logic based on dual-identity architecture
    if ($kind === 'student') {
        $stmt = db()->prepare(
            'SELECT id, full_name, email, created_at, account_status
             FROM students
             WHERE id = :id
             LIMIT 1'
        );
    } else {
        $stmt = db()->prepare(
            'SELECT id, full_name, email, account_status
             FROM organizers
             WHERE id = :id
             LIMIT 1'
        );
    }
    
    $stmt->execute(['id' => $id]);
    $row = $stmt->fetch();
    
    if ($row === false) {
        return null; // Identity mismatch or deleted account
    }

    $created = $row['created_at'] ?? '';

    return [
        'id' => (string) $row['id'],
        'full_name' => (string) $row['full_name'],
        'email' => (string) $row['email'],
        'role' => unitik_role_from_account($kind, $row['account_status'] ?? null),
        'created_at' => $created === null ? '' : (string) $created,
    ];
}

/**
 * Safely annihilates the session and destroys the active HttpOnly cookie.
 */
function unitik_destroy_session(): void
{
    unitik_start_session();
    $_SESSION = [];

    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000, // Enforce immediate historical expiration
        'path' => $params['path'] !== '' ? $params['path'] : '/',
        'domain' => $params['domain'],
        'secure' => (bool) $params['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_destroy();
}

/**
 * Formats a raw database row into a strictly typed generic user array.
 * 
 * @param array<string, mixed> $row
 * @return array{id: string, full_name: string, email: string, role: string, created_at: string}
 */
function unitik_user_payload(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'full_name' => (string) $row['full_name'],
        'email' => (string) $row['email'],
        'role' => (string) $row['role'],
        'created_at' => isset($row['created_at']) && $row['created_at'] !== null ? (string) $row['created_at'] : '',
    ];
}

/**
 * Zero-Trust Barrier: Enforces the existence of an active, authenticated user.
 * Disconnects the request with 401 Unauthorized if the session is absent.
 *
 * @return array{id: string, full_name: string, email: string, role: string, created_at: string}
 */
function unitik_require_user(): array
{
    $user = unitik_session_user();
    if ($user === null) {
        unitik_json(401, ['ok' => false, 'error' => 'Not signed in.']);
    }

    return $user;
}

/**
 * Zero-Trust Barrier: Verifies the session holds a specific RBAC role.
 *
 * @return array{id: string, full_name: string, email: string, role: string, created_at: string}
 */
function unitik_require_role(string $role): array
{
    $user = unitik_require_user();
    if ($user['role'] !== $role) {
        unitik_json(403, ['ok' => false, 'error' => 'You do not have access to this.']);
    }

    return $user;
}

/**
 * Internal logic check to differentiate between standard students and elevated staff.
 */
function unitik_is_planner(array $user): bool
{
    return $user['role'] === 'organizer' || $user['role'] === 'admin';
}

/**
 * Zero-Trust Barrier: Protects critical event creation and modification routes.
 * Students are violently rejected with 403 Forbidden.
 *
 * @return array{id: string, full_name: string, email: string, role: string, created_at: string}
 */
function unitik_require_planner(): array
{
    $user = unitik_require_user();
    if (!unitik_is_planner($user)) {
        unitik_json(403, ['ok' => false, 'error' => 'Only an event planner can do that.']);
    }

    return $user;
}

/**
 * Zero-Trust Barrier: Specifically scopes access to the base student cohort.
 *
 * @return array{id: string, full_name: string, email: string, role: string, created_at: string}
 */
function unitik_require_student(): array
{
    $user = unitik_require_user();
    if ($user['role'] !== 'student') {
        unitik_json(403, ['ok' => false, 'error' => 'Only a student can do that.']);
    }

    return $user;
}

/**
 * Evaluates execution context to see if the requesting user holds edit rights
 * over a specific event ID based on database ownership structures.
 */
function unitik_can_manage_event(array $user, string $organizerId): bool
{
    if ($user['role'] === 'admin') {
        return true; // Super-Admin override
    }

    // Direct string comparison of the active session ID versus the event's foreign key
    return $user['role'] === 'organizer' && strtolower($user['id']) === strtolower($organizerId);
}

/**
 * Type-safety gatekeeper for UUID v4 structures to prevent SQL injection.
 */
function unitik_is_uuid(string $value): bool
{
    return preg_match(
        '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i',
        $value
    ) === 1;
}

/**
 * Halts execution if the incoming request does not match the expected HTTP Verb.
 */
function unitik_require_method(string $method): void
{
    $expected = strtoupper($method);
    $actual = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    if ($actual === $expected) {
        return;
    }

    header('Allow: ' . $expected);
    unitik_json(405, ['ok' => false, 'error' => 'Method not allowed.']);
}

/**
 * Parses and validates the raw JSON body buffer into an associative array.
 * 
 * @return array<string, mixed>
 */
function unitik_read_json(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    try {
        $decoded = json_decode($raw, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        unitik_json(400, ['ok' => false, 'error' => 'Invalid JSON payload.']);
    }

    if (!is_array($decoded)) {
        unitik_json(400, ['ok' => false, 'error' => 'JSON payload must be an object.']);
    }

    return $decoded;
}

/**
 * Standardizes the backend response architecture. Flushes headers and encodes payload.
 * 
 * @param array<string, mixed> $payload
 */
function unitik_json(int $status, array $payload): never
{
    if (!headers_sent()) {
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store'); // Prevents browser caching of sensitive data
        header('X-Content-Type-Options: nosniff');
    }

    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Meta-wrapper invoked at the start of every script. Evaluates CORS, preflight, 
 * session hydration, and JSON body parsing sequentially.
 *
 * @return array<string, mixed>
 */
function unitik_bootstrap(bool $readBody = true): array
{
    unitik_apply_cors();
    unitik_handle_preflight();

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');

    unitik_start_session();

    return $readBody ? unitik_read_json() : [];
}