<?php
declare(strict_types=1);

/*
 * File: backend/core/mail.php
 * UNITIK CORE ARCHITECTURE MANDATE
 * - Frontend: Next.js / BFF
 * - Backend: PHP 8+ (PDO/PostgreSQL)
 * - DO NOT use client-side database calls.
 * - DO NOT trust client inputs. Always sanitize.
 * - Preserve existing logic during modifications.
 *
 * Sends one ticket message. Callers must already have committed the ticket.
 * UNITIK_SMTP_HOST and UNITIK_MAIL_FROM are required. Without them, nothing is sent.
 */

function sendTicketMail(string $to, string $holderName, string $eventTitle, string $when, string $ticketHash): array
{
    $host = getenv('UNITIK_SMTP_HOST') ?: '';
    $from = getenv('UNITIK_MAIL_FROM') ?: '';
    if ($host === '' || $from === '' || !filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
        return ['mail_status' => 'skipped', 'mail_detail' => 'Mail transport is not configured.'];
    }

    $port = (int) (getenv('UNITIK_SMTP_PORT') ?: 587);
    $user = getenv('UNITIK_SMTP_USER') ?: '';
    $pass = getenv('UNITIK_SMTP_PASSWORD') ?: '';
    $subject = 'UniTik ticket: ' . preg_replace('/[\r\n]+/', ' ', $eventTitle);
    $body = "Hello {$holderName},\r\n\r\n"
        . "Your seat for {$eventTitle} is issued.\r\n"
        . "When: {$when}\r\n"
        . "Gate code: UNITIK:{$ticketHash}\r\n\r\n"
        . "Show this code at the gate. Do not share it.\r\n";

    try {
        smtpDeliver($host, $port, $user, $pass, $from, $to, $subject, $body);
    } catch (Throwable $e) {
        return ['mail_status' => 'failed', 'mail_detail' => 'The ticket is issued, but the email could not be sent.'];
    }

    return ['mail_status' => 'sent', 'mail_detail' => 'A copy was sent to your campus email.'];
}

function smtpDeliver(
    string $host,
    int $port,
    string $user,
    string $pass,
    string $from,
    string $to,
    string $subject,
    string $body
): void {
    $remote = ($port === 465 ? 'ssl://' : 'tcp://') . $host . ':' . $port;
    $socket = @stream_socket_client($remote, $errno, $error, 8, STREAM_CLIENT_CONNECT);
    if ($socket === false) {
        throw new RuntimeException('connect');
    }
    stream_set_timeout($socket, 8);
    smtpExpect($socket, '220');
    $hello = smtpCommand($socket, 'EHLO unitik.local', '250');
    $tls = getenv('UNITIK_SMTP_TLS') ?: 'auto';
    $offered = str_contains(strtoupper($hello), 'STARTTLS');
    if ($port !== 465 && $tls !== 'off' && ($tls === 'require' || $offered)) {
        if (!$offered) {
            throw new RuntimeException('tls');
        }
        smtpCommand($socket, 'STARTTLS', '220');
        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('tls');
        }
        smtpCommand($socket, 'EHLO unitik.local', '250');
    }
    if ($user !== '') {
        smtpCommand($socket, 'AUTH LOGIN', '334');
        smtpCommand($socket, base64_encode($user), '334');
        smtpCommand($socket, base64_encode($pass), '235');
    }
    smtpCommand($socket, 'MAIL FROM:<' . $from . '>', '250');
    smtpCommand($socket, 'RCPT TO:<' . $to . '>', '250');
    smtpCommand($socket, 'DATA', '354');
    $message = "From: {$from}\r\nTo: {$to}\r\nSubject: {$subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n";
    $stuffed = preg_replace('/^\./m', '..', $body) ?? $body;
    fwrite($socket, $message . $stuffed . "\r\n.\r\n");
    fflush($socket);
    smtpExpect($socket, '250');
    smtpCommand($socket, 'QUIT', '221');
    fclose($socket);
}

function smtpCommand($socket, string $command, string $expect): string
{
    fwrite($socket, $command . "\r\n");
    return smtpExpect($socket, $expect);
}

function smtpExpect($socket, string $expect): string
{
    $reply = '';
    while (($line = fgets($socket, 515)) !== false) {
        $reply .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    if (!str_starts_with($reply, $expect)) {
        throw new RuntimeException('smtp');
    }
    return $reply;
}
