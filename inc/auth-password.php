<?php
/**
 * Password Reset (Forgot Password)
 */

// AJAX: request password reset link
add_action('wp_ajax_nopriv_mangayummy_ya_forgot_password', 'mangayummy_ya_handle_forgot_password');
add_action('wp_ajax_mangayummy_ya_forgot_password', 'mangayummy_ya_handle_forgot_password');

function mangayummy_ya_handle_forgot_password() {
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ya_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security error. Reload the page.']);
    }

    $email = sanitize_email($_POST['email'] ?? '');
    if (empty($email) || !is_email($email)) {
        wp_send_json_error(['message' => 'Enter a valid email.']);
    }

    $user = get_user_by('email', $email);
    if ($user) {
        $token = wp_generate_password(32, false, false);
        $expires = time() + HOUR_IN_SECONDS; // 1h validity
        update_user_meta($user->ID, 'password_reset_token', $token);
        update_user_meta($user->ID, 'password_reset_expires', $expires);

        $reset_link = home_url('/reset-password?token=' . rawurlencode($token));
        $subject = 'Reset your MangaYummy password';
        $message = wpautop(
            'Hi!<br><br>' .
            'You requested a password reset. Click the link below to set a new password:<br>' .
            '<a href="' . esc_url($reset_link) . '">Reset password</a><br><br>' .
            'Link expires in 1 hour. If you didn\'t request this reset, ignore this message.'
        );
        $headers = ['Content-Type: text/html; charset=UTF-8'];
        wp_mail($email, $subject, $message, $headers);
    }

    // Generic response to avoid user enumeration
    wp_send_json_success(['message' => 'If the email exists, you\'ll receive a reset link (valid for 1 hour).']);
}

// Frontend handler for /reset-password
add_action('template_redirect', function() {
    $path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    if ($path !== 'reset-password') {
        return;
    }

    $token = sanitize_text_field($_GET['token'] ?? '');
    if (empty($token)) {
        wp_die('Link invalid.');
    }

    $users = get_users([
        'meta_key' => 'password_reset_token',
        'meta_value' => $token,
        'number' => 1,
        'fields' => 'ID',
    ]);

    if (empty($users)) {
        wp_die('Link invalid sau expirat.');
    }

    $user_id = (int) $users[0];
    $expires = (int) get_user_meta($user_id, 'password_reset_expires', true);
    if (!$expires || time() > $expires) {
        wp_die('Link invalid sau expirat.');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $new_pass = $_POST['new_password'] ?? '';
        $new_pass_confirm = $_POST['new_password_confirm'] ?? '';

        if (strlen($new_pass) < 8) {
            wp_die('Parola trebuie sÄƒ aibÄƒ minim 8 caractere.');
        }
        if ($new_pass !== $new_pass_confirm) {
            wp_die('Parolele nu se potrivesc.');
        }

        wp_set_password($new_pass, $user_id);
        delete_user_meta($user_id, 'password_reset_token');
        delete_user_meta($user_id, 'password_reset_expires');

        wp_die('ParolÄƒ actualizatÄƒ. Te poÈ›i autentifica acum.', 'Resetare parolÄƒ', ['response' => 200]);
    }

    // Simple HTML form
    echo '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Resetare parolÄƒ</title></head><body style="background:#0f0f0f;color:#fff;font-family:Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;">';
    echo '<div style="background:#1a1a1a;padding:24px;border-radius:8px;max-width:360px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,0.3);">';
    echo '<h2 style="margin-top:0;color:#13667a;">Resetare parolÄƒ</h2>';
    echo '<form method="POST">';
    echo '<label>ParolÄƒ nouÄƒ</label><br><input type="password" name="new_password" required minlength="8" style="width:100%;padding:10px;margin:8px 0 12px 0;border-radius:6px;border:1px solid #333;background:#111;color:#fff;" />';
    echo '<label>ConfirmÄƒ parola</label><br><input type="password" name="new_password_confirm" required minlength="8" style="width:100%;padding:10px;margin:8px 0 16px 0;border-radius:6px;border:1px solid #333;background:#111;color:#fff;" />';
    echo '<button type="submit" style="width:100%;padding:10px;border:none;border-radius:6px;background:#13667a;color:#000;font-weight:bold;cursor:pointer;">SalveazÄƒ</button>';
    echo '</form>';
    echo '</div>';
    echo '</body></html>';
    exit;
});

