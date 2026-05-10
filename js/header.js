// Manga header functionality (hardened)
document.addEventListener('DOMContentLoaded', function() {
    // Helper: neutralize a form element
    function neutralizeForm(form) {
        try {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }, true);
            const submitButtons = form.querySelectorAll('input[type="submit"], button[type="submit"]');
            submitButtons.forEach(button => {
                button.disabled = true;
                button.setAttribute('data-mp-disabled', '1');
                button.style.pointerEvents = 'none';
            });
        } catch (err) { console.warn('neutralizeForm error', err); }
    }

    // Neutralize existing search forms immediately
    const existingSearchForms = document.querySelectorAll('form[action*="/?s="], form.search-form, form[role="search"]');
    existingSearchForms.forEach(neutralizeForm);

    // Find the search button and replace it with a clean clone to remove any external handlers
    const originalBtn = document.getElementById('md-search');
    let searchBtn = originalBtn;
    if (originalBtn) {
        const clone = originalBtn.cloneNode(true);
        originalBtn.parentNode.replaceChild(clone, originalBtn);
        searchBtn = clone; // now safe to attach our handlers
    }

    // Robust global blockers (capture phase) to stop redirects to ?s=
    function isSearchURL(url) {
        if (!url) return false;
        try { url = String(url); } catch (e) { return false; }
        return url.includes('/?s=') || /[?&]s=/.test(url);
    }

    // Block navigation attempts from clicks on anchors or form submits
    document.addEventListener('click', function(e) {
        const a = e.target.closest && e.target.closest('a');
        if (a && a.href && isSearchURL(a.href)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    document.addEventListener('mousedown', function(e) {
        const a = e.target.closest && e.target.closest('a');
        if (a && a.href && isSearchURL(a.href)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    document.addEventListener('auxclick', function(e) {
        const a = e.target.closest && e.target.closest('a');
        if (a && a.href && isSearchURL(a.href)) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, true);

    // Prevent Enter from triggering any submit or redirect globally when focused on our input
    document.addEventListener('keydown', function(e) {
        const active = document.activeElement;
        if (e.key === 'Enter' && active && active.id === 'md-live-search') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation && e.stopImmediatePropagation();
            return false;
        }
    }, true);

    // Also block submit events on any form that contains our input (capture)
    document.addEventListener('submit', function(e) {
        try {
            if (e.target && e.target.querySelector && e.target.querySelector('#md-live-search')) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        } catch (err) {}
    }, true);

    // Monitor and neutralize dynamically injected forms/anchors
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType !== 1) return;
                // remove or neutralize forms with search action
                if (node.matches && node.matches('form[action*="/?s="], form.search-form, form[role="search"]')) {
                    neutralizeForm(node);
                }
                // disable anchors that link to search
                const anchors = node.querySelectorAll && node.querySelectorAll('a[href*="/?s="], a[href*="?s="]');
                anchors && anchors.forEach(a => {
                    try { a.setAttribute('data-mp-blocked', '1'); a.href = 'javascript:void(0)'; } catch (e) {}
                });
                // also check any descendant forms
                const forms = node.querySelectorAll && node.querySelectorAll('form[action*="/?s="], form.search-form, form[role="search"]');
                forms && forms.forEach(neutralizeForm);
            });
        });
    });
    observer.observe(document.documentElement || document.body, { childList: true, subtree: true });

    // Monkey-patch some navigation functions to block search redirects
    try {
        const _open = window.open;
        window.open = function(url, name, specs) {
            if (isSearchURL(url)) { return null; }
            return _open.apply(this, arguments);
        };
    } catch (e) {}

    try {
        const _assign = window.location.assign;
        if (typeof _assign === 'function') {
            window.location.assign = function(url) {
                if (isSearchURL(url)) { return; }
                return _assign.apply(window.location, arguments);
            };
        }
    } catch (e) {}

    try {
        const _replace = window.location.replace;
        if (typeof _replace === 'function') {
            window.location.replace = function(url) {
                if (isSearchURL(url)) { return; }
                return _replace.apply(window.location, arguments);
            };
        }
    } catch (e) {}

    // Click handler for our (cloned) search button
    if (searchBtn) {
        searchBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation && e.stopImmediatePropagation();

            const searchOverlay = document.getElementById('md-search-overlay');
            if (!searchOverlay) return false;
            const searchInput = document.getElementById('md-live-search');
            if (!searchInput) return false;
            if (searchOverlay.style.display === 'none' || !searchOverlay.style.display) {
                searchOverlay.style.display = 'flex';
                searchInput.focus();
            } else {
                searchOverlay.style.display = 'none';
                searchInput.value = '';
                const results = document.getElementById('md-search-results');
                if (results) {
                    results.innerHTML = '';
                    results.style.display = 'none';
                }
            }
            return false;
        }, true);
    }

    // Close button handler
    const closeBtn = document.getElementById('md-search-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const searchOverlay = document.getElementById('md-search-overlay');
            const searchInput = document.getElementById('md-live-search');
            if (searchOverlay) searchOverlay.style.display = 'none';
            if (searchInput) searchInput.value = '';
            const results = document.getElementById('md-search-results');
            if (results) {
                results.innerHTML = '';
                results.style.display = 'none';
            }
        });
    }

    // Live search input behavior (debounced)
    const searchInputEl = document.getElementById('md-live-search');
    if (searchInputEl) {
        let timeout;
        searchInputEl.addEventListener('input', function(e) {
            e.stopPropagation();
            const q = this.value.trim();
            if (q.length === 0) {
                const results = document.getElementById('md-search-results');
                if (results) {
                    results.style.display = 'none';
                    results.innerHTML = '';
                }
                return;
            }
            const results = document.getElementById('md-search-results');
            if (results) results.style.display = 'block';
            clearTimeout(timeout);
            if (q.length >= 2) timeout = setTimeout(() => performAjaxSearch(q), 300);
        });

        searchInputEl.addEventListener('focus', function(e) {
            const results = document.getElementById('md-search-results');
            if (results && this.value.trim().length > 0 && results.innerHTML.trim() !== '') {
                results.style.display = 'block';
            }
        });

        searchInputEl.addEventListener('blur', function(e) {
            const results = document.getElementById('md-search-results');
            if (results) {
                setTimeout(() => {
                    results.style.display = 'none';
                }, 200);
            }
        });

        searchInputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation && e.stopImmediatePropagation();
                const q = this.value.trim(); if (q.length >= 2) performAjaxSearch(q);
                return false;
            }
        });
    }

    // AJAX and UI helpers (unchanged logic)
    function performAjaxSearch(query) {
        try {
            fetch(ya_ajax.ajax_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ action: 'ya_live_search', query: query, nonce: ya_ajax.nonce })
            })
            .then(r => r.json())
            .then(data => displaySearchResults(data))
            .catch(err => console.error('Search error', err));
        } catch (err) { console.error(err); }
    }

    function displaySearchResults(data) {
        const resultsContainer = document.getElementById('md-search-results'); if (!resultsContainer) return;
        resultsContainer.innerHTML = '';
        if (data && data.success && data.data && data.data.length) {
            data.data.forEach(item => {
                const a = document.createElement('a');
                a.href = item.url;
                a.innerHTML = '<img src="' + item.thumbnail + '" alt="' + item.title + '" onerror="this.src=\'/wp-content/uploads/default-manga.jpg\'">' + '<span>' + item.title + '</span>';
                resultsContainer.appendChild(a);
            });
            resultsContainer.style.display = 'block';
        } else {
            resultsContainer.style.display = 'none';
        }
    }

    // User menu dropdown toggle - SIMPLE AND DIRECT
    const userMenuToggle = document.getElementById('userMenuToggle');
    const userMenu = document.querySelector('.user-menu');
    const headerUser = document.querySelector('.header-user');
    
    if (userMenuToggle && userMenu) {
        // Click button to toggle menu open/close
        userMenuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            e.preventDefault();
            userMenu.classList.toggle('active');
        });

        // Close menu when clicking anywhere outside
        document.addEventListener('click', function(e) {
            if (userMenu.classList.contains('active')) {
                // Check if click is outside the header-user element
                if (!headerUser || !headerUser.contains(e.target)) {
                    userMenu.classList.remove('active');
                }
            }
        });

        // Also close when clicking a menu link
        document.querySelectorAll('.user-menu a').forEach(link => {
            link.addEventListener('click', function() {
                userMenu.classList.remove('active');
            });
        });
    } else {
        console.warn('User menu elements not found:', { userMenuToggle, userMenu });
    }

});
