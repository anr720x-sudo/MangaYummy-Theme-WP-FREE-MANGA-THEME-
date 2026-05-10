<?php
/**
 * Enqueue autogenerate images script for chapter editor
 */
function mangayummy_enqueue_chapter_autogenerate($hook) {
    // Only on post editor screens
    if ($hook !== 'post.php' && $hook !== 'post-new.php') {
        return;
    }

    if (!is_admin()) {
        return;
    }

    // Use $typenow which is reliable for post-new.php
    global $typenow;
    if (!isset($typenow) || $typenow !== 'chapter') {
        return;
    }

    // Autogenerate admin helper script disabled.
    // The legacy JS `js/chapter-autogenerate-images.js` caused console errors
    // and appears unused in current admin flows. If you need this feature
    // in the future, re-enable by restoring the wp_enqueue_script + wp_localize_script calls above.
}
add_action('admin_enqueue_scripts', 'mangayummy_enqueue_chapter_autogenerate');
