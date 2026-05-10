<?php
/**
 * Create Default Avatar
 * 
 * Place this file in your WordPress root directory and access it via browser
 * or run: php create-default-avatar.php
 * 
 * This script creates a minimal default avatar at:
 * /wp-content/uploads/default-avatar.png
 */

// Define WordPress root (adjust if needed)
if (!defined('ABSPATH')) {
    define('ABSPATH', dirname(__FILE__) . '/');
}

// Ensure wp-content/uploads exists
$uploads_dir = ABSPATH . 'wp-content/uploads';
if (!is_dir($uploads_dir)) {
    mkdir($uploads_dir, 0755, true);
    echo "Created uploads directory: $uploads_dir\n";
}

// Create a minimal 1x1 transparent PNG (66 bytes)
$png_data = base64_decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
);

$default_avatar_path = $uploads_dir . '/default-avatar.png';
$bytes_written = file_put_contents($default_avatar_path, $png_data);

if ($bytes_written !== false) {
    echo "✓ Default avatar created successfully at: $default_avatar_path\n";
    echo "  File size: " . filesize($default_avatar_path) . " bytes\n";
    echo "  URL: " . site_url('/wp-content/uploads/default-avatar.png') . "\n";
} else {
    echo "✗ Failed to create default avatar. Check directory permissions.\n";
    exit(1);
}
?>
