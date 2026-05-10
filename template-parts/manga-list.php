<?php
global $manga_query, $current_sort, $latest_chapters_cache;
$query = $manga_query;

// Get latest chapters cache if not already set
if (!isset($latest_chapters_cache)) {
    $latest_chapters_cache = get_transient('latest_chapters_all');
    if ($latest_chapters_cache === false) {
        global $wpdb;
        // Single query to get latest chapter for each manga (with date)
        $results = $wpdb->get_results("
            SELECT pm.meta_value as manga_id, 
                   MAX(CAST(pn.meta_value AS UNSIGNED)) as chapter_number,
                   MAX(p.post_date) as post_date
            FROM {$wpdb->posts} p
            INNER JOIN {$wpdb->postmeta} pm ON p.ID = pm.post_id AND pm.meta_key = '_manga_id'
            INNER JOIN {$wpdb->postmeta} pn ON p.ID = pn.post_id AND pn.meta_key = '_chapter_number'
            WHERE p.post_type = 'chapter' AND p.post_status = 'publish'
            GROUP BY pm.meta_value
        ", ARRAY_A);
        
        $latest_chapters_cache = [];
        if ($results) {
            foreach ($results as $row) {
                $latest_chapters_cache[$row['manga_id']] = [
                    'number' => $row['chapter_number'],
                    'date' => $row['post_date']
                ];
            }
        }
        set_transient('latest_chapters_all', $latest_chapters_cache, 5 * MINUTE_IN_SECONDS);
    }
}

if ($query->have_posts()) :
  while ($query->have_posts()) : $query->the_post();
    $manga_id = get_the_ID();
    $alternative_titles = get_post_meta($manga_id, '_alternative_titles', true);
    if (!is_array($alternative_titles)) {
        $alternative_titles = $alternative_titles ? [$alternative_titles] : []; // Backward compatibility
    }
    $alternative_titles_display = !empty($alternative_titles) ? implode(', ', $alternative_titles) : '';
    $status = get_post_meta($manga_id, '_status', true);
    $genres = get_the_term_list($manga_id, 'genre', '', ', ');
    $rating_data = get_manga_rating($manga_id);

    // Get latest chapter info from cache (no additional query!)
    $latest_chapter_info = '';
    if (isset($latest_chapters_cache[$manga_id])) {
      $cached = $latest_chapters_cache[$manga_id];
      $chapter_date = mangayummy_get_date_ro($cached['date'], 'j F Y');
      $latest_chapter_info = 'Chapter ' . $cached['number'] . ' • ' . $chapter_date;
    }

    // Get views if sorting by views
    $views_display = '';
    if ($current_sort === 'views') {
      $views = (int) get_post_meta($manga_id, 'manga_views_total', true);
      if ($views > 0) {
        $views_display = '<span class="views-count"><span class="badge-icon">--</span> ' . number_format($views) . ' views</span>';
      }
    }
?>
<article class="manga-row">
  <a href="<?php the_permalink(); ?>">
    <img src="<?php echo get_the_post_thumbnail_url($manga_id, 'full'); ?>" alt="<?php the_title(); ?>">
  </a>
  <div class="info">
    <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
    <?php if ($alternative_titles_display) : ?>
      <p><strong>Alternative:</strong> <?php echo esc_html($alternative_titles_display); ?></p>
    <?php endif; ?>
    <?php if ($genres) : ?>
      <p><strong>Genres:</strong> <?php echo $genres; ?></p>
    <?php endif; ?>
    <?php if ($status) : ?>
      <p><strong>Stare:</strong> <?php 
        $status_translated = '';
        switch ($status) {
          case 'ongoing':
            $status_translated = 'Ongoing';
            break;
          case 'completed':
            $status_translated = 'Completed';
            break;
          case 'hiatus':
            $status_translated = 'On Hiatus';
            break;
          case 'cancelled':
            $status_translated = 'Anulat';
            break;
          default:
            $status_translated = ucfirst(esc_html($status));
        }
        echo $status_translated;
      ?></p>
    <?php endif; ?>
    <?php if ($latest_chapter_info) : ?>
      <span class="latest"><?php echo $latest_chapter_info; ?></span>
    <?php endif; ?>
    <?php if ($views_display) : ?>
      <span class="views-display"><?php echo $views_display; ?></span>
    <?php endif; ?>
  </div>
</article>
<?php
  endwhile;
  wp_reset_postdata();
else :
  echo '<p>No manga found.</p>';
endif;
?>