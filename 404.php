<?php
// Return a true 404 page message instead of redirecting away.
status_header(404);
nocache_headers();
get_header();
?>

<main id="main-page" class="site-main" role="main" style="padding:40px 20px; text-align:center; display:flex; align-items:center; justify-content:center; min-height:80vh; flex-direction:column;">
    <h1>404 - The requested content was not found</h1>
    <p>The requested resource could not be found on this server.</p>
    <p><a class="error-home-link" href="<?php echo esc_url( home_url( '/' ) ); ?>">Back to home page</a></p>
</main>

<style>
    /* Hide the main site header on 404 pages without redirecting */
    .ya-header {
        display: none !important;
    }

    .error-home-link {
        display: inline-block;
        padding: 10px 18px;
        background-color: #13667a;
        color: #ffffff;
        text-decoration: none;
        border-radius: 4px;
        font-weight: 600;
        font-size: 14px;
    }
    .error-home-link:hover,
    .error-home-link:focus {
        background-color: #d63b3d;
        outline: none;
    }
</style>

<?php
// Footer hidden for 404 page per user request.
// get_footer();
exit;

