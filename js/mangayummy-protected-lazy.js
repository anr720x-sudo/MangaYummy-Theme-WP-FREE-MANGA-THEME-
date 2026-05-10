(function() {
    'use strict';

    function isInViewport(el) {
        var rect = el.getBoundingClientRect();
        return (
            rect.bottom >= 0 &&
            rect.right >= 0 &&
            rect.top <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.left <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }

    function decodeBase64(data) {
        if (!data) return '';
        try {
            return atob(data);
        } catch (e) {
            console.warn('mangayummy protected lazy: invalid data-src base64', e);
            return '';
        }
    }

    function loadProtectedImage(img) {
        if (!img || img.dataset.loaded === 'true') return;

        var encoded = img.getAttribute('data-src');
        var realSrc = decodeBase64(encoded);

        if (!realSrc) return;

        img.setAttribute('src', realSrc);
        img.removeAttribute('data-src');
        img.dataset.loaded = 'true';

        // Optional: for modern browsers
        img.setAttribute('loading', 'lazy');
    }

    function processProtectedImages() {
        var images = document.querySelectorAll('img[data-lazy="mangayummy"]');

        if (!images.length) return;

        images.forEach(function(img) {
            if (img.dataset.loaded === 'true') return;
            if (isInViewport(img)) {
                loadProtectedImage(img);
            }
        });

        var remaining = document.querySelectorAll('img[data-lazy="mangayummy"]:not([data-loaded="true"])');
        if (!remaining.length) {
            window.removeEventListener('scroll', onScrollThrottled);
            window.removeEventListener('resize', onScrollThrottled);
            window.removeEventListener('orientationchange', onScrollThrottled);
        }
    }

    var timeoutId = null;
    function onScrollThrottled() {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(function() {
            processProtectedImages();
            timeoutId = null;
        }, 120);
    }

    document.addEventListener('DOMContentLoaded', function() {
        processProtectedImages();
        window.addEventListener('scroll', onScrollThrottled);
        window.addEventListener('resize', onScrollThrottled);
        window.addEventListener('orientationchange', onScrollThrottled);
    });
})();
