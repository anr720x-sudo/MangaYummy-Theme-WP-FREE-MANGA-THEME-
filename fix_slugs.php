<?php
require_once('wp-load.php');

$chapters = get_posts(array('post_type' => 'chapter', 'posts_per_page' => -1));
foreach ($chapters as $chapter) {
    $chapter_number = get_post_meta($chapter->ID, '_chapter_number', true);
    if (!empty($chapter_number)) {
        $normalized = str_replace(',', '.', $chapter_number);
        if (strpos($normalized, '.') !== false) {
            $normalized = rtrim($normalized, '0');
            $normalized = rtrim($normalized, '.');
        }
        $normalized = str_replace('.', '-', $normalized);
        $expected_slug = 'capitolul-' . $normalized;
        if ($chapter->post_name !== $expected_slug) {
            wp_update_post(array('ID' => $chapter->ID, 'post_name' => $expected_slug));
            echo "Updated chapter {$chapter->ID}: {$chapter->post_name} -> {$expected_slug}\n";
        }
    }
}
echo "Done\n";