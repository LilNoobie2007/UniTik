<?php
declare(strict_types=1);

/**
 * UniTik database connection.
 *
 * Supabase PostgreSQL via PDO. Credentials are read from the environment only:
 *   SUPABASE_DB_URL or DATABASE_URL
 *     postgresql://user:password@host:5432/postgres?sslmode=require
 *   or discrete vars: SUPABASE_DB_HOST, SUPABASE_DB_PORT, SUPABASE_DB_NAME,
 *   SUPABASE_DB_USER, SUPABASE_DB_PASSWORD, SUPABASE_DB_SSLMODE.
 */

function db(): PDO
{
    static $pdo = null;

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
 * @return array{host: string, port: int, dbname: string, user: string, password: string, sslmode: string}
 */
function unitik_db_config(): array
{
    $url = getenv('SUPABASE_DB_URL');
    if (!is_string($url) || $url === '') {
        $url = getenv('DATABASE_URL');
    }

    if (is_string($url) && $url !== '') {
        return unitik_config_from_url($url);
    }

    $host = getenv('SUPABASE_DB_HOST');
    $user = getenv('SUPABASE_DB_USER');
    $password = getenv('SUPABASE_DB_PASSWORD');

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

function unitik_sslmode(string $host, ?string $explicit): string
{
    $allowed = ['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full'];
    if (is_string($explicit) && in_array($explicit, $allowed, true)) {
        return $explicit;
    }

    $supabase = str_contains($host, 'supabase.co') || str_contains($host, 'supabase.com');
    return $supabase ? 'require' : 'prefer';
}
