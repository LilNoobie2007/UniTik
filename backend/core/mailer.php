<?php
/* 
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Utility: mailer.php
 * - Purpose: Handle outbound SMTP emails securely without polluting JSON output.
 */

require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

function sendTicketEmail($recipientEmail, $recipientName, $eventName, $ticketHash, $qrCodeImageData) {
    $mail = new PHPMailer(true);

    try {
        // 1. SMTP Server Settings
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'techsol983@gmail.com'; 
        $mail->Password   = 'kwcl miqr lyjv luya'; 
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        
        // CRITICAL FIX: SMTPDebug MUST be 0. 
        // Any other value will print text to the browser and break JSON.
        $mail->SMTPDebug  = 0; 

        // 2. Email Headers
        // CRITICAL FIX: Gmail SMTP requires the 'From' email to match the 'Username' email.
        $mail->setFrom('techsol983@gmail.com', 'UniTik Events');
        $mail->addAddress($recipientEmail, $recipientName);

        // 3. Attachments
        $mail->addStringAttachment($qrCodeImageData, 'UniTik_Ticket.png', 'base64', 'image/png');

        // 4. Email Content
        $mail->isHTML(true);
        $mail->Subject = "Your Ticket for $eventName";
        $mail->Body = "
            <h2>Hi $recipientName,</h2>
            <p>Your ticket for <strong>$eventName</strong> has been successfully booked!</p>
            <p>Please find your secure QR ticket attached to this email. You must present this QR code at the gate for scanning.</p>
            <br>
            <p><strong>Ticket Reference:</strong> $ticketHash</p>
            <br>
            <p>Enjoy the event,<br><strong>The UniTik Team</strong></p>
        ";
        $mail->AltBody = "Hi $recipientName, your ticket for $eventName is booked. See the attached QR code. Ticket Ref: $ticketHash";

        $mail->send();
        return true;

    } catch (Exception $e) {
        // CRITICAL FIX: Log the error to the server file, do NOT echo to browser.
        error_log("PHPMailer SMTP Error: " . $mail->ErrorInfo);
        return false;
    }
}
?>