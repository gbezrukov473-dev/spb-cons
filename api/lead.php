<?php
declare(strict_types=1);

/**
 * ЧДК-Право / КонсультантПлюс — обработчик лид-форм
 * - JSON-ответы для fetch (Accept: application/json)
 * - Редиректы обратно на страницу формы, если не JSON
 * - Honeypot + fill_time + rate limit
 * - Нормализация телефона
 * - Email уведомление
 * - Лог в data/leads.jsonl
 */

session_start();

/* -------------------------------------------------- helpers -------------------------------------------------- */

function wants_json(): bool {
    $accept = strtolower((string)($_SERVER['HTTP_ACCEPT'] ?? ''));
    $xhr    = strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));
    return str_contains($accept, 'application/json') || $xhr === 'xmlhttprequest';
}

function json_out(bool $ok, array $payload = [], int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=UTF-8');
    header('Cache-Control: no-store');
    echo json_encode(array_merge(['ok' => $ok], $payload), JSON_UNESCAPED_UNICODE);
    exit;
}

function safe_path(string $path, string $fallback = '/'): string {
    $path = trim($path);
    if ($path === '') return $fallback;
    if (preg_match('~^https?://~i', $path)) return $fallback;
    if ($path[0] !== '/') $path = '/' . $path;
    return $path;
}

function redirect_303(string $to): void {
    header('Location: ' . $to, true, 303);
    exit;
}

function str_clip(string $v, int $max = 500): string {
    $v = trim($v);
    if (mb_strlen($v) > $max) $v = mb_substr($v, 0, $max);
    return $v;
}

function normalize_ru_phone(string $raw): array {
    $digits = (string)(preg_replace('/\D+/', '', $raw) ?? '');

    if ($digits === '') return ['ok' => false];

    if (strlen($digits) === 10 && $digits[0] === '9') {
        $digits = '7' . $digits;
    }
    if (strlen($digits) === 11 && $digits[0] === '8') {
        $digits = '7' . substr($digits, 1);
    }
    if (strlen($digits) === 10) {
        $digits = '7' . $digits;
    }
    if (strlen($digits) > 11) {
        $digits = substr($digits, 0, 11);
    }

    if (strlen($digits) !== 11 || $digits[0] !== '7') return ['ok' => false];

    $p = substr($digits, 1);
    $display = '+7 (' . substr($p, 0, 3) . ') ' . substr($p, 3, 3) . '-' . substr($p, 6, 2) . '-' . substr($p, 8, 2);
    $e164    = '+' . $digits;

    return ['ok' => true, 'digits' => $digits, 'e164' => $e164, 'display' => $display];
}

function ensure_dir(string $dir): void {
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
}

function rate_limit_ok(string $dir, string $ip, int $maxAttempts = 10, int $windowSec = 600): bool {
    ensure_dir($dir);

    $key  = hash('sha256', $ip);
    $file = rtrim($dir, '/\\') . DIRECTORY_SEPARATOR . $key . '.json';

    $now  = time();
    $data = [];

    $fp = @fopen($file, 'c+');
    if (!$fp) return true;

    flock($fp, LOCK_EX);

    $contents = stream_get_contents($fp);
    if (is_string($contents) && $contents !== '') {
        $decoded = json_decode($contents, true);
        if (is_array($decoded)) $data = $decoded;
    }

    $data = array_values(array_filter($data, fn($t) => is_int($t) && ($now - $t) <= $windowSec));

    if (count($data) >= $maxAttempts) {
        flock($fp, LOCK_UN);
        fclose($fp);
        return false;
    }

    $data[] = $now;

    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_UNESCAPED_UNICODE));

    flock($fp, LOCK_UN);
    fclose($fp);

    return true;
}

/* -------------------------------------------------- main -------------------------------------------------- */

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    redirect_303('/');
}

$pageFromPost      = str_clip((string)($_POST['page'] ?? ''), 400);
$returnTo          = safe_path($pageFromPost !== '' ? $pageFromPost : '/', '/');
$returnToWithAnchor = $returnTo . (str_contains($returnTo, '#') ? '' : '#form');

/* --- honeypot --- */
$honeypot = str_clip((string)($_POST['website'] ?? ''), 200);
if ($honeypot !== '') {
    if (wants_json()) json_out(true, ['redirect' => '/thanks.html']);
    redirect_303('/thanks.html');
}

/* --- fill_time --- */
$fillTimeMs = (int)($_POST['fill_time_ms'] ?? 0);
if ($fillTimeMs > 0 && $fillTimeMs < 900) {
    if (wants_json()) json_out(true, ['redirect' => '/thanks.html']);
    redirect_303('/thanks.html');
}

/* --- rate limit --- */
$ip    = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$rlDir = __DIR__ . '/../data/ratelimit';
if (!rate_limit_ok($rlDir, $ip, 10, 600)) {
    $msg = 'Слишком много попыток. Попробуйте чуть позже или позвоните: +7 (812) 334-44-81';
    if (wants_json()) json_out(false, ['message' => $msg], 429);
    redirect_303($returnToWithAnchor . (str_contains($returnToWithAnchor, '?') ? '&' : '?') . 'lead_error=rate');
}

/* --- collect fields --- */
$name          = str_clip((string)($_POST['name']          ?? ''), 100);
$phoneRaw      = str_clip((string)($_POST['phone']         ?? ''), 80);
$email         = str_clip((string)($_POST['email']         ?? ''), 200);
$comment       = str_clip((string)($_POST['comment']       ?? ''), 800);
$service       = str_clip((string)($_POST['service']       ?? ''), 120);
$formId        = str_clip((string)($_POST['form_id']       ?? ''), 60);
$policyVersion = str_clip((string)($_POST['policy_version'] ?? ''), 40);
$referrer      = str_clip((string)($_POST['referrer']      ?? ''), 400);

$consent = isset($_POST['consent']);

$utm = [
    'utm_source'   => str_clip((string)($_POST['utm_source']   ?? ''), 120),
    'utm_medium'   => str_clip((string)($_POST['utm_medium']   ?? ''), 120),
    'utm_campaign' => str_clip((string)($_POST['utm_campaign'] ?? ''), 120),
    'utm_content'  => str_clip((string)($_POST['utm_content']  ?? ''), 120),
    'utm_term'     => str_clip((string)($_POST['utm_term']     ?? ''), 120),
    'gclid'        => str_clip((string)($_POST['gclid']        ?? ''), 200),
    'yclid'        => str_clip((string)($_POST['yclid']        ?? ''), 200),
];

/* --- validation --- */
$fieldErrors = [];

$normalized = normalize_ru_phone($phoneRaw);
if (!$normalized['ok']) {
    $fieldErrors['phone'] = 'Похоже, номер неполный. Проверьте, пожалуйста.';
}

if ($name !== '' && mb_strlen($name) < 2) {
    $fieldErrors['name'] = 'Напишите, пожалуйста, как к вам обращаться (минимум 2 символа).';
}

if (!$consent) {
    $fieldErrors['consent'] = 'Нужно согласие на обработку персональных данных.';
}

if (!empty($fieldErrors)) {
    if (wants_json()) {
        json_out(false, [
            'message'     => 'Проверьте форму, пожалуйста.',
            'fieldErrors' => $fieldErrors,
        ], 422);
    }
    redirect_303($returnToWithAnchor . (str_contains($returnToWithAnchor, '?') ? '&' : '?') . 'lead_error=1');
}

/* --- log --- */
$logDir = __DIR__ . '/../data';
ensure_dir($logDir);

$logData = [
    'date'           => date('Y-m-d H:i:s'),
    'ip'             => $ip,
    'ua'             => (string)($_SERVER['HTTP_USER_AGENT'] ?? 'unknown'),
    'form_id'        => $formId,
    'page'           => $pageFromPost,
    'referrer'       => $referrer,
    'service'        => $service,
    'name'           => $name,
    'phone'          => $normalized['e164'],
    'email'          => $email,
    'comment'        => $comment,
    'consent'        => true,
    'policy_version' => $policyVersion,
    'utm'            => $utm,
];

@file_put_contents(
    $logDir . '/leads.jsonl',
    json_encode($logData, JSON_UNESCAPED_UNICODE) . PHP_EOL,
    FILE_APPEND
);

/* --- email notification --- */
$to      = 'info@chdk-pravo.ru'; // ← замените на реальный адрес
$subject = 'Новая заявка с сайта КонсультантПлюс';

$lines   = [];
$lines[] = 'Новая заявка с сайта';
$lines[] = '';
$lines[] = 'Телефон: ' . $normalized['display'];
if ($name !== '')  $lines[] = 'Имя: '      . $name;
if ($email !== '') $lines[] = 'Email: '    . $email;
$lines[] = 'Форма: ' . ($formId !== '' ? $formId : '—');
$lines[] = 'Страница: ' . ($pageFromPost !== '' ? $pageFromPost : $returnTo);
if ($service !== '') $lines[] = 'Услуга: ' . $service;
if ($comment !== '') {
    $lines[] = '';
    $lines[] = 'Комментарий:';
    $lines[] = $comment;
}
$lines[] = '';
$lines[] = 'Дата: ' . date('d.m.Y H:i');
$lines[] = 'Согласие: получено';
$body = implode("\n", $lines);

$from    = 'no-reply@chdk-pravo.ru'; // ← замените на реальный домен
$headers = "From: {$from}\r\n";
$headers .= "Reply-To: {$from}\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

@mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);

/* --- success --- */
if (wants_json()) {
    json_out(true, ['redirect' => '/thanks.html']);
}
redirect_303('/thanks.html');
