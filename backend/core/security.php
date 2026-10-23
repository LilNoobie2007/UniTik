<?php
declare(strict_types=1);

/*
 * File: backend/core/security.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Text fields only. Do not run passwords through htmlspecialchars —
 * that changes the secret before password_hash / password_verify.
 */

function sanitizeText(mixed $value): string
{
    $text = is_string($value) ? $value : '';
    $text = trim(stripslashes($text));
    return htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function readJsonBody(): array
{
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function jsonResponse(int $statusCode, array $payload): never
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

function allowCors(): void
{
    $origin = getenv('ALLOWED_ORIGIN') ?: '';
    if ($origin !== '') {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Access-Control-Allow-Credentials: true');
        header('Vary: Origin');
    }
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function startAuthSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function requireActiveUser(PDO $pdo): array
{
    startAuthSession();
    $userId = $_SESSION['user_id'] ?? '';
    if (!is_string($userId) || $userId === '') {
        jsonResponse(401, ['status' => 'error', 'message' => 'Sign in required.']);
    }

    $stmt = $pdo->prepare(
        'SELECT id, full_name, role, account_status
         FROM users
         WHERE id = :id'
    );
    $stmt->execute(['id' => $userId]);
    $user = $stmt->fetch();
    if (!is_array($user)) {
        $_SESSION = [];
        jsonResponse(401, ['status' => 'error', 'message' => 'Sign in required.']);
    }
    if ($user['account_status'] !== 'active') {
        jsonResponse(403, ['status' => 'error', 'message' => 'This campus pass is suspended.']);
    }

    return $user;
}

function requireAdmin(PDO $pdo): array
{
    $user = requireActiveUser($pdo);
    if ($user['role'] !== 'admin') {
        jsonResponse(403, ['status' => 'error', 'message' => 'Campus admin only.']);
    }
    return $user;
}


// Added custom timestamp logger for PHP endpoints
function unitik_log($message) {
    error_log("[" . date("Y-m-d H:i:s") . "] " . $message);
}