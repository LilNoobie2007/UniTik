<?php
/* 
 * UNITIK CORE SECURITY MIDDLEWARE
 * Purpose: Centralized input sanitization and security protocols.
 */

// Read raw input (This is the line we fixed earlier!)
$rawInput = file_get_contents('php://input') ?: '';

/**
 * Sanitizes input to prevent Cross-Site Scripting (XSS) and clean raw data.
 * Works on both strings and arrays.
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = sanitizeInput($value);
        }
        return $data;
    }
    
    // Strip unnecessary whitespace
    $data = trim($data);
    // Remove backslashes
    $data = stripslashes($data);
    // Convert special characters to HTML entities to prevent malicious scripts
    $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    
    return $data;
}
?>