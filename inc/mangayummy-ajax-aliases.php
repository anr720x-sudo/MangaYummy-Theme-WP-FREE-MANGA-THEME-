<?php
/**
 * Temporary legacy AJAX endpoint aliases.
 *
 * Keep old endpoints functional while JS migrates to mangayummy_* actions.
 * Remove this file in v2.0 after all clients use new action names.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!function_exists('mangayummy_register_legacy_ajax_alias')) {
    /**
     * Register a legacy hook alias only when the legacy hook has no callbacks.
     * This prevents duplicate execution while old handlers are still registered.
     */
    function mangayummy_register_legacy_ajax_alias($legacy_hook, $new_hook, $new_handler = '', $legacy_handler = '') {
        if (has_action($legacy_hook) !== false) {
            return;
        }

        add_action($legacy_hook, function () use ($legacy_hook, $new_hook, $new_handler, $legacy_handler) {
            if ($new_handler && function_exists($new_handler)) {
                call_user_func($new_handler);
                return;
            }

            if ($new_hook && $new_hook !== $legacy_hook && has_action($new_hook) !== false) {
                do_action($new_hook);
                return;
            }

            if ($legacy_handler && function_exists($legacy_handler)) {
                call_user_func($legacy_handler);
                return;
            }

            if (!headers_sent()) {
                status_header(500);
            }
            wp_die(esc_html__('Legacy AJAX alias is not configured correctly.', 'mangayummy'));
        }, 1);
    }
}

if (!function_exists('mangayummy_register_all_legacy_ajax_aliases')) {
    function mangayummy_register_all_legacy_ajax_aliases() {
        $aliases = [
            ['wp_ajax_mangayummy_ajax-tag-search', 'wp_ajax_mangayummy_ajax-tag-search', '', ''],
            ['wp_ajax_mangayummy_toggle_bookmark', 'wp_ajax_mangayummy_toggle_bookmark', 'mangayummy_toggle_bookmark', 'mangayummy_toggle_bookmark'],
            ['wp_ajax_mangayummy_ya_get_recent_searches', 'wp_ajax_mangayummy_ya_get_recent_searches', 'mangayummy_ya_get_recent_searches', 'mangayummy_ya_get_recent_searches'],
            ['wp_ajax_mangayummy_ya_save_recent_searches', 'wp_ajax_mangayummy_ya_save_recent_searches', 'mangayummy_ya_save_recent_searches', 'mangayummy_ya_save_recent_searches'],
            ['wp_ajax_mangayummy_rate_manga', 'wp_ajax_mangayummy_rate_manga', 'mangayummy_manga_rate', 'mangayummy_manga_rate'],
            ['wp_ajax_mangayummy_load_genres', 'wp_ajax_mangayummy_load_genres', 'mangayummy_load_genres', 'mangayummy_load_genres'],
            ['wp_ajax_nopriv_mangayummy_load_genres', 'wp_ajax_nopriv_mangayummy_load_genres', 'mangayummy_load_genres', 'mangayummy_load_genres'],
            ['wp_ajax_mangayummy_load_authors', 'wp_ajax_mangayummy_load_authors', 'mangayummy_load_authors', 'mangayummy_load_authors'],
            ['wp_ajax_nopriv_mangayummy_load_authors', 'wp_ajax_nopriv_mangayummy_load_authors', 'mangayummy_load_authors', 'mangayummy_load_authors'],
            ['wp_ajax_mangayummy_load_artists', 'wp_ajax_mangayummy_load_artists', 'mangayummy_load_artists', 'mangayummy_load_artists'],
            ['wp_ajax_nopriv_mangayummy_load_artists', 'wp_ajax_nopriv_mangayummy_load_artists', 'mangayummy_load_artists', 'mangayummy_load_artists'],
            ['wp_ajax_mangayummy_ya_live_search', 'wp_ajax_mangayummy_ya_live_search', 'mangayummy_ya_live_search', 'mangayummy_ya_live_search'],
            ['wp_ajax_nopriv_mangayummy_ya_live_search', 'wp_ajax_nopriv_mangayummy_ya_live_search', 'mangayummy_ya_live_search', 'mangayummy_ya_live_search'],
            ['wp_ajax_mangayummy_ya_popular_by_period', 'wp_ajax_mangayummy_ya_popular_by_period', 'mangayummy_ya_popular_by_period', 'mangayummy_ya_popular_by_period'],
            ['wp_ajax_nopriv_mangayummy_ya_popular_by_period', 'wp_ajax_nopriv_mangayummy_ya_popular_by_period', 'mangayummy_ya_popular_by_period', 'mangayummy_ya_popular_by_period'],
            ['wp_ajax_mangayummy_manga_rate', 'wp_ajax_mangayummy_manga_rate', 'mangayummy_manga_rate', 'mangayummy_manga_rate'],
            ['wp_ajax_nopriv_mangayummy_manga_rate', 'wp_ajax_nopriv_mangayummy_manga_rate', 'mangayummy_manga_rate', 'mangayummy_manga_rate'],
            ['wp_ajax_mangayummy_check_username_available', 'wp_ajax_mangayummy_check_username_available', 'mangayummy_check_username_available_ajax', 'mangayummy_check_username_available_ajax'],
            ['wp_ajax_mangayummy_save_birthday', 'wp_ajax_mangayummy_save_birthday', 'mangayummy_save_birthday', ''],
            ['wp_ajax_mangayummy_save_gender', 'wp_ajax_mangayummy_save_gender', 'mangayummy_save_gender', ''],
            ['wp_ajax_mangayummy_save_bio', 'wp_ajax_mangayummy_save_bio', 'mangayummy_save_bio', ''],
            ['wp_ajax_mangayummy_ya_discord_disconnect', 'wp_ajax_mangayummy_ya_discord_disconnect', 'mangayummy_ya_discord_disconnect', ''],
            ['wp_ajax_mangayummy_save_reader_prefs', 'wp_ajax_mangayummy_save_reader_prefs', 'mangayummy_save_reader_prefs', ''],
            ['wp_ajax_mangayummy_upload_profile_banner', 'wp_ajax_mangayummy_upload_profile_banner', 'mangayummy_upload_profile_banner', 'mangayummy_upload_profile_banner'],
            ['wp_ajax_mangayummy_ya_upload_avatar', 'wp_ajax_mangayummy_ya_upload_avatar', 'mangayummy_ya_upload_avatar', 'mangayummy_ya_upload_avatar'],
            ['wp_ajax_mangayummy_report_comment', 'wp_ajax_mangayummy_report_comment', 'mangayummy_report_comment', ''],
            ['wp_ajax_nopriv_mangayummy_report_comment', 'wp_ajax_nopriv_mangayummy_report_comment', 'mangayummy_report_comment', ''],
            ['wp_ajax_mangayummy_mark_notif_read', 'wp_ajax_mangayummy_mark_notif_read', 'mangayummy_mark_notif_read', ''],
            ['wp_ajax_mangayummy_get_notifications', 'wp_ajax_mangayummy_get_notifications', 'mangayummy_get_notifications', ''],
            ['wp_ajax_mangayummy_check_auth', 'wp_ajax_mangayummy_check_auth', 'mangayummy_check_auth', 'mangayummy_check_auth'],
            ['wp_ajax_nopriv_mangayummy_check_auth', 'wp_ajax_nopriv_mangayummy_check_auth', 'mangayummy_check_auth', 'mangayummy_check_auth'],
            ['wp_ajax_mangayummy_get_unread_messages_count', 'wp_ajax_mangayummy_get_unread_messages_count', 'mangayummy_get_unread_messages_count', ''],
            ['wp_ajax_mangayummy_test_authors', 'wp_ajax_mangayummy_test_authors', 'mangayummy_test_authors_ajax', 'mangayummy_test_authors_ajax'],
            ['wp_ajax_nopriv_mangayummy_test_authors', 'wp_ajax_nopriv_mangayummy_test_authors', 'mangayummy_test_authors_ajax', 'mangayummy_test_authors_ajax'],
            ['wp_ajax_mangayummy_test_artists', 'wp_ajax_mangayummy_test_artists', 'mangayummy_test_artists_ajax', 'mangayummy_test_artists_ajax'],
            ['wp_ajax_nopriv_mangayummy_test_artists', 'wp_ajax_nopriv_mangayummy_test_artists', 'mangayummy_test_artists_ajax', 'mangayummy_test_artists_ajax'],
            ['wp_ajax_mangayummy_test_genres', 'wp_ajax_mangayummy_test_genres', 'mangayummy_test_genres_ajax', 'mangayummy_test_genres_ajax'],
            ['wp_ajax_nopriv_mangayummy_test_genres', 'wp_ajax_nopriv_mangayummy_test_genres', 'mangayummy_test_genres_ajax', 'mangayummy_test_genres_ajax'],
            ['wp_ajax_mangayummy_test_manga', 'wp_ajax_mangayummy_test_manga', 'mangayummy_test_manga_ajax', 'mangayummy_test_manga_ajax'],
            ['wp_ajax_nopriv_mangayummy_test_manga', 'wp_ajax_nopriv_mangayummy_test_manga', 'mangayummy_test_manga_ajax', 'mangayummy_test_manga_ajax'],
            ['wp_ajax_mangayummy_get_random_manga', 'wp_ajax_mangayummy_get_random_manga', 'mangayummy_get_random_manga_ajax', 'mangayummy_get_random_manga_ajax'],
            ['wp_ajax_nopriv_mangayummy_get_random_manga', 'wp_ajax_nopriv_mangayummy_get_random_manga', 'mangayummy_get_random_manga_ajax', 'mangayummy_get_random_manga_ajax'],
            ['wp_ajax_nopriv_mangayummy_ya_discord_auth_url', 'wp_ajax_nopriv_mangayummy_ya_discord_auth_url', 'mangayummy_ya_discord_auth_url', 'mangayummy_ya_discord_auth_url'],
            ['wp_ajax_mangayummy_ya_discord_auth_url', 'wp_ajax_mangayummy_ya_discord_auth_url', 'mangayummy_ya_discord_auth_url', 'mangayummy_ya_discord_auth_url'],
            ['wp_ajax_nopriv_mangayummy_ya_login', 'wp_ajax_nopriv_mangayummy_ya_login', 'mangayummy_ya_handle_login', 'mangayummy_ya_handle_login'],
            ['wp_ajax_mangayummy_ya_login', 'wp_ajax_mangayummy_ya_login', 'mangayummy_ya_handle_login', 'mangayummy_ya_handle_login'],
            ['wp_ajax_nopriv_mangayummy_ya_forgot_password', 'wp_ajax_nopriv_mangayummy_ya_forgot_password', 'mangayummy_ya_handle_forgot_password', 'mangayummy_ya_handle_forgot_password'],
            ['wp_ajax_mangayummy_ya_forgot_password', 'wp_ajax_mangayummy_ya_forgot_password', 'mangayummy_ya_handle_forgot_password', 'mangayummy_ya_handle_forgot_password'],
            ['wp_ajax_nopriv_mangayummy_ya_register', 'wp_ajax_nopriv_mangayummy_ya_register', 'mangayummy_ya_handle_register', 'mangayummy_ya_handle_register'],
        ];

        foreach ($aliases as $alias) {
            mangayummy_register_legacy_ajax_alias($alias[0], $alias[1], $alias[2], $alias[3]);
        }
    }
}

add_action('init', 'mangayummy_register_all_legacy_ajax_aliases', 30);

