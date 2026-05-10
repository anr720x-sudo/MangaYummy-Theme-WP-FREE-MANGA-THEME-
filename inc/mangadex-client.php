<?php
/**
 * MangaDex API client wrapper â€” caching, background refresh, cron-safe refresh queue.
 * Goals:
 * - Mandatory caching (no API call on every page load)
 * - Stale-while-revalidate: serve cached data and refresh in background
 * - Locking to avoid cache stampede
 * - Scheduled queue processor to refresh items at controlled rate (2-3 simultaneous)
 * - Configurable TTLs for different data types
 */

if (!defined('ABSPATH')) exit;

// Default TTLs (can be filtered)
define('MANGAdex_TTL_MANGA_INFO', apply_filters('mangadex_ttl_manga_info', 4 * HOUR_IN_SECONDS));
define('MANGAdex_TTL_CHAPTER_LIST', apply_filters('mangadex_ttl_chapter_list', 10 * MINUTE_IN_SECONDS));
define('MANGAdex_TTL_COVER', apply_filters('mangadex_ttl_cover', DAY_IN_SECONDS));
define('MANGAdex_TTL_AT_HOME', apply_filters('mangadex_ttl_at_home', 30 * MINUTE_IN_SECONDS));

// Rate & concurrency limits for background queue processor
define('MANGAdex_MAX_PARALLEL', apply_filters('mangadex_max_parallel_requests', 3));
define('MANGAdex_MAX_PER_SECOND', apply_filters('mangadex_max_requests_per_second', 4));

// Compatibility lock helpers: use site-transients when available, fallback to local transients
function mangayummy_mangadex_lock_acquire($key, $value, $ttl) {
    // Prefer site-transients (multisite-safe and atomic if available)
    if (function_exists('add_site_transient')) {
        return add_site_transient($key, $value, $ttl);
    }
    // Fallback: attempt non-atomic add semantics
    if (get_transient($key) !== false) return false;
    return set_transient($key, $value, $ttl);
}

function mangayummy_mangadex_lock_release($key) {
    if (function_exists('delete_site_transient')) {
        return delete_site_transient($key);
    }
    return delete_transient($key);
}

/**
 * Generate a stable cache key for an API URL + params
 */
function mangayummy_mangadex_cache_key_for_url($url, $args = array()) {
    return 'mdx_api_' . md5($url . '|' . serialize($args));
}

/**
 * Centralized API getter with caching + stale-while-revalidate + locking
 * Returns decoded JSON array on success, WP_Error on error, or false when unavailable.
 */
function mangayummy_mangadex_api_get_cached($url, $args = array(), $ttl = 300, $stale_ttl = 3600) {
    $cache_key = mangayummy_mangadex_cache_key_for_url($url, $args);
    $lock_key = $cache_key . '_lock';

    // Try cached value first
    $cached = get_transient($cache_key);
    if (defined('WP_DEBUG') && WP_DEBUG) {
    }
    if (!empty($cached) && isset($cached['fetched_at'])) {
        $age = time() - intval($cached['fetched_at']);
        if ($age < $ttl) {
            // fresh
            return $cached['data'];
        }
        // stale but usable -> schedule background refresh and return stale
        if ($age < $stale_ttl) {
            // schedule async refresh (non-blocking)
            mangayummy_mangadex_schedule_refresh($cache_key, $url, $args, $ttl, $stale_ttl);
            return $cached['data'];
        }
    }

    // No cached or expired beyond stale ttl â€” attempt to refresh now but avoid stampede
    // Acquire a short lock so only one request fetches real API
    $got_lock = mangayummy_mangadex_lock_acquire($lock_key, 1, 30); // 30s lock
    if (defined('WP_DEBUG') && WP_DEBUG) {
    }

    if ($got_lock) {
        // We acquired the lock â€” perform the request and cache the result
        $result = mangayummy_mangadex_perform_request_and_cache($url, $args, $cache_key, $stale_ttl);
        mangayummy_mangadex_lock_release($lock_key);
        if (defined('WP_DEBUG') && WP_DEBUG) {
            if (is_wp_error($result)) {
            } else {
            }
        }
        return $result;
    }

    // We did NOT get the lock. Previously this branch returned an error when no cached data existed.
    // Instead, attempt to fetch the data directly (best-effort). If that fails and we have stale cached data, return the cached data.
    if (defined('WP_DEBUG') && WP_DEBUG) {
    }

    $direct_result = mangayummy_mangadex_perform_request_and_cache($url, $args, $cache_key, $stale_ttl);
    if (defined('WP_DEBUG') && WP_DEBUG) {
        if (is_wp_error($direct_result)) {
        } else {
        }
    }

    if (!is_wp_error($direct_result)) {
        return $direct_result;
    }

    // If direct fetch failed, but we have stale cached data, return it as a fallback
    if (!empty($cached) && isset($cached['data'])) {
        if (defined('WP_DEBUG') && WP_DEBUG) {
        }
        return $cached['data'];
    }

    if (defined('WP_DEBUG') && WP_DEBUG) {
    }

    return new WP_Error('mangadex_unavailable', 'MangaDex data temporarily unavailable');
}

/**
 * Perform the HTTP request (with light rate limiting) and store in transient cache
 */
function mangayummy_mangadex_perform_request_and_cache($url, $args, $cache_key, $cache_ttl) {
    // Basic rate-limit check (best-effort)
    if (!mangayummy_mangadex_rate_allow_request()) {
        return new WP_Error('rate_limited', 'Rate limit reached â€” try later');
    }

    $default = array('timeout' => 8, 'headers' => array('User-Agent' => 'MangaYummy/1.0 (mangadex-client)'));
    $args = wp_parse_args($args, $default);

    $response = wp_remote_get($url, $args);
    if (is_wp_error($response)) {
        // If there is old cache, extend it slightly to avoid showing blank
        $old = get_transient($cache_key);
        if (!empty($old)) {
            // extend cached TTL by 5 minutes
            set_transient($cache_key, $old, MINUTE_IN_SECONDS * 5);
        }
        return $response;
    }

    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);

    if ($code !== 200) {
        // If 429, set a short global backoff flag
        if ($code === 429) {
            set_transient('mangadex_global_backoff', 1, 60); // backoff 60s
        }
        return new WP_Error('http_error', 'HTTP ' . $code);
    }

    $data = json_decode($body, true);
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        return new WP_Error('json_error', json_last_error_msg());
    }

    // IMPORTANT: Do NOT cache At-Home server responses because the CDN hashes are
    // ephemeral and caching them causes 404s when hashes rotate.
    if (strpos($url, '/at-home/server/') !== false) {
        return $data; // DO NOT CACHE
    }

    // Save to transient with fetched_at metadata; expire after $cache_ttl (stale window stored as 'data')
    $store = array('data' => $data, 'fetched_at' => time());
    set_transient($cache_key, $store, $cache_ttl);

    return $data;
}

/**
 * Schedule a background refresh for a cache key (queue + cron processor)
 */
function mangayummy_mangadex_schedule_refresh($cache_key, $url, $args = array(), $ttl = 300, $stale_ttl = 3600) {
    // If global backoff is active, skip scheduling
    if (get_transient('mangadex_global_backoff')) return false;

    $queue = get_transient('mangadex_refresh_queue');
    if (!is_array($queue)) $queue = array();

    if (isset($queue[$cache_key])) return true; // already queued

    $queue[$cache_key] = array('url' => $url, 'args' => $args, 'ttl' => $ttl, 'stale_ttl' => $stale_ttl, 'added' => time());
    set_transient('mangadex_refresh_queue', $queue, 12 * HOUR_IN_SECONDS);

    // Ensure cron event exists (fires every minute)
    if (!wp_next_scheduled('mangadex_process_refresh_queue')) {
        wp_schedule_event(time() + 5, 'mangadex_every_minute', 'mangadex_process_refresh_queue');
    }

    return true;
}

/**
 * Add custom cron schedule "every_minute"
 */
add_filter('cron_schedules', function($schedules) {
    if (!isset($schedules['mangadex_every_minute'])) {
        $schedules['mangadex_every_minute'] = array('interval' => 60, 'display' => 'Every Minute (mangadex)');
    }
    return $schedules;
});

/**
 * Cron worker: process refresh queue up to MANGAdex_MAX_PARALLEL items
 */
add_action('mangadex_process_refresh_queue', function() {
    $queue = get_transient('mangadex_refresh_queue');
    if (!is_array($queue) || empty($queue)) return;

    // Process up to MAX_PARALLEL items per run
    $to_process = array_slice($queue, 0, MANGAdex_MAX_PARALLEL, true);

    foreach ($to_process as $cache_key => $task) {
        // Respect global backoff
        if (get_transient('mangadex_global_backoff')) continue;

        // Acquire lock for this key
        $lock_key = $cache_key . '_lock';
        $got = mangayummy_mangadex_lock_acquire($lock_key, 1, 30);
        if (!$got) continue;

        // Perform request (do not block scheduler longer than necessary)
        $res = mangayummy_mangadex_perform_request_and_cache($task['url'], $task['args'], $cache_key, $task['stale_ttl']);

        // Remove from queue regardless of outcome (so it can be requeued later if needed)
        $queue = get_transient('mangadex_refresh_queue') ?: array();
        if (isset($queue[$cache_key])) {
            unset($queue[$cache_key]);
            set_transient('mangadex_refresh_queue', $queue, 12 * HOUR_IN_SECONDS);
        }

        mangayummy_mangadex_lock_release($lock_key);

        // Small pause to avoid bursting against Mangadex
        usleep(300000); // 300ms
    }
});

/**
 * Best-effort rate allowance: allow up to MANGAdex_MAX_PER_SECOND per second
 * Returns true if allowed, false otherwise.
 */
function mangayummy_mangadex_rate_allow_request() {
    // If global backoff is set, deny
    if (get_transient('mangadex_global_backoff')) return false;

    $key = 'mangadex_rate_window_' . floor(time());
    $count = get_transient($key);
    if ($count === false) {
        set_transient($key, 1, 2); // keep for 2s window
        return true;
    }
    if (intval($count) >= MANGAdex_MAX_PER_SECOND) {
        return false;
    }
    set_transient($key, intval($count) + 1, 2);
    return true;
}

/**
 * High-level helpers for common MangaDex endpoints
 */
function mangayummy_mangadex_get_manga_info($manga_id) {
    if (empty($manga_id)) return new WP_Error('invalid_id', 'Missing manga id');
    $url = 'https://api.mangadex.org/manga/' . rawurlencode($manga_id) . '?includes[]=author&includes[]=artist&includes[]=cover_art';
    return mangayummy_mangadex_api_get_cached($url, array(), MANGAdex_TTL_MANGA_INFO, 12 * HOUR_IN_SECONDS);
}

function mangayummy_mangadex_get_chapter_list($manga_id) {
    if (empty($manga_id)) return new WP_Error('invalid_id', 'Missing manga id');
    $url = 'https://api.mangadex.org/chapter?manga=' . rawurlencode($manga_id) . '&limit=500&includes[]=scanlation_group&order[chapter]=asc&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic';
    return mangayummy_mangadex_api_get_cached($url, array(), MANGAdex_TTL_CHAPTER_LIST, 60 * MINUTE_IN_SECONDS);
}

function mangayummy_mangadex_get_chapter_at_home_server($chapter_id) {
    if (empty($chapter_id)) return new WP_Error('invalid_id', 'Missing chapter id');
    $url = 'https://api.mangadex.org/at-home/server/' . rawurlencode($chapter_id);
    // IMPORTANT: At-Home server responses contain ephemeral hashes. Do NOT serve
    // potentially-stale cached data for image generation â€” always fetch fresh.
    // Historically this used a longer cache TTL; change to direct fetch to
    // guarantee up-to-date `baseUrl` and `chapter.hash`.
    if (function_exists('mangayummy_mangadex_get_chapter_at_home_server_direct')) {
        return mangayummy_mangadex_get_chapter_at_home_server_direct($chapter_id);
    }

    // Fallback: if direct helper missing, perform a short cached fetch (5 minutes)
    return mangayummy_mangadex_api_get_cached($url, array(), 5 * MINUTE_IN_SECONDS, 10 * MINUTE_IN_SECONDS);
}

/**
 * Direct At-Home API fetch WITHOUT using the caching layer.
 * Use this when a fresh hash must be retrieved on every request.
 */
function mangayummy_mangadex_get_chapter_at_home_server_direct($chapter_id) {
    if (empty($chapter_id)) return new WP_Error('invalid_id', 'Missing chapter id');
    $url = 'https://api.mangadex.org/at-home/server/' . rawurlencode($chapter_id);

    // Basic request (mirror important args from mangayummy_mangadex_perform_request_and_cache)
    $args = array('timeout' => 8, 'headers' => array('User-Agent' => 'MangaYummy/1.0 (mangadex-client-direct)'));
    $response = wp_remote_get($url, $args);
    if (is_wp_error($response)) {
        return $response;
    }
    $code = wp_remote_retrieve_response_code($response);
    $body = wp_remote_retrieve_body($response);
    if ($code !== 200) {
        if ($code === 429) {
            set_transient('mangadex_global_backoff', 1, 60);
        }
        return new WP_Error('http_error', 'HTTP ' . $code);
    }
    $data = json_decode($body, true);
    if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
        return new WP_Error('json_error', json_last_error_msg());
    }

    return $data;
}

function mangayummy_mangadex_get_manga_cover_url($manga_id, $fileName = '') {
    if (empty($manga_id) || empty($fileName)) return '';
    return 'https://uploads.mangadex.org/covers/' . rawurlencode($manga_id) . '/' . rawurlencode($fileName) . '.512.jpg';
}

/**
 * Admin helper: force refresh cache for a specific cache key (useful for manual invalidation)
 */
function mangayummy_mangadex_invalidate_cache($cache_key) {
    delete_transient($cache_key);
    // enqueue refresh
    $queue = get_transient('mangadex_refresh_queue') ?: array();
    if (!isset($queue[$cache_key])) {
        $queue[$cache_key] = array('forced' => true, 'added' => time());
        set_transient('mangadex_refresh_queue', $queue, 12 * HOUR_IN_SECONDS);
    }
}

// Expose for other includes
// require_once get_template_directory() . '/inc/mangadex-client.php'; // included from functions.php

