<?php
// Query for recommended manga (same as front-page)
$args = [
  'post_type'      => 'manga',
  'posts_per_page' => 8,
  'meta_query'     => [
    [
      'key'     => '_recommended',
      'value'   => '1',
      'compare' => '='
    ]
  ],
  'orderby'        => 'date',
  'order'          => 'DESC',
  'no_found_rows'  => true,
  'update_post_term_cache' => false
];

$query = new WP_Query($args);

if ($query->have_posts()) : ?>
  <aside class="recommended-sidebar">
    <h3 class="sidebar-title">Recomandate</h3>
    <ul class="recommended-list">
      <?php while ($query->have_posts()) : $query->the_post(); ?>
        <li class="recommended-item">
          <a href="<?php the_permalink(); ?>" class="recommended-link">
            <img src="<?php echo get_the_post_thumbnail_url(get_the_ID(), 'thumbnail'); ?>" alt="<?php the_title(); ?>" class="recommended-thumb" loading="lazy" decoding="async">
            <span class="recommended-title"><?php the_title(); ?></span>
          </a>
        </li>
      <?php endwhile; ?>
    </ul>
  </aside>
<?php endif; wp_reset_postdata(); ?>
