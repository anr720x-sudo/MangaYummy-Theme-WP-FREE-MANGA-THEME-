<?php
/**
 * Diagnostic Script for Specific User Profile Images
 * Shows exactly what's stored and what files exist
 */

if (!defined('ABSPATH')) {
    require_once('../../../wp-load.php');
}

if (!current_user_can('manage_options')) {
    wp_die('Access denied: Admins only');
}

$upload_dir = wp_upload_dir();
$basedir = $upload_dir['basedir'];
$baseurl = $upload_dir['baseurl'];

// Get user_id from GET or POST
$user_id = isset($_REQUEST['user_id']) ? intval($_REQUEST['user_id']) : 0;

?>
<div style="max-width: 900px; margin: 30px auto; font-family: monospace; background: #f5f5f5; padding: 20px; border-radius: 5px;">
    <h2>🔍 Diagnostic Profile Images</h2>
    
    <form method="GET" style="margin-bottom: 20px;">
        <label for="user_id">User ID:</label>
        <input type="number" name="user_id" id="user_id" value="<?php echo esc_attr($user_id); ?>" required>
        <button type="submit" class="button button-primary">Check User</button>
    </form>

    <?php if ($user_id > 0): ?>
        <hr>
        <?php
        $user = get_user_by('ID', $user_id);
        if (!$user) {
            echo '<p style="color: red;"><strong>❌ User not found</strong></p>';
        } else {
            echo '<p><strong>User:</strong> ' . esc_html($user->display_name) . ' (ID: ' . $user_id . ')</p>';
            
            // Check Avatar
            echo '<h3 style="margin-top: 20px;">Avatar (profile_avatar)</h3>';
            $avatar_url = get_user_meta($user_id, 'profile_avatar', true);
            $avatar_path = $avatar_url ? str_replace($baseurl, $basedir, $avatar_url) : null;
            $avatar_exists = $avatar_path ? file_exists($avatar_path) : false;
            
            echo '<div style="background: white; padding: 10px; border-left: 3px solid ' . ($avatar_exists ? 'green' : 'red') . ';">';
            echo '<p><strong>Stored URL:</strong></p>';
            echo '<code>' . ($avatar_url ? esc_html($avatar_url) : '(empty)') . '</code><br>';
            echo '<p><strong>File Path:</strong></p>';
            echo '<code>' . ($avatar_path ? esc_html($avatar_path) : '(no path)') . '</code><br>';
            echo '<p><strong>File Exists:</strong> ' . ($avatar_exists ? '✓ YES' : '✗ NO') . '</p>';
            
            if ($avatar_url) {
                echo '<p style="margin-top: 10px;"><img src="' . esc_url($avatar_url) . '?t=' . time() . '" style="max-width: 100px; height: 100px; object-fit: cover; border: 1px solid #ccc;"></p>';
            }
            echo '</div>';
            
            // Check Banner
            echo '<h3 style="margin-top: 20px;">Banner (profile_banner)</h3>';
            $banner_url = get_user_meta($user_id, 'profile_banner', true);
            $banner_path = $banner_url ? str_replace($baseurl, $basedir, $banner_url) : null;
            $banner_exists = $banner_path ? file_exists($banner_path) : false;
            
            echo '<div style="background: white; padding: 10px; border-left: 3px solid ' . ($banner_exists ? 'green' : 'red') . ';">';
            echo '<p><strong>Stored URL:</strong></p>';
            echo '<code>' . ($banner_url ? esc_html($banner_url) : '(empty)') . '</code><br>';
            echo '<p><strong>File Path:</strong></p>';
            echo '<code>' . ($banner_path ? esc_html($banner_path) : '(no path)') . '</code><br>';
            echo '<p><strong>File Exists:</strong> ' . ($banner_exists ? '✓ YES' : '✗ NO') . '</p>';
            
            if ($banner_url) {
                echo '<p style="margin-top: 10px;"><img src="' . esc_url($banner_url) . '?t=' . time() . '" style="max-width: 300px; height: 150px; object-fit: cover; border: 1px solid #ccc;"></p>';
            }
            echo '</div>';
            
            // Check for WebP alternatives
            if ($avatar_url && preg_match('/\.png$/i', $avatar_url)) {
                echo '<h3 style="color: orange;">⚠ Avatar is PNG - Check WebP Version</h3>';
                $avatar_webp_url = preg_replace('/\.png$/i', '.webp', $avatar_url);
                $avatar_webp_path = str_replace($baseurl, $basedir, $avatar_webp_url);
                $avatar_webp_exists = file_exists($avatar_webp_path);
                echo '<p><strong>WebP Path:</strong> <code>' . esc_html($avatar_webp_path) . '</code></p>';
                echo '<p><strong>WebP Exists:</strong> ' . ($avatar_webp_exists ? '✓ YES' : '✗ NO') . '</p>';
                if ($avatar_webp_exists) {
                    echo '<button class="button button-primary" onclick="fixAvatar(' . $user_id . ')">Fix to WebP</button>';
                }
            }
            
            if ($banner_url && preg_match('/\.png$/i', $banner_url)) {
                echo '<h3 style="color: orange;">⚠ Banner is PNG - Check WebP Version</h3>';
                $banner_webp_url = preg_replace('/\.png$/i', '.webp', $banner_url);
                $banner_webp_path = str_replace($baseurl, $basedir, $banner_webp_url);
                $banner_webp_exists = file_exists($banner_webp_path);
                echo '<p><strong>WebP Path:</strong> <code>' . esc_html($banner_webp_path) . '</code></p>';
                echo '<p><strong>WebP Exists:</strong> ' . ($banner_webp_exists ? '✓ YES' : '✗ NO') . '</p>';
                if ($banner_webp_exists) {
                    echo '<button class="button button-primary" onclick="fixBanner(' . $user_id . ')">Fix to WebP</button>';
                }
            }
            
            // Show default images
            echo '<h3 style="margin-top: 20px;">Default Images (fallback)</h3>';
            $default_avatar = get_template_directory_uri() . '/assets/img/default-avatar.png';
            $default_banner = get_template_directory_uri() . '/images/default-banner.jpg';
            echo '<p><strong>Default Avatar:</strong> <code>' . esc_html($default_avatar) . '</code></p>';
            echo '<p><strong>Default Banner:</strong> <code>' . esc_html($default_banner) . '</code></p>';
        }
        ?>
    <?php endif; ?>
</div>

<script>
function fixAvatar(userId) {
    const newUrl = prompt('Enter new avatar URL (or leave empty to clear):');
    if (newUrl !== null) {
        fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'diagnostic_fix_meta',
                nonce: '<?php echo wp_create_nonce('diagnostic_fix'); ?>',
                user_id: userId,
                meta_key: 'profile_avatar',
                meta_value: newUrl
            })
        }).then(r => r.json()).then(data => {
            if (data.success) {
                alert('✓ Fixed! Reloading...');
                location.reload();
            } else {
                alert('✗ Error: ' + (data.data?.message || 'Unknown error'));
            }
        });
    }
}

function fixBanner(userId) {
    const newUrl = prompt('Enter new banner URL (or leave empty to clear):');
    if (newUrl !== null) {
        fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'diagnostic_fix_meta',
                nonce: '<?php echo wp_create_nonce('diagnostic_fix'); ?>',
                user_id: userId,
                meta_key: 'profile_banner',
                meta_value: newUrl
            })
        }).then(r => r.json()).then(data => {
            if (data.success) {
                alert('✓ Fixed! Reloading...');
                location.reload();
            } else {
                alert('✗ Error: ' + (data.data?.message || 'Unknown error'));
            }
        });
    }
}
</script>
<?php
?>
