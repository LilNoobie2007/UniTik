<?php
/* 
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8.0 (PDO/PostgreSQL)
 * QR Code Generation Test
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
// Version 4 uses specific classes instead of Enums
use Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevelHigh;
use Endroid\QrCode\RoundBlockSizeMode\RoundBlockSizeModeMargin;
use Endroid\QrCode\Writer\PngWriter;

// 1. A fake unique ticket hash for testing
$dummy_ticket_hash = "UNITIK-TEST-" . strtoupper(uniqid());

// 2. Locate your Canva logo
$logo_path = __DIR__ . '/../../assets/logo1.png';

if (!file_exists($logo_path)) {
    die("Error: Please place your Canva logo.png in the backend/assets/ folder!");
}

try {
    // 3. Build the QR Code with the Logo embedded (v4 Syntax)
    $result = Builder::create()
        ->writer(new PngWriter())
        ->data($dummy_ticket_hash)
        ->encoding(new Encoding('UTF-8'))
        // Use 'new ErrorCorrectionLevelHigh()' instead of Enum
        ->errorCorrectionLevel(new ErrorCorrectionLevelHigh())
        ->size(400)
        ->margin(20)
        // Use 'new RoundBlockSizeModeMargin()' instead of Enum
        ->roundBlockSizeMode(new RoundBlockSizeModeMargin())
        ->logoPath($logo_path)
        ->logoResizeToWidth(120) // Scales your logo to fit perfectly
        ->logoPunchoutBackground(true) // Creates a clean border around your logo
        ->build();

    // 4. Output the image directly to the browser
    header('Content-Type: ' . $result->getMimeType());
    echo $result->getString();

} catch (\Exception $e) {
    echo "QR Generation Failed: " . $e->getMessage();
}
?>