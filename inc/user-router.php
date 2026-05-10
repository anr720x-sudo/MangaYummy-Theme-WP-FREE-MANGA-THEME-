<?php
add_action('init', function () {
    add_rewrite_rule('^users/([0-9]+)/?$', 'index.php?pagename=profile&view_user=$matches[1]', 'top');
    add_rewrite_rule('^users/([0-9]+)/social/?$', 'index.php?pagename=profile&view_user=$matches[1]&social=1', 'top');
    add_rewrite_rule('^grupuri-traducatori/([^/]+)/?$', 'index.php?pagename=translator-groups&translator_group=$matches[1]', 'top');
});

add_filter('query_vars', function ($vars) {
    $vars[] = 'view_user';
    $vars[] = 'social';
    $vars[] = 'translator_group';
    return $vars;
});