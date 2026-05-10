<?php
/**
 * Login Handler
 * AJAX login via wp_signon
 */

// AJAX Login Handler
add_action('wp_ajax_nopriv_mangayummy_ya_login', 'mangayummy_ya_handle_login');
add_action('wp_ajax_mangayummy_ya_login', 'mangayummy_ya_handle_login');

function mangayummy_ya_handle_login() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ya_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security error. Reload the page.']);
    }

    $username = sanitize_text_field($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        wp_send_json_error(['message' => 'Fill in all fields.']);
    }

    // Attempt login
    $creds = [
        'user_login' => $username,
        'user_password' => $password,
        'remember' => isset($_POST['remember']),
    ];

    $user = wp_signon($creds, is_ssl());

    if (is_wp_error($user)) {
        wp_send_json_error(['message' => 'Wrong username or password.']);
    }

    // Block unverified users (only those with email_verified = 0, not older users without the meta)
    $verified = get_user_meta($user->ID, 'email_verified', true);
    // Allow login if: meta doesn't exist (old user) OR meta = 1 (verified)
    // Block only if meta explicitly set to 0 (new unverified user)
    if ($verified === '0' || $verified === 0) {
        wp_logout();
        wp_send_json_error(['message' => 'Please confirm your email. Check your inbox for the activation link.']);
    }

    // Success
    wp_send_json_success([
        'message' => 'Login successful!',
        'redirect' => home_url(),
    ]);
}

// Redirect if already logged in
add_action('template_redirect', function() {
    if (is_page_template('page-login.php') && is_user_logged_in()) {
        wp_redirect(home_url());
        exit;
    }
});

