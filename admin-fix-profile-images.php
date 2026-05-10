<?php
/**
 * Admin Tool: Fix Profile Images URL Mismatch
 * When images are converted from JPG/PNG to WebP, URLs in metadata need updating
 * 
 * Usage: Access as admin at /wp-admin/admin.php?page=fix_profile_images
 */

// Load WordPress if not already loaded
if (!defined('ABSPATH')) {
    require_once('../../../wp-load.php');
}

// Security check
if (!current_user_can('manage_options')) {
    wp_die('Access denied');
}

$upload_dir = wp_upload_dir();
$basedir = $upload_dir['basedir'];
$baseurl = $upload_dir['baseurl'];

// Handle repair for specific user
if (isset($_POST['fix_user_id']) && isset($_POST['action']) && $_POST['action'] === 'fix_images') {
    check_admin_referer('fix_profile_images_nonce');
    
    $user_id = intval($_POST['fix_user_id']);
    $user = get_user_by('ID', $user_id);
    
    if (!$user) {
        $error = "User not found";
    } else {
        $fixed = 0;
        $messages = array();
        
        // Fix avatar
        $avatar = get_user_meta($user_id, 'profile_avatar', true);
        if ($avatar && preg_match('/\.(jpg|jpeg|png)$/i', $avatar)) {
            $avatar_webp = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $avatar);
            $avatar_webp_path = str_replace($baseurl, $basedir, $avatar_webp);
            
            if (file_exists($avatar_webp_path)) {
                update_user_meta($user_id, 'profile_avatar', $avatar_webp);
                $messages[] = "✓ Avatar updated: " . basename($avatar) . " → " . basename($avatar_webp);
                $fixed++;
            }
        }
        
        // Fix banner
        $banner = get_user_meta($user_id, 'profile_banner', true);
        if ($banner && preg_match('/\.(jpg|jpeg|png)$/i', $banner)) {
            $banner_webp = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $banner);
            $banner_webp_path = str_replace($baseurl, $basedir, $banner_webp);
            
            if (file_exists($banner_webp_path)) {
                update_user_meta($user_id, 'profile_banner', $banner_webp);
                $messages[] = "✓ Banner updated: " . basename($banner) . " → " . basename($banner_webp);
                $fixed++;
            }
        }
        
        $success = $fixed > 0 ? "Fixed {$fixed} image(s) for user {$user_id}" : "No images needed fixing for this user";
    }
}

// Scan all users to find broken images
$broken_users = array();
$all_users = get_users(['fields' => 'ID']);

foreach ($all_users as $uid) {
    $avatar = get_user_meta($uid, 'profile_avatar', true);
    $banner = get_user_meta($uid, 'profile_banner', true);
    
    $has_broken = false;
    $issues = array();
    
    if ($avatar && preg_match('/\.(jpg|jpeg|png)$/i', $avatar)) {
        $avatar_path = str_replace($baseurl, $basedir, $avatar);
        if (!file_exists($avatar_path)) {
            $has_broken = true;
            $issues[] = "Missing avatar: " . basename($avatar);
        }
    }
    
    if ($banner && preg_match('/\.(jpg|jpeg|png)$/i', $banner)) {
        $banner_path = str_replace($baseurl, $basedir, $banner);
        if (!file_exists($banner_path)) {
            $has_broken = true;
            $issues[] = "Missing banner: " . basename($banner);
        }
    }
    
    if ($has_broken) {
        $user = get_user_by('ID', $uid);
        $broken_users[] = array(
            'id' => $uid,
            'name' => $user ? $user->display_name : 'Unknown',
            'email' => $user ? $user->user_email : '',
            'issues' => $issues,
            'avatar_url' => $avatar,
            'banner_url' => $banner
        );
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>Fix Profile Images</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 20px; }
        .wrap { max-width: 900px; background: white; padding: 20px; border-radius: 5px; }
        .notice { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .notice.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .notice.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        table th, table td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        table th { background: #f5f5f5; font-weight: bold; }
        .user-issues { font-size: 13px; color: #666; }
        .fix-btn { background: #0073aa; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
        .fix-btn:hover { background: #005a87; }
    </style>
</head>
<body>
<div class="wrap">
    <h1>🔧 Fix Profile Images</h1>
    <p>This tool finds users with missing profile images (converted JPG/PNG → WebP) and repairs them.</p>
    
    <?php if (!empty($success)): ?>
        <div class="notice success"><?php echo esc_html($success); ?></div>
    <?php endif; ?>
    
    <?php if (!empty($error)): ?>
        <div class="notice error"><?php echo esc_html($error); ?></div>
    <?php endif; ?>
    
    <?php if (!empty($messages)): ?>
        <div class="notice success">
            <?php foreach ($messages as $msg): ?>
                <p><?php echo esc_html($msg); ?></p>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
    
    <h2>Broken Images Found: <?php echo count($broken_users); ?></h2>
    
    <?php if (empty($broken_users)): ?>
        <p style="color: #27ae60;"><strong>✓ All profile images are OK!</strong></p>
    <?php else: ?>
        <table>
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Issues</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($broken_users as $item): ?>
                <tr>
                    <td><?php echo intval($item['id']); ?></td>
                    <td><?php echo esc_html($item['name']); ?></td>
                    <td><?php echo esc_html($item['email']); ?></td>
                    <td>
                        <div class="user-issues">
                            <?php foreach ($item['issues'] as $issue): ?>
                                <div>• <?php echo esc_html($issue); ?></div>
                            <?php endforeach; ?>
                        </div>
                    </td>
                    <td>
                        <form method="post" style="display: inline;">
                            <?php wp_nonce_field('fix_profile_images_nonce'); ?>
                            <input type="hidden" name="action" value="fix_images">
                            <input type="hidden" name="fix_user_id" value="<?php echo intval($item['id']); ?>">
                            <button type="submit" class="fix-btn">Fix Images</button>
                        </form>
                    </td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>
    <?php endif; ?>
    
    <p><a href="<?php echo admin_url('index.php'); ?>">← Back to Dashboard</a></p>
</div>
</body>
</html>
