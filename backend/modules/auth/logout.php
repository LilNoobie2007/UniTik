<?php
declare(strict_types=1);

/*
 * File: backend/modules/auth/logout.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Ends the PHP session. The browser profile is not an identity.
 */

require_once __DIR__ . '/../../core/security.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

startAuthSession();
$_SESSION = [];

if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', [
        'expires' => time() - 42000,
        'path' => $params['path'] ?: '/',
        'domain' => $params['domain'] ?? '',
        'secure' => (bool) $params['secure'],
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

session_destroy();

jsonResponse(200, ['status' => 'success', 'data' => ['signed_out' => true]]);
