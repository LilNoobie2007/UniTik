<?php
declare(strict_types=1);

/**
 * Endpoint: /ticketing/test_qr.php
 * Purpose: QR code generation test with a dummy ticket hash.
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
// Version 4 uses specific classes instead of Enums
use Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevelHigh;
use Endroid\QrCode\RoundBlockSizeMode\RoundBlockSizeModeMargin;
use Endroid\QrCode\Writer\PngWriter;

/**
 * Builds a dummy ticket hash for local QR testing.
 *
 * @return string Dummy ticket hash.
 */
function createDummyTicketHash(): string
{
    return "UNITIK-TEST-" . strtoupper(uniqid());
}

/**
 * Builds a branded test QR image.
 *
 * @param string $ticketHash Dummy ticket hash.
 * @param string $logoPath   Absolute path to the UniTik logo.
 *
 * @return \Endroid\QrCode\Writer\Result\ResultInterface Generated QR result.
 *
 * @throws Exception When QR generation fails.
 */
function buildTestQr(string $ticketHash, string $logoPath)
{
    return Builder::create()
        ->writer(new PngWriter())
        ->data($ticketHash)
        ->encoding(new Encoding('UTF-8'))
        // Use 'new ErrorCorrectionLevelHigh()' instead of Enum
        ->errorCorrectionLevel(new ErrorCorrectionLevelHigh())
        ->size(400)
        ->margin(20)
        // Use 'new RoundBlockSizeModeMargin()' instead of Enum
        ->roundBlockSizeMode(new RoundBlockSizeModeMargin())
        ->logoPath($logoPath)
        ->logoResizeToWidth(120) // Scales your logo to fit perfectly
        ->logoPunchoutBackground(true) // Creates a clean border around your logo
        ->build();
}

// 1. A fake unique ticket hash for testing
$dummy_ticket_hash = createDummyTicketHash();

// 2. Locate your Canva logo
$logo_path = __DIR__ . '/../../assets/logo1.png';

if (!file_exists($logo_path)) {
    die("Error: Please place your Canva logo.png in the backend/assets/ folder!");
}

try {
    // 3. Build the QR Code with the Logo embedded (v4 Syntax)
    $result = buildTestQr($dummy_ticket_hash, $logo_path);

    // 4. Output the image directly to the browser
    header('Content-Type: ' . $result->getMimeType());
    echo $result->getString();
} catch (PDOException $e) {
    echo "QR Generation Failed: " . $e->getMessage();
} catch (\Exception $e) {
    echo "QR Generation Failed: " . $e->getMessage();
}
