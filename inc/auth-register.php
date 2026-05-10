<?php
/**
 * Register Handler
 * AJAX registration with email validation & auto-login
 */

/**
 * GLOBAL PROTECTION: Block spam display_name on ANY user update
 * This catches all attempts to set display_name, regardless of source
 */
add_filter('wp_pre_insert_user_data', 'mangayummy_ya_sanitize_user_display_name', 10, 4);
add_filter('pre_user_display_name', 'mangayummy_ya_block_spam_display_name', 10, 1);

function mangayummy_ya_sanitize_user_display_name($data, $update, $user_id, $userdata) {
    if (isset($data['display_name'])) {
        $name = $data['display_name'];
        
        // Force max 20 characters
        if (strlen($name) > 20) {
            $data['display_name'] = substr($name, 0, 20);
        }
        
        // Block if contains spam patterns
        if (function_exists('mangayummy_ya_is_spam_username') && mangayummy_ya_is_spam_username($name)) {
            // Fall back to user_login or truncated version
            $data['display_name'] = isset($data['user_login']) ? substr($data['user_login'], 0, 20) : 'User' . $user_id;
        }
        
        // Block if contains spaces (spam bots use spaces)
        if (preg_match('/\s/', $data['display_name'])) {
            $data['display_name'] = preg_replace('/\s+/', '', $data['display_name']);
            if (strlen($data['display_name']) > 20) {
                $data['display_name'] = substr($data['display_name'], 0, 20);
            }
        }
    }
    return $data;
}

function mangayummy_ya_block_spam_display_name($display_name) {
    // Max 20 chars
    if (strlen($display_name) > 20) {
        $display_name = substr($display_name, 0, 20);
    }
    // Remove spaces
    if (preg_match('/\s/', $display_name)) {
        $display_name = preg_replace('/\s+/', '', $display_name);
    }
    return $display_name;
}

/**
 * BLOCK WordPress native registration at wp-login.php?action=register
 * Force all registrations through our custom AJAX handler with Cloudflare protection
 */
add_action('login_form_register', 'mangayummy_ya_block_wp_native_registration');
function mangayummy_ya_block_wp_native_registration() {
    // Redirect to homepage or show error - don't allow WP native registration
    wp_redirect(home_url('/'));
    exit;
}

// Also block the registration form from showing
add_filter('option_users_can_register', 'mangayummy_ya_disable_wp_registration_option');
function mangayummy_ya_disable_wp_registration_option($value) {
    // Return 0 to disable native WP registration
    // This prevents the "Register" link from showing on wp-login.php
    return 0;
}

// Block REST API user registration if enabled
add_filter('rest_pre_insert_user', 'mangayummy_ya_block_rest_api_registration', 10, 2);
function mangayummy_ya_block_rest_api_registration($prepared_user, $request) {
    // Only allow admins to create users via REST API
    if (!current_user_can('create_users')) {
        return new WP_Error('rest_cannot_create_user', 'ÃŽnregistrarea este dezactivatÄƒ.', array('status' => 403));
    }
    return $prepared_user;
}

/**
 * Check if display_name exists
 */
function mangayummy_display_name_exists($display_name) {
    global $wpdb;
    $count = $wpdb->get_var($wpdb->prepare(
        "SELECT COUNT(*) FROM $wpdb->users WHERE display_name = %s",
        $display_name
    ));
    return $count > 0;
}

// AJAX Register Handler
add_action('wp_ajax_nopriv_mangayummy_ya_register', 'mangayummy_ya_handle_register');

/**
 * Check if email domain is from a temporary email service
 * Uses whitelist approach - only allows trusted email providers
 */
function mangayummy_ya_is_temp_email($email) {
    $domain = strtolower(substr(strrchr($email, "@"), 1));
    
    // Debug log
    $debug_file = dirname(ABSPATH) . '/temp_email_debug.log';
    $debug_entry = date('Y-m-d H:i:s') . " - Checking email: {$email}, domain: {$domain}\n";
    file_put_contents($debug_file, $debug_entry, FILE_APPEND);
    
    // ALLOWED domains (whitelist approach - only these are permitted)
    $allowed_domains = [
        // Major email providers
        'gmail.com',
    ];
    
    // Check if domain is in allowed list
    if (in_array($domain, $allowed_domains)) {
        return false; // NOT temp email - allowed
    }
    
    // Check parent domain for subdomains (e.g., mail.google.com -> google.com)
    $parts = explode('.', $domain);
    if (count($parts) > 2) {
        $parent_domain = $parts[count($parts) - 2] . '.' . $parts[count($parts) - 1];
        if (in_array($parent_domain, $allowed_domains)) {
            return false; // NOT temp email - allowed
        }
    }
    
    // If not in allowed list, treat as temp email
    return true;
}

/**
 * Check if username contains spam patterns
 * Blocks usernames with URLs, spam words, or suspicious patterns
 */
function mangayummy_ya_is_spam_username($username) {
    $username_lower = strtolower($username);
    
    // Spam keywords
    $spam_words = [
        'reward', 'redeem', 'prize', 'winner', 'bonus', 'casino', 'viagra',
        'crypto', 'bitcoin', 'forex', 'trading', 'investment', 'money',
        'click', 'free', 'promo', 'discount', 'offer', 'deal', 'sale',
        'porn', 'sex', 'xxx', 'adult', 'dating', 'singles',
        'admin', 'moderator', 'support', 'staff', 'official',
        'hack', 'cheat', 'bot', 'spam',
        'tw1', 'tw2', 'tw3'  // Common spam domain patterns
    ];
    
    // Block Russian domain patterns in username (e.g., "abc123.ru", "site-ru")
    if (preg_match('/(^|[^a-z])ru($|[^a-z])/i', $username)) {
        return true;
    }
    
    foreach ($spam_words as $word) {
        if (strpos($username_lower, $word) !== false) {
            return true;
        }
    }
    
    // Block if contains domain-like patterns (.ru, .com, .tw, etc.)
    if (preg_match('/\.(ru|com|net|org|tw|cn|info|biz|xyz|top|win|click|link)/i', $username)) {
        return true;
    }
    
    // Block if has too many numbers (likely random/generated)
    $digit_count = preg_match_all('/\d/', $username);
    if ($digit_count > 6) {
        return true; // More than 6 digits is suspicious
    }
    
    // Block patterns like "abc123456" (letters followed by many digits)
    if (preg_match('/^[a-zA-Z]{1,4}\d{5,}$/', $username)) {
        return true;
    }
    
    return false;
}

function mangayummy_ya_send_verification_email($email, $token) {
    $verify_link = home_url('/verify-email?token=' . rawurlencode($token));

    $subject = 'ConfirmÄƒ emailul pentru MangaYummy';
    $message = wpautop(
        'Salut!<br><br>' .
        'ÃŽncÄƒ un pas È™i contul tÄƒu este activ. ApasÄƒ pe butonul de mai jos pentru a confirma adresa de email:<br>' .
        '<a href="' . esc_url($verify_link) . '">ConfirmÄƒ emailul</a><br><br>' .
        'Linkul este valabil 24 de ore. DacÄƒ nu ai cerut acest cont, poÈ›i ignora mesajul.'
    );

    $headers = ['Content-Type: text/html; charset=UTF-8'];
    return wp_mail($email, $subject, $message, $headers);
}

function mangayummy_ya_handle_register() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ya_ajax_nonce')) {
        wp_send_json_error(['message' => 'Eroare de securitate. ReÃ®ncarcÄƒ pagina.']);
    }

    // Validate Cloudflare Turnstile
    $cf_token = $_POST['cf_turnstile_response'] ?? '';
    if (empty($cf_token)) {
        wp_send_json_error(['message' => 'Verificare Cloudflare lipsÄƒ. CompleteazÄƒ captcha-ul.']);
    }

    // Verify Cloudflare token
    if (!defined('CLOUDFLARE_TURNSTILE_SECRET')) {
        wp_send_json_error(['message' => 'Configurare Cloudflare lipsÄƒ Ã®n wp-config.php']);
    }

    $cf_verify = wp_remote_post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
        'body' => [
            'secret' => CLOUDFLARE_TURNSTILE_SECRET,
            'response' => $cf_token,
            'remoteip' => $_SERVER['REMOTE_ADDR'] ?? '',
        ],
    ]);

    if (is_wp_error($cf_verify)) {
        wp_send_json_error(['message' => 'Eroare la verificarea Cloudflare. ÃŽncearcÄƒ din nou.']);
    }

    $cf_result = json_decode(wp_remote_retrieve_body($cf_verify), true);
    if (!isset($cf_result['success']) || $cf_result['success'] !== true) {
        wp_send_json_error(['message' => 'Verificare Cloudflare eÈ™uatÄƒ. ÃŽncearcÄƒ din nou.']);
    }

    $email = sanitize_email($_POST['email'] ?? '');
    $username = sanitize_user($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $password_confirm = $_POST['password_confirm'] ?? '';
    $agree_terms = isset($_POST['agree_terms']) ? true : false;
    $gender = sanitize_text_field($_POST['gender'] ?? '');
    $gender = mangayummy_normalize_gender_value($gender);
    if (!in_array($gender, ['masculin', 'feminin'], true)) {
        wp_send_json_error(['message' => 'SelecteazÄƒ genul (Masculin sau Feminin).']);
    }

    // Validation
    $errors = [];

    if (empty($email)) {
        $errors[] = 'Email este obligatoriu.';
    } elseif (!is_email($email)) {
        $errors[] = 'Email-ul nu este valid.';
    } elseif (email_exists($email)) {
        $errors[] = 'Acest email este deja Ã®nregistrat.';
    } elseif (mangayummy_ya_is_temp_email($email)) {
        $errors[] = 'Emailurile temporare nu sunt permise. FoloseÈ™te un email real.';
    }

    if (empty($username)) {
        $errors[] = 'Utilizatorul este obligatoriu.';
    } elseif (username_exists($username)) {
        $errors[] = 'Acest utilizator este deja luat.';
    } elseif (mangayummy_display_name_exists($username)) {
        $errors[] = 'Acest nume de utilizator este deja luat.';
    } elseif (!preg_match('/^[a-zA-Z0-9_-]{3,20}$/', $username)) {
        $errors[] = 'Utilizatorul trebuie sÄƒ conÈ›inÄƒ 3-20 caractere (litere, cifre, -, _).';
    } elseif (mangayummy_ya_is_spam_username($username)) {
        $errors[] = 'Numele de utilizator nu este permis.';
    }

    if (empty($password)) {
        $errors[] = 'Parola este obligatorie.';
    } elseif (strlen($password) < 6) {
        $errors[] = 'Parola trebuie sÄƒ aibÄƒ cel puÈ›in 6 caractere.';
    }

    if ($password !== $password_confirm) {
        $errors[] = 'Parolele nu se potrivesc.';
    }

    if (!$agree_terms) {
        $errors[] = 'Trebuie sÄƒ accepÈ›i Politica de confidenÈ›ialitate.';
    }

    if (!empty($errors)) {
        wp_send_json_error(['message' => implode(' ', $errors)]);
    }

    // Create user
    $user_id = wp_create_user($username, $password, $email);

    if (is_wp_error($user_id)) {
        wp_send_json_error(['message' => 'Eroare la crearea utilizatorului. ÃŽncearcÄƒ din nou.']);
    }

    // Set display_name = username (unic)
    wp_update_user([
        'ID' => $user_id,
        'display_name' => $username
    ]);

    // Initialize user meta for gamification and profile
    update_user_meta($user_id, 'reader_xp', 0);
    update_user_meta($user_id, 'reader_level', 1);
    update_user_meta($user_id, 'mangayummy_achievements', []);
    update_user_meta($user_id, 'bookmarked_manga', []);
    // Set avatar based on gender selection
    if ($gender === 'feminin') {
        $avatar_file = 'default-avatar-female.png';
    } else {
        $avatar_file = 'default-avatar-male.png';
    }
    update_user_meta($user_id, 'profile_avatar', get_template_directory_uri() . '/assets/img/' . $avatar_file);
    update_user_meta($user_id, 'user_gender', $gender);
    update_user_meta($user_id, 'gender', $gender);

    // Email verification token
    $token = wp_generate_password(32, false, false);
    $expires = time() + DAY_IN_SECONDS;
    update_user_meta($user_id, 'email_verified', 0);
    update_user_meta($user_id, 'email_verify_token', $token);
    update_user_meta($user_id, 'email_verify_expires', $expires);

    // Send verification email; if it fails, remove user to avoid stuck accounts
    if (!mangayummy_ya_send_verification_email($email, $token)) {
        require_once ABSPATH . 'wp-admin/includes/user.php';
        wp_delete_user($user_id);
        wp_send_json_error(['message' => 'Nu am putut trimite emailul de verificare. ÃŽncearcÄƒ din nou.']);
    }

    wp_send_json_success([
        'message' => 'Cont creat! VerificÄƒ emailul Ã®n urmÄƒtoarele 24h pentru activare.',
    ]);
}

// Redirect if already logged in
add_action('template_redirect', function() {
    if (is_page_template('page-register.php') && is_user_logged_in()) {
        wp_redirect(home_url());
        exit;
    }
});

// Handle email verification links: /verify-email?token=...
add_action('template_redirect', function() {
    $path = trim(parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    $token = sanitize_text_field($_GET['token'] ?? '');

    if ($path !== 'verify-email') {
        return;
    }

    if (empty($token)) {
        wp_die('Link de verificare invalid.');
    }

    $users = get_users([
        'meta_key' => 'email_verify_token',
        'meta_value' => $token,
        'number' => 1,
        'fields' => 'ID',
    ]);

    if (empty($users)) {
        wp_die('Link de verificare invalid sau expirat.');
    }

    $user_id = (int) $users[0];
    $expires = (int) get_user_meta($user_id, 'email_verify_expires', true);

    if (!$expires || time() > $expires) {
        wp_die('Link invalid sau expirat. Cere un nou email de confirmare.', 'Verificare email', ['response' => 400]);
    }

    update_user_meta($user_id, 'email_verified', 1);
    delete_user_meta($user_id, 'email_verify_token');
    delete_user_meta($user_id, 'email_verify_expires');

    // Clear community cache so user appears in lists immediately
    delete_transient('community_top_users');

    wp_die('Email confirmat! Te poÈ›i autentifica acum.', 'Verificare email', ['response' => 200]);
});

// ===== CLEANUP UNVERIFIED ACCOUNTS =====
/**
 * Delete unverified accounts older than 24 hours
 * Runs daily via wp_schedule_event
 */
function mangayummy_ya_cleanup_unverified_accounts() {
    global $wpdb;
    
    // Find users who:
    // - Have email_verified = 0 (not verified)
    // - Have an email_verify_expires meta that's expired (past current time)
    $current_time = time();
    
    $unverified_users = get_users([
        'meta_key' => 'email_verified',
        'meta_value' => '0',
        'meta_query' => [
            [
                'key' => 'email_verify_expires',
                'value' => $current_time,
                'compare' => '<',
                'type' => 'NUMERIC'
            ]
        ],
        'fields' => 'ID',
    ]);
    
    $deleted_count = 0;
    foreach ($unverified_users as $user_id) {
        // Double-check the user is still unverified and expired
        $verified = get_user_meta($user_id, 'email_verified', true);
        $expires = get_user_meta($user_id, 'email_verify_expires', true);
        
        if ($verified == '0' && $expires && $expires < time()) {
            require_once ABSPATH . 'wp-admin/includes/user.php';
            if (wp_delete_user($user_id)) {
                $deleted_count++;
            }
        }
    }
    
    // Log cleanup results
    if ($deleted_count > 0) {
        $log_file = dirname(ABSPATH) . '/cleanup_log.log';
        $log_entry = date('Y-m-d H:i:s') . " - Cleaned up {$deleted_count} unverified accounts\n";
        file_put_contents($log_file, $log_entry, FILE_APPEND);
    }
}

// Schedule daily cleanup
if (!wp_next_scheduled('ya_daily_cleanup_unverified')) {
    wp_schedule_event(time(), 'daily', 'ya_daily_cleanup_unverified');
}
add_action('ya_daily_cleanup_unverified', 'mangayummy_ya_cleanup_unverified_accounts');

// Cleanup is now manual via admin panel - disabled automatic cleanup
// if (defined('WP_DEBUG') && WP_DEBUG) {
//     $cleanup_transient = get_transient('ya_cleanup_last_run');
//     if (false === $cleanup_transient) {
//         add_action('init', 'mangayummy_ya_cleanup_unverified_accounts');
//         set_transient('ya_cleanup_last_run', time(), HOUR_IN_SECONDS);
//     }
// }

