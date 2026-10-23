<?php
declare(strict_types=1);

/*
 * File: backend/modules/admin/status.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Sets users.account_status. An admin cannot suspend their own pass.
 */

require_once __DIR__ . '/../../core/security.php';
require_once __DIR__ . '/../../core/db.php';

allowCors();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    jsonResponse(405, ['status' => 'error', 'message' => 'Method not allowed.']);
}

$actor = requireAdmin($pdo);
$data = readJsonBody();
$userId = strtolower(sanitizeText($data['user_id'] ?? ''));
$status = sanitizeText($data['account_status'] ?? '');

if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $userId)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'A valid user_id is required.']);
}
if (!in_array($status, ['active', 'suspended'], true)) {
    jsonResponse(400, ['status' => 'error', 'message' => 'Unknown account status.']);
}
if ($userId === $actor['id']) {
    jsonResponse(400, ['status' => 'error', 'message' => 'You cannot suspend your own pass.']);
}

try {
    $pdo->beginTransaction();
    $current = $pdo->prepare('SELECT id, role FROM users WHERE id = :id FOR UPDATE');
    $current->execute(['id' => $userId]);
    $target = $current->fetch();
    if (!is_array($target)) {
        $pdo->rollBack();
        jsonResponse(404, ['status' => 'error', 'message' => 'No account for that user.']);
    }

    if ($target['role'] === 'admin' && $status === 'suspended') {
        $count = $pdo->query("SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND account_status = 'active'");
        $n = (int) ($count->fetch()['n'] ?? 0);
        if ($n <= 1) {
            $pdo->rollBack();
            jsonResponse(409, ['status' => 'error', 'message' => 'There must be at least one active campus admin.']);
        }
    }

    $update = $pdo->prepare('UPDATE users SET account_status = :account_status WHERE id = :id');
    $update->execute(['account_status' => $status, 'id' => $userId]);
    $pdo->commit();
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(500, ['status' => 'error', 'message' => 'Could not update the pass.']);
}

jsonResponse(200, ['status' => 'success', 'data' => ['user_id' => $userId, 'account_status' => $status]]);
