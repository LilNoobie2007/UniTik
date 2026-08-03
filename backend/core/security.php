<?php
// backend/core/security.php
// Active Defense Middleware: The "Caught in 4K" Honeypot

function sanitizeRequest() {
    // Capture all incoming GET and POST data
    $payload = json_encode($_REQUEST);
    
    // Dictionary of basic malicious SQLi and XSS payloads
    $malicious_patterns = [
        '/UNION\s+SELECT/i',
        '/DROP\s+TABLE/i',
        '/OR\s+1=1/i',
        '/<script.*?>/i',
        '/--\s*$/'
    ];

    foreach ($malicious_patterns as $pattern) {
        if (preg_match($pattern, $payload)) {
            $ip = $_SERVER['REMOTE_ADDR'];
            
            // In Phase 2, we will INSERT this IP into a security_audit_logs table here.
            
            http_response_code(403);
            die(json_encode([
                "status" => "banned",
                "error_code" => "SEC_001",
                "message" => "Nice try! 📸 Caught you in 4K. Malicious payload detected. Your IP ($ip) and browser fingerprint have been recorded."
            ]));
        }
    }
}

// Execute the honeypot on every request
sanitizeRequest();
?>