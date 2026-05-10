/**
 * Chapter Images Parallel Lazy Loading
 * Loads multiple images simultaneously for faster external image loading
 * Optimized for manga chapter reading experience
 * Mobile-optimized with adaptive settings
 */

(function() {
    'use strict';

    // Configuration
    const ROOT_MARGIN = '800px'; // load ahead, but avoid aggressive network bursts
    const PARALLEL_LOADS = 4;    // concurrent fetches
    const PRELOAD_NEXT = 2;      // preload next N images after a load
    const KEEP_RADIUS = 999;    // păstrează toate imaginile în memorie
    const MAX_LOADED = 999;     // practic infinit - nu descarcă niciodată
    const PLACEHOLDER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    // Selectors to support existing templates
    const SELECTORS = ['.manga-page', '.chapter-page'];

    const images = [];
    const loadingSet = new Set();
    const loadedSet = new Set();
    const indexMap = new Map(); // img -> index

    let observer = null;
    let currentIndex = 0;

    // Inject minimal skeleton CSS so placeholders look good
    function injectStyles() {
        const css = `
        .manga-skeleton{background:linear-gradient(90deg,#111 8%,#222 18%,#111 33%);background-size:200% 100%;animation:loadingShimmer 1.2s linear infinite;display:block}
        .manga-blur{filter:blur(8px);transform:scale(1.02)}
        .manga-failed{background-color:#222 !important;border:1px solid #444;color:#888;font-size:12px;text-align:center;padding:20px;min-height:100px;display:flex;align-items:center;justify-content:center;opacity:0.6}
        @keyframes loadingShimmer{from{background-position:200% 0}to{background-position:-200% 0}}
        `;
        const s = document.createElement('style');
        s.type = 'text/css';
        s.appendChild(document.createTextNode(css));
        document.head.appendChild(s);
    }

    // Ensure layout stability using width & height attributes or aspect-ratio
    function ensureLayout(img) {
        const w = img.getAttribute('width');
        const h = img.getAttribute('height');
        img.style.display = 'block';
        img.style.verticalAlign = 'bottom';
        img.style.maxWidth = '100%';
        if (w && h) {
            // Use modern aspectRatio when available for responsive sizing
            try { img.style.aspectRatio = `${parseInt(w,10)} / ${parseInt(h,10)}`; } catch(e) {}
            // Ensure intrinsic attributes remain so browser reserves space
            img.setAttribute('width', w);
            img.setAttribute('height', h);
        } else {
            // If missing, layout is stabilized via CSS (.chapter-page min-height)
            // no warning in console to avoid noise when dimensions can't be fetched
        }
    }

    function isBase64Url(value) {
        if (!value || typeof value !== 'string') return false;
        if (/^\s*$/.test(value)) return false;

        // If value already looks like a normal URL, no need for decoding
        if (/^(?:https?:\/\/|data:|\/\/)/i.test(value)) return false;

        // Validate base64 pattern
        if (!/^[A-Za-z0-9+/=]+$/.test(value)) return false;

        try {
            var decoded = atob(value);
            return /^(?:https?:\/\/)/i.test(decoded);
        } catch (e) {
            return false;
        }
    }

    function decodeDataSrc(value) {
        if (!value || typeof value !== 'string') return value;
        if (isBase64Url(value)) {
            try {
                return atob(value);
            } catch (e) {
                return value;
            }
        }
        return value;
    }

    function init() {
        injectStyles();

        // Gather images that have a data-src or that match selectors
        const nodeList = [];
        SELECTORS.forEach(sel => {
            document.querySelectorAll(sel).forEach(n => nodeList.push(n));
        });

        if (nodeList.length === 0) return;

        // Normalize list and filter for data-src or deferable images
        nodeList.forEach((img, idx) => {
            // Skip protected lazy images; another script handles base64 decoded src for these
            if (img.getAttribute('data-lazy') === 'mangayummy') {
                return;
            }

            // map index for unloading decisions
            images.push(img);
            indexMap.set(img, images.length - 1);
            ensureLayout(img);

            // Restore click behavior for all-pages mode: scroll down a bit, not one-page mode
            img.addEventListener('click', function (event) {
                if (event.button !== 0 || event.defaultPrevented) return;
                const modeSelector = document.getElementById('loadMode');
                const mode = modeSelector ? modeSelector.value : 'a';
                if (mode !== 'a') return;
                event.preventDefault();

                const yOffset = Math.round(window.innerHeight * 0.8);
                window.scrollBy({ top: yOffset, left: 0, behavior: 'smooth' });
            });

            // If image already has src but also data-src missing, preserve original src in data-original
            if (!img.hasAttribute('data-src') && img.src && !img.src.startsWith('data:') && !img.classList.contains('no-defer')) {
                img.setAttribute('data-src', img.src);
                // replace actual src with placeholder to free memory, but only if not in viewport
                if (!isElementInViewport(img)) {
                    img.dataset._orig = img.src;
                    img.src = PLACEHOLDER;
                    img.classList.add('manga-skeleton');
                } else {
                    // mark as loaded immediately
                    loadedSet.add(img);
                    img.classList.add('loaded');
                }
            } else if (img.hasAttribute('data-src')) {
                // start as placeholder
                if (!img.src || img.src === '') img.src = PLACEHOLDER;
                img.classList.add('manga-skeleton');
            }
        });

        // Setup observer
        observer = new IntersectionObserver(onIntersection, {
            root: null,
            rootMargin: ROOT_MARGIN,
            threshold: 0.01
        });

        images.forEach(img => {
            observer.observe(img);
        });

        // Kick off initial near-viewport loads
        processQueue();
    }

    function isElementInViewport(el) {
        const rect = el.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0;
    }

    function onIntersection(entries) {
        // Determine most relevant currentIndex from visible entries
        entries.forEach(entry => {
            const img = entry.target;
            const idx = indexMap.get(img);
            if (entry.isIntersecting) {
                currentIndex = idx;
                // Load this and next PRELOAD_NEXT images
                queueImageLoad(img);
                for (let i = 1; i <= PRELOAD_NEXT; i++) {
                    const next = images[idx + i];
                    if (next) queueImageLoad(next);
                }
                // Also try to load previous neighbors for smoother back-scroll
                for (let i = 1; i <= PRELOAD_NEXT; i++) {
                    const prev = images[idx - i];
                    if (prev) queueImageLoad(prev);
                }
            }
        });

        // Enforce memory limit after processing intersections
        enforceMemoryBudget();
    }

    function queueImageLoad(img) {
        if (!img) return;
        if (loadedSet.has(img) || loadingSet.has(img)) return;
        
        // Skip if image has permanently failed
        if (img.getAttribute('data-failed') === 'true') return;
        
        let dataSrc = img.getAttribute('data-src');
        if (!dataSrc) return;

        dataSrc = decodeDataSrc(dataSrc);
        if (!dataSrc) return;

        if (loadingSet.size >= PARALLEL_LOADS) return;
        
        // Validate URL before queueing
        try {
            new URL(dataSrc);
        } catch (e) {
            if (typeof console !== 'undefined' && console.error) {
                console.error('Invalid image URL: ' + dataSrc);
            }
            img.setAttribute('data-failed', 'true');
            return;
        }
        
        loadingSet.add(img);
        loadImage(img, dataSrc);
    }

    function loadImage(img, src) {
        const originalAlt = img.getAttribute('data-alt') || img.getAttribute('alt') || '';
        img.setAttribute('alt', '');
        
        // Use img tag for all images (simpler, more compatible, no CSP issues)
        // IMG tag is not restricted by CSP connect-src, only img-src (which allows https:)
        loadImageViaImg(img, src, originalAlt);
    }
    
    
    function loadImageViaImg(img, src, originalAlt) {
        const pre = new Image();
        const maxRetries = 3;
        const retryCount = parseInt(img.getAttribute('data-retry-count') || '0', 10);
        
        pre.onload = function() {
            img.src = src;
            img.removeAttribute('data-src');
            img.removeAttribute('data-retry-count');
            img.classList.remove('manga-skeleton');
            img.classList.remove('manga-blur');
            img.classList.add('loaded');
            img.setAttribute('alt', originalAlt);

            loadingSet.delete(img);
            loadedSet.add(img);

            const idx = indexMap.get(img);
            for (let i = 1; i <= PRELOAD_NEXT; i++) {
                const n = images[idx + i];
                if (n) queueImageLoad(n);
            }

            enforceMemoryBudget();
        };

        pre.onerror = function() {
            loadingSet.delete(img);
            
            if (retryCount >= maxRetries) {
                // Max retries reached - stop trying
                img.classList.remove('manga-skeleton');
                img.classList.add('manga-failed');
                img.src = '//' + 'placeholder-svg-failed'; // Point to non-existent to avoid further requests
                img.setAttribute('data-failed', 'true');
                img.style.backgroundColor = '#222';
                img.style.display = 'block';
                img.style.minHeight = '100px';
                
                if (typeof console !== 'undefined' && console.warn) {
                    console.warn('Image failed after ' + maxRetries + ' retries: ' + src);
                }
                return;
            }
            
            // Retry with exponential backoff
            const nextRetryCount = retryCount + 1;
            img.setAttribute('data-retry-count', nextRetryCount);
            
            const delayMs = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s, 8s...
            
            if (typeof console !== 'undefined' && console.debug) {
                console.debug('Image load failed (' + src + '), retry ' + nextRetryCount + '/' + maxRetries + ' in ' + delayMs + 'ms');
            }
            
            setTimeout(() => {
                if (!loadedSet.has(img) && !img.getAttribute('data-failed')) {
                    queueImageLoad(img);
                }
            }, delayMs);
        };

        pre.src = src;
    }

    function enforceMemoryBudget() {
        return; // dezactivat - păstrăm toate imaginile în memorie
        if (loadedSet.size <= MAX_LOADED) return;
        // Build array of loaded images with their indexes
        const loadedArr = Array.from(loadedSet).map(img => ({img, idx: indexMap.get(img)}));
        // Sort by distance from currentIndex descending (farther first)
        loadedArr.sort((a,b) => Math.abs(b.idx - currentIndex) - Math.abs(a.idx - currentIndex));

        for (const item of loadedArr) {
            if (loadedSet.size <= MAX_LOADED) break;
            // If image is outside KEEP_RADIUS, unload it
            if (Math.abs(item.idx - currentIndex) > KEEP_RADIUS) {
                unloadImage(item.img);
            }
        }
    }

    function unloadImage(img) {
        if (!img) return;
        if (!loadedSet.has(img)) return;
        // Do not unload images that are currently visible in the viewport
        try {
            if (isElementInViewport(img)) return;
        } catch (e) {}
        // Save original src back to data-src so we can reload later
        const realSrc = img.src;
        if (realSrc && !realSrc.startsWith('data:')) {
            img.setAttribute('data-src', realSrc);
        }
        // Replace with tiny placeholder to free memory but keep layout
        img.src = PLACEHOLDER;
        img.classList.remove('loaded');
        img.classList.add('manga-skeleton');
        loadedSet.delete(img);
    }

    const INDEX_PREFERRED_RADIUS = 10; // prefer images within ±10 indices

    function processQueue() {
        for (let i = 0; i < images.length && loadingSet.size < PARALLEL_LOADS; i++) {
            const img = images[i];
            if (!loadedSet.has(img) && !loadingSet.has(img) && img.getAttribute('data-src')) {
                // Prefer images near currentIndex (index distance, not pixels)
                const idx = indexMap.get(img);
                if (Math.abs(idx - currentIndex) <= INDEX_PREFERRED_RADIUS) {
                    queueImageLoad(img);
                } else if (loadingSet.size === 0) {
                    queueImageLoad(img);
                }
            }
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
