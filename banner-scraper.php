<?php
/**
 * Banner Scraper - Extrage banner din URL extern
 * Exemplu: banner-scraper.php?url=https://mangadistrict.com/title/the-beast-of-blue-obsidian-official/
 */

if (!isset($_GET['url'])) {
    wp_send_json_error(['message' => 'URL required']);
    exit;
}

$url = sanitize_url($_GET['url']);

if (empty($url)) {
    wp_send_json_error(['message' => 'Invalid URL']);
    exit;
}

// Fetch pagina
$response = wp_remote_get($url, [
    'timeout' => 10,
    'sslverify' => false,
    'headers' => [
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    ]
]);

if (is_wp_error($response)) {
    wp_send_json_error(['message' => 'Failed to fetch page']);
    exit;
}

$body = wp_remote_retrieve_body($response);

// Search for images with og:image meta, main images, or background
$banner_url = '';

// Metoda 1: OG:image
if (preg_match('/<meta\s+property=["\']og:image["\']\s+content=["\']([^"\']+)["\']/', $body, $matches)) {
    $banner_url = $matches[1];
}

// Method 2: Search for img with class ~cover/banner/hero
if (empty($banner_url) && preg_match('/<img[^>]*class=["\']([^"\']*(?:cover|banner|hero|thumb)[^"\']*)["\'][^>]*src=["\']([^"\']+)["\']/', $body, $matches)) {
    $banner_url = $matches[2];
}

// Metoda 3: Prima imagine din container
if (empty($banner_url) && preg_match('/<div[^>]*class=["\'](?:post-cover|manga-cover)[^>]*>.*?<img[^>]*src=["\']([^"\']+)["\']/', $body, $matches)) {
    $banner_url = $matches[1];
}

// Method 4: Search for background-image
if (empty($banner_url) && preg_match('/background-image\s*:\s*url\(["\']?([^"\')\s]+)["\']?\)/', $body, $matches)) {
    $banner_url = $matches[1];
}

if (empty($banner_url)) {
    wp_send_json_error(['message' => 'No banner found']);
    exit;
}

// Ensure relative URL -> absolute
if (strpos($banner_url, 'http') !== 0) {
    $base_url = parse_url($url);
    $base_url = $base_url['scheme'] . '://' . $base_url['host'];
    if (strpos($banner_url, '/') === 0) {
        $banner_url = $base_url . $banner_url;
    } else {
        $banner_url = $base_url . '/' . $banner_url;
    }
}

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'banner_url' => esc_url($banner_url),
    'original_url' => esc_url($url)
]);
exit;
