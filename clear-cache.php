<?php
// Clear popular manga cache
$cache_key = 'mangayummy_popular_manga_carousel';
if (delete_transient($cache_key)) {
    echo "Cache cleared successfully! Popular manga cache cleared.";
} else {
    echo "Cache not found or could not be deleted.";
}
?>