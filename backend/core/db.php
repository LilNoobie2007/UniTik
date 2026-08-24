<?php
/* 
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 */

// 1. Connection via Supavisor pooler (IPv4 compatible for XAMPP)
$host = 'aws-0-ap-southeast-1.pooler.supabase.com';
$dbname   = 'postgres';
$username = 'postgres.eadjhibjwolfhunrtljs'; // Pooler requires 'postgres.[project-ref]' format
$password = 'Unitik@9901'; // Your real DB password
$port     = '6543'; // Pooler port

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode([
        "status"  => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]));
}
?>