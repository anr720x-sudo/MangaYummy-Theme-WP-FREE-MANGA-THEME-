// Handles the "Load pages" selector added to single-chapter.php
(function() {
    'use strict';

    function applyMode(mode) {
        // remember preference
        try { localStorage.setItem('chapterLoadMode', mode); } catch(e) {}

        switch (mode) {
            case 'a': // all pages
                // if lazy loader API available, ask it to load everything
                if (window.chapterLazyLoader && typeof window.chapterLazyLoader.loadAll === 'function') {
                    window.chapterLazyLoader.loadAll();
                }
                // also make sure observer won't unload images later
                break;

            case 'o': // one page (default behaviour)
                if (window.chapterLazyLoader && typeof window.chapterLazyLoader.setMode === 'function') {
                    window.chapterLazyLoader.setMode('o');
                }
                break;

            case 'm': // manual
                if (window.chapterLazyLoader && typeof window.chapterLazyLoader.setMode === 'function') {
                    window.chapterLazyLoader.setMode('m');
                }
                // add a "load" button next to each image that still has data-src
                document.querySelectorAll('.chapter-page[data-src]').forEach(img => {
                    if (img.parentElement && img.parentElement.querySelector('.manual-load-btn')) return;
                    const btn = document.createElement('button');
                    btn.textContent = 'Încarcă pagina';
                    btn.className = 'manual-load-btn';
                    btn.addEventListener('click', () => {
                        const ds = img.getAttribute('data-src');
                        if (ds) {
                            img.src = ds;
                            img.removeAttribute('data-src');
                        }
                        btn.remove();
                    });
                    // insert button before image for clarity
                    img.parentElement.insertBefore(btn, img);
                });
                break;
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        const select = document.getElementById('chapterLoadSelect');
        if (!select) return;

        select.addEventListener('change', function() {
            applyMode(this.value);
        });

        // apply stored preference if present
        let stored;
        try { stored = localStorage.getItem('chapterLoadMode'); } catch(e) {}
        if (stored) {
            select.value = stored;
            applyMode(stored);
        }
    });
})();