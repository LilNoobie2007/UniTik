<?php
declare(strict_types=1);

/**
 * UniTik Core Database Connection Module
 *
 * Establishes a secure PDO connection to the Supabase PostgreSQL instance.
 * Credentials are strictly injected via server environment variables to prevent
 * hardcoded secrets in the repository. Supports connection pooling (port 6543)
 * by toggling emulated prepares.
 */

/**
 * Singleton PDO factory. Ensures only one connection is opened per request lifecycle.
 * 
 * @throws RuntimeException If the database refuses the connection payload.
 * @return PDO The active, connected database instance.
 */
function db(): PDO
{
    static $pdo = null;

    // Return existing instance if already booted
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = unitik_db_config();
    $dsn = sprintf(
        'pgsql:host=%s;port=%d;dbname=%s;sslmode=%s',
        $config['host'],
        $config['port'],
        $config['dbname'],
        $config['sslmode']
    );

    // Supabase's transaction pooler (6543) cannot hold server-side prepares.
    // Emulated prepares must be used when pooling is active.
    $pooled = $config['port'] === 6543;

    try {
        $pdo = new PDO($dsn, $config['user'], $config['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => $pooled,
        ]);
    } catch (PDOException $e) {
        throw new RuntimeException('Database connection failed.', 0, $e);
    }

    return $pdo;
}

/**
 * Resolves database configuration from multiple potential environment variables.
 * Prioritizes full URI strings before falling back to discrete host/user/pass vars.
 *
 * @return array{host: string, port: int, dbname: string, user: string, password: string, sslmode: string}
 */
function unitik_db_config(): array
{
    // Attempt URI resolution first
    $url = getenv('SUPABASE_DB_URL');
    if (!is_string($url) || $url === '') {
        $url = getenv('DATABASE_URL');
    }

    if (is_string($url) && $url !== '') {
        return unitik_config_from_url($url);
    }

    // Fallback to discrete variable resolution
    $host = getenv('SUPABASE_DB_HOST');
    $user = getenv('SUPABASE_DB_USER');
    $password = getenv('SUPABASE_DB_PASSWORD');

    // Halt execution if critical credentials are missing
    if (!is_string($host) || $host === '' || !is_string($user) || $user === '') {
        throw new RuntimeException(
            'Database is not configured. Set SUPABASE_DB_URL or SUPABASE_DB_HOST, SUPABASE_DB_USER, and SUPABASE_DB_PASSWORD.'
        );
    }

    $port = getenv('SUPABASE_DB_PORT');
    $name = getenv('SUPABASE_DB_NAME');
    $ssl = getenv('SUPABASE_DB_SSLMODE');

    return [
        'host' => $host,
        'port' => (is_string($port) && ctype_digit($port)) ? (int) $port : 5432,
        'dbname' => (is_string($name) && $name !== '') ? $name : 'postgres',
        'user' => $user,
        'password' => is_string($password) ? $password : '',
        'sslmode' => unitik_sslmode($host, is_string($ssl) ? $ssl : null),
    ];
}

/**
 * Parses a standard PostgreSQL connection URI into a mapped array.
 * 
 * @param string $url The raw connection string
 * @return array{host: string, port: int, dbname: string, user: string, password: string, sslmode: string}
 */
function unitik_config_from_url(string $url): array
{
    $parts = parse_url($url);
    if ($parts === false || empty($parts['host'])) {
        throw new RuntimeException('Database URL is invalid.');
    }

    $query = [];
    if (!empty($parts['query'])) {
        parse_str((string) $parts['query'], $query);
    }

    $dbname = 'postgres';
    if (!empty($parts['path'])) {
        $trimmed = ltrim((string) $parts['path'], '/');
        if ($trimmed !== '') {
            $dbname = $trimmed;
        }
    }

    $ssl = isset($query['sslmode']) && is_string($query['sslmode']) ? $query['sslmode'] : null;

    return [
        'host' => (string) $parts['host'],
        'port' => isset($parts['port']) ? (int) $parts['port'] : 5432,
        'dbname' => $dbname,
        'user' => isset($parts['user']) ? rawurldecode((string) $parts['user']) : '',
        'password' => isset($parts['pass']) ? rawurldecode((string) $parts['pass']) : '',
        'sslmode' => unitik_sslmode((string) $parts['host'], $ssl),
    ];
}

/**
 * Determines the strictness of the SSL connection required based on host infrastructure.
 * Supabase managed instances strictly require SSL.
 */
function unitik_sslmode(string $host, ?string $explicit): string
{
    $allowed = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'];
    if (is_string($explicit) && in_array($explicit, $allowed, true)) {
        return $explicit;
    }

    $supabase = str_contains($host, 'supabase.co') || str_contains($host, 'supabase.com');
    return $supabase ? 'require' : 'prefer';
}