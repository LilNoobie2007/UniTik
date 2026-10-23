<?php
declare(strict_types=1);

/*
 * File: backend/modules/admin/claim.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * First desk only. The role is written here, never taken from the body.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$user = requireActiveUser($pdo);

try {
    $update = $pdo->prepare(
        "UPDATE users
         SET role = 'admin'
         WHERE id = :id
           AND NOT EXISTS (SELECT 1 FROM users AS existing WHERE existing.role = 'admin')
         RETURNING id, role"
    );
    $update->execute(['id' => $user['id']]);
    $claimed = $update->fetch();
} catch (PDOException $e) {
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not claim the admin desk.']);
}

if (!is_array($claimed)) {
    jsonResponse(409, ['status' => 'error', 'message' => 'A campus admin already exists.']);
}

jsonResponse(200, ['status' => 'success', 'data' => ['id' => $claimed['id'], 'role' => $claimed['role']]]);
