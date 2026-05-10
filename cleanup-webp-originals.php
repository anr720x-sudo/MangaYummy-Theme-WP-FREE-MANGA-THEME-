<?php
/**
 * One-time cleanup: delete original JPG/PNG chapter images that have a WebP counterpart.
 * Run once, then DELETE this file from the server.
 */

// Basic security: must be logged in as admin
define('ABSPATH_CHECK', true);
require_once dirname(__FILE__) . '/wp-load.php';

if (!current_user_can('manage_options')) {
    wp_die('Access denied.');
}

$dry_run = isset($_GET['dry']) && $_GET['dry'] === '1';

$upload_dir = wp_upload_dir();
$chapters_base = trailingslashit($upload_dir['basedir']) . 'mangayummy-chapters';

if (!is_dir($chapters_base)) {
    wp_die('Directory not found: ' . esc_html($chapters_base));
}

$deleted      = 0;
$skipped      = 0;
$no_webp      = 0;
$details      = [];
$extensions   = ['jpg', 'jpeg', 'png', 'gif'];

$chapter_dirs = glob($chapters_base . '/*', GLOB_ONLYDIR);
if (empty($chapter_dirs)) {
    wp_die('No chapter directories found.');
}

foreach ($chapter_dirs as $chapter_dir) {
    foreach ($extensions as $ext) {
        $originals = glob($chapter_dir . '/*.' . $ext);
        if (empty($originals)) {
            continue;
        }

        foreach ($originals as $original_path) {
            $webp_path = preg_replace('/\.[a-zA-Z0-9]{2,5}$/', '.webp', $original_path);

            if (!file_exists($webp_path) || filesize($webp_path) < 100) {
                $no_webp++;
                continue;
            }

            if ($dry_run) {
                $details[] = '[DRY RUN] Would delete: ' . basename($original_path) . ' (webp exists, ' . filesize($webp_path) . ' bytes)';
                $deleted++;
            } else {
                if (@unlink($original_path)) {
                    $details[] = 'Deleted: ' . str_replace($chapters_base, '', $original_path);
                    $deleted++;
                } else {
                    $details[] = 'FAILED to delete: ' . basename($original_path);
                    $skipped++;
                }
            }
        }
    }
}

?><!DOCTYPE html>
<html>
<head>
    <title>WebP Originals Cleanup</title>
    <style>
        body { font-family: monospace; background: #111; color: #eee; padding: 20px; }
        h2 { color: #13667a; }
        .stat { font-size: 1.2em; margin: 6px 0; }
        .deleted { color: #13667a; }
        .skipped { color: #ff6b6b; }
        .no-webp { color: #aaa; }
        .log { background: #1a1a1a; padding: 10px; max-height: 500px; overflow-y: auto; border-radius: 6px; margin-top: 16px; font-size: 0.85em; line-height: 1.6; }
        .btn { display: inline-block; margin: 10px 4px; padding: 8px 18px; border-radius: 4px; text-decoration: none; font-weight: bold; }
        .btn-run { background: #13667a; color: #000; }
        .btn-dry { background: #444; color: #fff; }
        .warning { background: #5a2a00; border: 1px solid #ff8c00; padding: 10px; border-radius: 6px; margin-top: 16px; }
    </style>
</head>
<body>

<h2>WebP Originals Cleanup</h2>

<?php if ($dry_run): ?>
    <p style="color:#f0c040;">🔍 Dry run — nothing was deleted.</p>
<?php endif; ?>

<div class="stat deleted">✅ <?php echo $dry_run ? 'Would have deleted' : 'Deleted'; ?>: <strong><?php echo $deleted; ?></strong> original files</div>
<div class="stat skipped">❌ Deletion errors: <strong><?php echo $skipped; ?></strong></div>
<div class="stat no-webp">⏭ No corresponding webp (kept): <strong><?php echo $no_webp; ?></strong></div>

<div>
    <a class="btn btn-dry" href="?dry=1">Dry Run (simulation)</a>
    <a class="btn btn-run" href="?" onclick="return confirm('Are you sure? Will delete <?php echo $deleted; ?> files.')">Run (delete permanently)</a>
</div>

<?php if (!empty($details)): ?>
<div class="log">
    <?php foreach ($details as $line): ?>
        <?php echo esc_html($line) . '<br>'; ?>
    <?php endforeach; ?>
</div>
<?php endif; ?>

<div class="warning">
    ⚠️ <strong>Delete this file from the server when you're done!</strong><br>
    <code>cleanup-webp-originals.php</code>
</div>

</body>
</html>
