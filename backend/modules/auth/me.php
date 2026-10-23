<?php
declare(strict_types=1);

/*
 * File: backend/modules/auth/me.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Current pass. Identity comes from the session, then the users row.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$session = requireActiveUser($pdo);

try {
    $stmt = $pdo->prepare(
        'SELECT id, full_name, email, role, roll_number, committee_name, account_status
         FROM users
         WHERE id = :id'
    );
    $stmt->execute(['id' => $session['id']]);
    $user = $stmt->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load the session.']);
}

if (!is_array($user)) {
    jsonResponse(401, ['status' => 'error', 'message' => 'Sign in required.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $user]);
