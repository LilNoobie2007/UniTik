<?php
declare(strict_types=1);

/**
 * Endpoint: /ticketing/view_ticket.php?hash={ticket_hash}
 * Purpose: Render the branded QR code for a specific ticket hash.
 */

require_once __DIR__ . '/../../../vendor/autoload.php';

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel\ErrorCorrectionLevelHigh;
use Endroid\QrCode\RoundBlockSizeMode\RoundBlockSizeModeMargin;
use Endroid\QrCode\Writer\PngWriter;

/**
 * Builds a branded QR image for a ticket hash.
 *
 * @param string $ticketHash Ticket hash embedded in the QR payload.
 * @param string $logoPath   Absolute path to the UniTik logo.
 *
 * @return \Endroid\QrCode\Writer\Result\ResultInterface Generated QR result.
 *
 * @throws Exception When QR generation fails.
 */
function buildBrandedTicketQr(string $ticketHash, string $logoPath)
{
    return Builder::create()
        ->writer(new PngWriter())
        ->data($ticketHash) // This now embeds the REAL database hash!
        ->encoding(new Encoding('UTF-8'))
        ->errorCorrectionLevel(new ErrorCorrectionLevelHigh())
        ->size(400)
        ->margin(20)
        ->roundBlockSizeMode(new RoundBlockSizeModeMargin())
        ->logoPath($logoPath)
        ->logoResizeToWidth(120)
        ->logoPunchoutBackground(true)
        ->build();
}

// 1. Get the exact ticket hash from the URL
$ticket_hash = $_GET['hash'] ?? '';

if (empty($ticket_hash)) {
    http_response_code(400);
    die("Error: No ticket hash provided.");
}

$ticket_hash = (string) $ticket_hash;

// 2. Locate your Canva logo (Updated to logo1.png)
$logo_path = __DIR__ . '/../../assets/logo1.png';

if (!file_exists($logo_path)) {
    die("Error: Please place your Canva logo1.png in the backend/assets/ folder!");
}

try {
    // 3. Build the QR Code with the Logo embedded
    $result = buildBrandedTicketQr($ticket_hash, $logo_path);

    // 4. Output the image directly to the browser
    header('Content-Type: ' . $result->getMimeType());
    echo $result->getString();
} catch (PDOException $e) {
    http_response_code(500);
    echo "QR Generation Failed: " . $e->getMessage();
} catch (\Exception $e) {
    http_response_code(500);
    echo "QR Generation Failed: " . $e->getMessage();
}
