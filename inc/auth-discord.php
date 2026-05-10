<?php
/**
 * Discord OAuth2 Login Handler
 *
 * Configuration â€“ define these constants in wp-config.php:
 *   define('DISCORD_CLIENT_ID',     '123456789012345678');
 *   define('DISCORD_CLIENT_SECRET', 'your_secret_here');
 *
 * Redirect URI to register in the Discord Developer Portal:
 *   https://your-site.com/?discord_oauth=1
 */

if (!defined('DISCORD_CLIENT_ID'))     define('DISCORD_CLIENT_ID',     '');
if (!defined('DISCORD_CLIENT_SECRET')) define('DISCORD_CLIENT_SECRET', '');

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// AJAX: Return the Discord authorization URL (called by the login button JS)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
add_action('wp_ajax_nopriv_mangayummy_ya_discord_auth_url', 'mangayummy_ya_discord_auth_url');
add_action('wp_ajax_mangayummy_ya_discord_auth_url',        'mangayummy_ya_discord_auth_url');

function mangayummy_ya_discord_auth_url() {
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ya_ajax_nonce')) {
        wp_send_json_error(['message' => 'Security error.']);
    }

    if (empty(DISCORD_CLIENT_ID)) {
        wp_send_json_error(['message' => 'Discord OAuth is not configured.']);
    }

    // Generate a random state token and store it in a transient for 10 minutes (CSRF protection)
    $state = wp_generate_password(32, false);
    set_transient('discord_oauth_state_' . $state, 1, 10 * MINUTE_IN_SECONDS);

    $redirect_uri = home_url('/?discord_oauth=1');

    $params = http_build_query([
        'client_id'     => DISCORD_CLIENT_ID,
        'redirect_uri'  => $redirect_uri,
        'response_type' => 'code',
        'scope'         => 'identify email',
        'state'         => $state,
        'prompt'        => 'none', // skip consent screen if already authorized
    ]);

    $auth_url = 'https://discord.com/oauth2/authorize?' . $params;

    wp_send_json_success(['url' => $auth_url]);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Callback handler â€“ runs when Discord redirects back with ?discord_oauth=1
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
add_action('template_redirect', 'mangayummy_ya_discord_handle_callback', 1);

function mangayummy_ya_discord_handle_callback() {
    if (!isset($_GET['discord_oauth'])) {
        return;
    }

    // Determine if this is a success callback or a denial/error
    if (isset($_GET['error'])) {
        // User denied access â€“ redirect home with a message
        wp_redirect(add_query_arg('discord_error', 'denied', home_url('/')));
        exit;
    }

    if (!isset($_GET['code']) || !isset($_GET['state'])) {
        wp_redirect(add_query_arg('discord_error', 'invalid', home_url('/')));
        exit;
    }

    $code  = sanitize_text_field(wp_unslash($_GET['code']));
    $state = sanitize_text_field(wp_unslash($_GET['state']));

    // â”€â”€ Verify state (CSRF) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    $stored = get_transient('discord_oauth_state_' . $state);
    delete_transient('discord_oauth_state_' . $state); // one-time use

    if (!$stored) {
        wp_redirect(add_query_arg('discord_error', 'state', home_url('/')));
        exit;
    }

    // â”€â”€ Exchange code for access token â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    $token_response = wp_remote_post('https://discord.com/api/oauth2/token', [
        'body'    => [
            'client_id'     => DISCORD_CLIENT_ID,
            'client_secret' => DISCORD_CLIENT_SECRET,
            'grant_type'    => 'authorization_code',
            'code'          => $code,
            'redirect_uri'  => home_url('/?discord_oauth=1'),
        ],
        'headers' => [
            'Content-Type' => 'application/x-www-form-urlencoded',
        ],
        'timeout' => 15,
    ]);

    if (is_wp_error($token_response)) {
        wp_redirect(add_query_arg('discord_error', 'token', home_url('/')));
        exit;
    }

    $token_body = json_decode(wp_remote_retrieve_body($token_response), true);

    if (empty($token_body['access_token'])) {
        wp_redirect(add_query_arg('discord_error', 'token', home_url('/')));
        exit;
    }

    $access_token = sanitize_text_field($token_body['access_token']);

    // â”€â”€ Fetch Discord user info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    $user_response = wp_remote_get('https://discord.com/api/users/@me', [
        'headers' => [
            'Authorization' => 'Bearer ' . $access_token,
        ],
        'timeout' => 15,
    ]);

    if (is_wp_error($user_response)) {
        wp_redirect(add_query_arg('discord_error', 'userinfo', home_url('/')));
        exit;
    }

    $discord_user = json_decode(wp_remote_retrieve_body($user_response), true);

    if (empty($discord_user['id'])) {
        wp_redirect(add_query_arg('discord_error', 'userinfo', home_url('/')));
        exit;
    }

    $discord_id       = sanitize_text_field($discord_user['id']);
    $discord_username = isset($discord_user['username']) ? sanitize_text_field($discord_user['username']) : '';
    $discord_email    = isset($discord_user['email']) && is_email($discord_user['email'])
                        ? sanitize_email($discord_user['email'])
                        : '';
    $discord_avatar   = '';
    if (!empty($discord_user['avatar'])) {
        $fmt = str_starts_with($discord_user['avatar'], 'a_') ? 'gif' : 'png';
        $discord_avatar = 'https://cdn.discordapp.com/avatars/' . $discord_id . '/' . $discord_user['avatar'] . '.' . $fmt . '?size=256';
    }
    $discord_global_name = isset($discord_user['global_name']) ? sanitize_text_field($discord_user['global_name']) : $discord_username;

    // â”€â”€ If user is already logged in â†’ link Discord to their existing account â”€
    if (is_user_logged_in()) {
        $current_user_id = get_current_user_id();

        // Block if this Discord ID is already bound to a different WP account
        $already_linked = get_users([
            'meta_key'   => 'discord_id',
            'meta_value' => $discord_id,
            'number'     => 1,
            'exclude'    => [$current_user_id],
            'fields'     => 'ids',
        ]);
        if (!empty($already_linked)) {
            $return_url = add_query_arg([
                'discord_error' => 'already_linked',
            ], home_url('/'));
            wp_redirect($return_url . '#settings');
            exit;
        }

        update_user_meta($current_user_id, 'discord_id', $discord_id);
        if ($discord_avatar && !get_user_meta($current_user_id, 'profile_avatar', true)) {
            update_user_meta($current_user_id, 'discord_avatar', $discord_avatar);
        }

        $return_url = add_query_arg([
            'discord_linked' => '1',
        ], home_url('/'));
        wp_redirect($return_url . '#settings');
        exit;
    }

    // â”€â”€ Not logged in: find or create WordPress user and log them in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    $wp_user = mangayummy_ya_discord_find_or_create_user(
        $discord_id,
        $discord_username,
        $discord_global_name,
        $discord_email,
        $discord_avatar
    );

    if (is_wp_error($wp_user)) {
        $error_code = $wp_user->get_error_code();
        if (empty($error_code)) {
            $error_code = 'discord_auth_failed';
        }
        wp_redirect(add_query_arg('discord_error', $error_code, home_url('/')));
        exit;
    }

    // â”€â”€ Log user in â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    wp_clear_auth_cookie();
    wp_set_current_user($wp_user->ID);
    wp_set_auth_cookie($wp_user->ID, true, is_ssl());

    wp_redirect(home_url('/'));
    exit;
}

/**
 * Look up a WP user by Discord ID, then by email.
 * If none found, create a new account.
 *
 * @return WP_User|WP_Error
 */
function mangayummy_ya_discord_find_or_create_user($discord_id, $discord_username, $discord_global_name, $discord_email, $discord_avatar) {
    // 1. Try to find existing user linked to this Discord ID
    $existing = get_users([
        'meta_key'   => 'discord_id',
        'meta_value' => $discord_id,
        'number'     => 1,
    ]);

    if (!empty($existing)) {
        $user = $existing[0];
        // Update avatar if user hasn't set a custom one
        if ($discord_avatar && !get_user_meta($user->ID, 'profile_avatar', true)) {
            update_user_meta($user->ID, 'discord_avatar', $discord_avatar);
        }
        return $user;
    }

    // 2. Try to find existing user by email (link accounts)
    if ($discord_email) {
        $user_by_email = get_user_by('email', $discord_email);
        if ($user_by_email) {
            update_user_meta($user_by_email->ID, 'discord_id', $discord_id);
            if ($discord_avatar && !get_user_meta($user_by_email->ID, 'profile_avatar', true)) {
                update_user_meta($user_by_email->ID, 'discord_avatar', $discord_avatar);
            }
            return $user_by_email;
        }
    }

    // 3. If no valid Discord email is available, avoid creating a duplicate account.
    if (!$discord_email) {
        return new WP_Error(
            'discord_email_required_link_existing',
            'Log in normally and link Discord from settings.'
        );
    }

    // 4. Create a new WordPress user
    $base_login = mangayummy_ya_discord_generate_username($discord_username ?: $discord_global_name);
    $user_login  = $base_login;
    $suffix      = 1;
    while (username_exists($user_login)) {
        $user_login = $base_login . $suffix;
        $suffix++;
    }

    // Use Discord global name (display name) trimmed to 20 chars
    $display_name = mb_substr($discord_global_name ?: $discord_username, 0, 20);

    $user_id = wp_insert_user([
        'user_login'   => $user_login,
        'user_email'   => $discord_email,
        'display_name' => $display_name,
        'user_pass'    => wp_generate_password(32),
        'role'         => 'subscriber',
    ]);

    if (is_wp_error($user_id)) {
        return $user_id;
    }

    // Store Discord metadata
    update_user_meta($user_id, 'discord_id',     $discord_id);
    update_user_meta($user_id, 'discord_avatar',  $discord_avatar);
    update_user_meta($user_id, 'email_verified',  1); // Discord emails are pre-verified
    update_user_meta($user_id, 'reader_xp',       0);
    update_user_meta($user_id, 'reader_level',    1);

    // Use Discord avatar as profile avatar if none set
    if ($discord_avatar) {
        update_user_meta($user_id, 'profile_avatar', $discord_avatar);
    }

    return get_user_by('ID', $user_id);
}

/**
 * Derive a safe WordPress username from a Discord username string.
 * Discord usernames allow: letters, numbers, underscores, periods, hyphens.
 */
function mangayummy_ya_discord_generate_username($name) {
    // Replace common non-alphanumeric chars with underscore
    $sanitized = preg_replace('/[^a-zA-Z0-9_\-]/', '', $name);
    $sanitized = trim($sanitized, '_-');
    $sanitized = substr($sanitized, 0, 20);

    if (empty($sanitized)) {
        $sanitized = 'discord_user';
    }

    return strtolower($sanitized);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Discord Webhook â€“ New Chapter Notifications
// Define this constant in wp-config.php:
//   define('DISCORD_WEBHOOK_URL', 'https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN');
// Discord Webhook â€“ New Comment Notifications (optional separate channel):
//   define('DISCORD_COMMENTS_WEBHOOK_URL', 'https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN');
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
if (!defined('DISCORD_WEBHOOK_URL')) {
    define('DISCORD_WEBHOOK_URL', '');
}
if (!defined('DISCORD_COMMENTS_WEBHOOK_URL')) {
    define('DISCORD_COMMENTS_WEBHOOK_URL', '');
}

/**
 * Send a payload to Discord webhook.
 *
 * @param array  $payload
 * @param string $webhook_url
 * @return bool
 */
function mangayummy_send_discord_webhook_payload($payload, $webhook_url = '') {
    $webhook_url = $webhook_url !== '' ? $webhook_url : (defined('DISCORD_WEBHOOK_URL') ? DISCORD_WEBHOOK_URL : '');
    if (empty($webhook_url)) {
        return false;
    }

    $json_payload = wp_json_encode($payload);
    if ($json_payload === false) {
        return false;
    }

    $log_file = get_template_directory() . '/discord_log.txt';
    $attempts = [];

    if (function_exists('curl_init')) {
        $ch = curl_init($webhook_url);
        if ($ch !== false) {
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $json_payload,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT        => 10,
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
            ]);

            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curl_error = curl_error($ch);
            curl_close($ch);

            if ($response !== false && $http_code >= 200 && $http_code < 300) {
                return true;
            }

            $attempts[] = 'curl response failed';
            $attempts[] = 'http_code=' . intval($http_code);
            if (!empty($curl_error)) {
                $attempts[] = 'curl_error=' . $curl_error;
            }
        } else {
            $attempts[] = 'curl_init failed';
        }
    } else {
        $attempts[] = 'curl extension not available';
    }

    $remote_args = [
        'body'       => $json_payload,
        'headers'    => ['Content-Type' => 'application/json'],
        'timeout'    => 15,
        'sslverify'  => true,
    ];

    $remote_result = wp_remote_post($webhook_url, $remote_args);
    if (!is_wp_error($remote_result)) {
        $remote_code = intval(wp_remote_retrieve_response_code($remote_result));
        if ($remote_code >= 200 && $remote_code < 300) {
            return true;
        }

        $attempts[] = 'wp_remote_post http_code=' . $remote_code;
        $attempts[] = 'response_body=' . substr(wp_remote_retrieve_body($remote_result), 0, 1024);
    } else {
        $attempts[] = 'wp_remote_post error=' . $remote_result->get_error_message();
    }

    $log_message = '[' . current_time('mysql') . '] Discord webhook failure\n';
    $log_message .= 'URL: ' . $webhook_url . '\n';
    $log_message .= 'Payload: ' . $json_payload . '\n';
    $log_message .= 'Attempts: ' . implode(' | ', $attempts) . '\n\n';
    @file_put_contents($log_file, $log_message, FILE_APPEND | LOCK_EX);

    return false;
}

/**
 * Send a Discord embed notification for a newly published chapter.
 *
 * @param string $mangaTitle    Display title of the manga series.
 * @param string $chapterNumber Chapter number / label (e.g. "42", "42.5").
 * @param string $chapterUrl    Full URL to the chapter page.
 * @param int    $mangaId       WordPress post ID of the manga (used to fetch the cover image).
 * @return bool                 True on HTTP 2xx response, false on failure.
 *
 * Usage example â€“ call immediately after a successful chapter INSERT:
 * -----------------------------------------------------------------------
 * $wpdb->insert('wp_posts', [ ... ]);   // your INSERT query
 * if ($wpdb->insert_id) {
 *     mangayummy_sendDiscordNotification(
 *         'One Piece',                // manga title
 *         '1100',                     // chapter number
 *         'https://mangayummy.com/manga/one-piece-capitolul-1100', // full chapter URL
 *         42                          // manga post ID (coperta se preia automat)
 *     );
 * }
 * -----------------------------------------------------------------------
 */
function mangayummy_sendDiscordNotification($mangaTitle, $chapterNumber, $chapterUrl, $mangaId) {
    $manga_title    = sanitize_text_field($mangaTitle);
    $chapter_number = sanitize_text_field($chapterNumber);
    $chapter_url    = esc_url_raw($chapterUrl);
    if (empty($chapter_url)) {
        return false;
    }

    // Fetch the manga cover from the WordPress post featured image
    $manga_id      = intval($mangaId);
    $thumbnail_url = $manga_id ? get_the_post_thumbnail_url($manga_id, 'full') : '';
    if (empty($thumbnail_url)) {
        $thumbnail_url = get_template_directory_uri() . '/assets/img/default-manga.jpg';
    }

    // Discord embed color: #13667a (MangaYummy accent red) â†’ decimal 16731471
    $payload = [
        'embeds' => [
            [
                'title'       => $manga_title . ' — Chapter ' . $chapter_number,
                'url'         => $chapter_url,
                'description' => 'A new chapter has been published! [Read now](' . $chapter_url . '),',
                'color'       => 16731471,
                'thumbnail'   => [
                    'url' => $thumbnail_url,
                ],
                'footer'      => [
                    'text' => 'MangaYummy',
                ],
                'timestamp'   => gmdate('Y-m-d\TH:i:s\Z'),
            ],
        ],
    ];

    return mangayummy_send_discord_webhook_payload($payload, defined('DISCORD_WEBHOOK_URL') ? DISCORD_WEBHOOK_URL : '');
}

/**
 * Send a Discord embed notification for a new website comment.
 * Works for comments posted on manga and chapter pages.
 *
 * @param int $commentId
 * @return bool
 */
function mangayummy_sendDiscordCommentNotification($commentId) {
    $comment_id = (int) $commentId;

    if ($comment_id <= 0) {
        return false;
    }

    $comment = get_comment($comment_id);
    if (!$comment) {
        return false;
    }

    $post_id = (int) $comment->comment_post_ID;
    if ($post_id <= 0) {
        return false;
    }

    $post = get_post($post_id);
    if (!$post) {
        return false;
    }

    if (!in_array($post->post_type, ['manga', 'chapter'], true)) {
        return false;
    }

    $manga_id = $post_id;
    if ($post->post_type === 'chapter') {
        $manga_id = (int) get_post_meta($post_id, '_manga_id', true);
        if (!$manga_id) {
            $manga_id = (int) wp_get_post_parent_id($post_id);
        }
    }

    $manga_title = $manga_id ? get_the_title($manga_id) : get_the_title($post_id);
    $author_name = sanitize_text_field(get_comment_author($comment));
    $comment_url = get_comment_link($comment_id);

    $comment_text = trim(wp_strip_all_tags((string) $comment->comment_content));
    if ($comment_text === '') {
        $comment_text = 'Empty comment.';
    }
    $comment_text = wp_html_excerpt($comment_text, 280, '...');

    $thumbnail_url = $manga_id ? get_the_post_thumbnail_url($manga_id, 'full') : '';
    if (empty($thumbnail_url)) {
        $thumbnail_url = get_template_directory_uri() . '/assets/img/default-manga.jpg';
    }

    $target_label = 'Manga';
    if ($post->post_type === 'chapter') {
        $chapter_number = get_post_meta($post_id, '_chapter_number', true);
        $target_label = $chapter_number !== '' ? ('Chapter ' . sanitize_text_field($chapter_number)) : 'New Chapter';
    }

    $comment_with_user = '@' . $author_name . ' ' . $comment_text;

    $payload = [
        'embeds' => [
            [
                'title'       => 'New comment on ' . sanitize_text_field($manga_title),
                'url'         => esc_url_raw($comment_url),
                'description' => 'User: **' . $author_name . "**\nCommented on: " . $target_label . "\n\n" . $comment_with_user,
                'color'       => 16731471,
                'thumbnail'   => [
                    'url' => esc_url_raw($thumbnail_url),
                ],
                'footer'      => [
                    'text' => 'MangaYummy • Comments',
                ],
                'timestamp'   => gmdate('Y-m-d\\TH:i:s\\Z'),
            ],
        ],
    ];

    $comments_webhook = defined('DISCORD_COMMENTS_WEBHOOK_URL') ? DISCORD_COMMENTS_WEBHOOK_URL : '';
    if (empty($comments_webhook)) {
        // Fallback to main webhook if comments-specific webhook is not configured.
        $comments_webhook = defined('DISCORD_WEBHOOK_URL') ? DISCORD_WEBHOOK_URL : '';
    }

    return mangayummy_send_discord_webhook_payload($payload, $comments_webhook);
}

