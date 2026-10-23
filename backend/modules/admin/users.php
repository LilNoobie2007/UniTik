<?php
declare(strict_types=1);

/*
 * File: backend/modules/admin/users.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Admin directory. password_hash is never selected.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

requireAdmin($pdo);

try {
    $stmt = $pdo->query(
        'SELECT id, full_name, email, role, roll_number, committee_name,
                account_status, is_verified, created_at
         FROM users
         ORDER BY created_at ASC'
    );
    $users = $stmt->fetchAll();
    foreach ($users as &$user) {
        $user['is_verified'] = $user['is_verified'] === true || $user['is_verified'] === 't' || $user['is_verified'] === '1';
    }
    unset($user);
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not load campus accounts.']);
}

jsonResponse(200, ['status' => 'success', 'data' => $users]);
