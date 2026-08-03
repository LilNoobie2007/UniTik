<?php
// backend/db.php

$host     = 'aws-0-ap-southeast-1.pooler.supabase.com'; // From the Supabase PHP tab
$dbname   = 'postgres';
$username = 'postgres.eadjhibjwolfhunrtljs'; // From the Supabase PHP tab
$password = 'Unitik@9901'; // The password you created at setup
$port     = '6543';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    
    $pdo = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);

    echo "Unitk Database Connection Successful! 🚀";
    
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode([
        "status"  => "error",
        "message" => "Database connection failed: " . $e->getMessage()
    ]));
}
?>