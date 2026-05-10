// ===============================
// Live search functionality
// ===============================
document.addEventListener('DOMContentLoaded', function () {
  const searchInput = document.querySelector('#ya-live-search-overlay') || document.querySelector('#searchModalInput') || document.querySelector('.ya-search-header input') || document.querySelector('.ya-search input');
  const resultsBox = document.querySelector('.ya-search-header .ya-search-results') || document.querySelector('.ya-search-results') || document.getElementById('ya-search-results');
  const headerSearch = document.querySelector('.ya-search-header');
  let timeout;

  function displaySearchResults(items) {
    if (!resultsBox) return;
    resultsBox.innerHTML = '';

    if (!items || !items.length) {
      resultsBox.style.display = 'none';
      return;
    }

    items.forEach(item => {
      const a = document.createElement('a');
      a.href = item.url || '#';
      a.className = 'ya-result-item';
      a.innerHTML = `
        <img src="${item.thumbnail || '/assets/img/default-manga.jpg'}" alt="${item.title || 'Fara titlu'}" onerror="this.src='/assets/img/default-manga.jpg'" />
        <div class="ya-result-details">
          <div class="ya-result-title"><span class="sr-title">${item.title || ''}</span></div>
          <div class="ya-result-meta"><span class="meta-year">${item.year || ''}</span> <span class="meta-status">${item.status || ''}</span></div>
        </div>
      `;
      resultsBox.appendChild(a);
    });
  }

  function addClickHandlers() {
    if (!resultsBox) return;
    resultsBox.querySelectorAll('.ya-result-item, .ya-result-all').forEach(item => {
      if (!item.dataset.bound) {
        item.addEventListener('click', () => {
          searchInput.value = '';
          window.location.href = item.dataset.url;
        });
        item.dataset.bound = '1';
      }
    });
  }

  if (searchInput && resultsBox) {
    searchInput.addEventListener('input', function () {
      const query = this.value.trim();
      clearTimeout(timeout);

      if (!query) {
        resultsBox.style.display = 'none';
        return;
      }

    timeout = setTimeout(() => {
      const formData = new FormData();
      formData.append('action', 'ya_live_search');
      formData.append('query', query);
      formData.append('nonce', ya_ajax.nonce);

      fetch(ya_ajax.ajax_url, { method: 'POST', body: formData })
        .then(r => r.json())
        .then(json => {
          if (json && json.success && json.data && json.data.html) {
            resultsBox.innerHTML = json.data.html;
            resultsBox.style.display = 'block';
            addClickHandlers();
          } else {
            resultsBox.style.display = 'none';
          }
        })
        .catch(err => {
          console.error('Live search JSON error', err);
          resultsBox.style.display = 'none';
        });
    }, 300);
  });

  document.addEventListener('click', e => {
    if (searchInput && resultsBox && !searchInput.contains(e.target) && !resultsBox.contains(e.target)) {
      resultsBox.style.display = 'none';
    }
  });

  }

  const searchToggle = document.getElementById('ya-search-toggle');
  const searchIconBtn = document.getElementById('searchIconBtn');
  const searchModal = document.getElementById('searchModal');
  const searchModalOverlay = document.querySelector('.search-modal-overlay');
  const searchModalInput = document.getElementById('searchModalInput');
  const searchRecentList = document.getElementById('searchRecentList');

  function getRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem('manga_recent_searches') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveRecentSearches(terms) {
    localStorage.setItem('manga_recent_searches', JSON.stringify(terms));
  }

  function getServerRecentSearches() {
    if (!ya_ajax || !ya_ajax.currentUserId) return Promise.resolve([]);
    const formData = new FormData();
    formData.append('action', 'ya_get_recent_searches');
    formData.append('nonce', ya_ajax.nonce);

    return fetch(ya_ajax.ajax_url, { method: 'POST', body: formData })
      .then(res => res.json())
      .then(json => (json.success && Array.isArray(json.data.terms) ? json.data.terms : []))
      .catch(() => []);
  }

  function saveServerRecentSearches(terms) {
    if (!ya_ajax || !ya_ajax.currentUserId) return Promise.resolve({ success: false });
    const formData = new FormData();
    formData.append('action', 'ya_save_recent_searches');
    formData.append('nonce', ya_ajax.nonce);
    formData.append('terms', JSON.stringify(terms));

    return fetch(ya_ajax.ajax_url, { method: 'POST', body: formData })
      .then(res => res.json())
      .catch(() => ({ success: false }));
  }

  function mergeRecentSearches(localTerms, serverTerms) {
    const merged = [];
    const seen = new Set();
    (serverTerms || []).concat(localTerms || []).forEach(term => {
      if (!term || seen.has(term)) return;
      seen.add(term);
      merged.push(term);
    });
    return merged.slice(0, 20);
  }

  function renderRecentSearches() {
    if (!searchRecentList) return;
    const items = getRecentSearches();
    if (!items || items.length === 0) {
      searchRecentList.innerHTML = '';
      const recentSection = document.getElementById('searchRecent');
      if (recentSection) {
        recentSection.style.display = 'none';
      }
      return;
    }

    const recentSection = document.getElementById('searchRecent');
    if (recentSection) {
      recentSection.style.display = 'block';
    }

    searchRecentList.innerHTML = items.map((term, idx) => `\n      <li><button type="button" data-term="${encodeURIComponent(term)}" class="recent-term">${term}</button><button type="button" class="recent-remove" data-index="${idx}">&times;</button></li>`).join('');
  }

  function initRecentSearches() {
    if (!searchRecentList) return;

    const localTerms = getRecentSearches();
    if (ya_ajax && ya_ajax.currentUserId) {
      getServerRecentSearches().then(serverTerms => {
        const merged = mergeRecentSearches(localTerms, serverTerms);
        saveRecentSearches(merged);
        renderRecentSearches();
      }).catch(() => {
        renderRecentSearches();
      });
    } else {
      renderRecentSearches();
    }
  }

  initRecentSearches();

  function openSearchModal() {
    if (!searchModal) return;
    searchModal.classList.add('open');
    searchModal.setAttribute('aria-hidden', 'false');
    if (searchModalInput) {
      searchModalInput.value = '';
      searchModalInput.focus();
    }
    renderRecentSearches();
  }

  function closeSearchModal() {
    if (!searchModal) return;
    searchModal.classList.remove('open');
    searchModal.setAttribute('aria-hidden', 'true');
  }

  if (searchToggle && headerSearch) {
    searchToggle.addEventListener('click', (e) => {
      e.preventDefault();
      headerSearch.classList.toggle('open');
      if (headerSearch.classList.contains('open')) {
        const input = headerSearch.querySelector('input');
        if (input) input.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (headerSearch.classList.contains('open') && !headerSearch.contains(e.target) && e.target !== searchToggle) {
        headerSearch.classList.remove('open');
      }
    });
  }

  if (searchIconBtn) {
    searchIconBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openSearchModal();
    });
  }

  if (searchModalOverlay) {
    searchModalOverlay.addEventListener('click', closeSearchModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeSearchModal();
    }
  });

  if (searchRecentList) {
    searchRecentList.addEventListener('click', (e) => {
      const termBtn = e.target.closest('.recent-term');
      const removeBtn = e.target.closest('.recent-remove');
      if (termBtn) {
        const term = decodeURIComponent(termBtn.dataset.term);
        // Redirect to browse page with query parameter.
        window.location.href = `${window.location.origin}/browse/?s=${encodeURIComponent(term)}`;
        return;
      }
      if (removeBtn) {
        const idx = Number(removeBtn.dataset.index);
        if (!Number.isNaN(idx)) {
          let terms = getRecentSearches();
          terms.splice(idx, 1);
          saveRecentSearches(terms);
          if (ya_ajax && ya_ajax.currentUserId) {
            saveServerRecentSearches(terms);
          }
          renderRecentSearches();
        }
      }
    });
  }

  if (searchModalInput) {
    searchModalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = searchModalInput.value.trim();
        if (!query) return;

        let terms = getRecentSearches();
        terms = terms.filter(t => t !== query);
        terms.unshift(query);
        if (terms.length > 8) terms = terms.slice(0, 8);
        saveRecentSearches(terms);
        if (ya_ajax && ya_ajax.currentUserId) {
          saveServerRecentSearches(terms);
        }
        renderRecentSearches();

        // direct advanced search by query, ensure filter is applied on load
        const advancedUrl = new URL(window.location.origin + '/browse/');
        advancedUrl.searchParams.set('s', query);
        window.location.href = advancedUrl.toString();
      }
    });
  }
});

window.addEventListener('pageshow', () => {
  // On advanced search page we must keep the current query if present in URL,
  // otherwise the value is cleared after refresh and user loses what they typed.
  if (document.querySelector('.cautare-avansata')) {
    const q = new URLSearchParams(window.location.search).get('s');
    if (q) {
      const input = document.querySelector('.ya-search input, .ya-search-input');
      if (input && !input.value) {
        input.value = decodeURIComponent(q);
      }
    }
    return;
  }

  const input = document.querySelector('.ya-search input');
  const results = document.querySelector('.ya-search-results');
  if (input) input.value = '';
  if (results) results.style.display = 'none';
});

// ===============================
// Intersection animation
// ===============================
const items = document.querySelectorAll('.manga-card, .manga-cell');
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => e.isIntersecting && e.target.classList.add('show'));
}, { threshold: 0.2 });
items.forEach(i => obs.observe(i));

// ===============================
// Manga Carousel (CLEAN) — LAZY INIT
// ===============================
(function() {
  function observeAndInit(selector, initFn, margin = '400px') {
    const el = document.querySelector(selector);
    if (!el) return;
    let inited = false;
    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !inited) {
          inited = true;
          try { initFn(); } catch (err) { console.error('Popular carousel init error', err); }
          observer.unobserve(el);
        }
      });
    }, { rootMargin: margin, threshold: 0.01 });
    obs.observe(el);
  }

  function initPopularCarousel() {
    const viewport = document.querySelector('.carousel-viewport');
    const track = document.querySelector('.carousel-track');
    const arrowLeft = document.querySelector('.carousel-arrow.left');
    const arrowRight = document.querySelector('.carousel-arrow.right');

    if (!viewport || !track) return;

    // Disable native drag
    track.querySelectorAll('img, a').forEach(el => {
      el.draggable = false;
      el.addEventListener('dragstart', e => e.preventDefault());
    });

    viewport.style.userSelect = 'none';

    // Ensure carousel has between 10 and 50 items (pad by cloning or trim extras)
    (function enforceCarouselCount() {
      const MIN = 10;
      const MAX = 30; // reduced cap for DOM/perf
      const initialCells = Array.from(track.querySelectorAll('.manga-cell'));
      const count = initialCells.length;

      if (count === 0) return; // nothing to do

      if (count > MAX) {
        // Remove any cells beyond the maximum allowed
        initialCells.forEach((cell, i) => {
          if (i >= MAX) cell.remove();
        });
      } else if (count < MIN) {
        // Clone existing cells cyclically until we reach the minimum
        let idx = 0;
        while (track.querySelectorAll('.manga-cell').length < MIN) {
          const src = initialCells[idx % initialCells.length];
          const clone = src.cloneNode(true);
          // Clear any event binding markers to avoid duplicate-state issues
          clone.querySelectorAll('[data-bound]').forEach(el => el.removeAttribute('data-bound'));
          track.appendChild(clone);
          idx++;
        }
      }
    })();

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let isHorizontal = false;
    let currentX = 0;
    let moved = false;

    function clampX() {
      const max = track.scrollWidth - viewport.clientWidth;
      currentX = Math.max(-max, Math.min(0, currentX));
    }

    function stopDrag() {
      isDragging = false;
      track.style.transition = 'transform 0.35s ease';
    }

    // Mouse
    viewport.addEventListener('mousedown', e => {
      isDragging = true;
      moved = false;
      startX = e.pageX;
      track.style.transition = 'none';
      e.preventDefault();
    });

    viewport.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.pageX - startX;
      if (Math.abs(dx) > 5) moved = true;
      currentX += dx;
      clampX();
      track.style.transform = `translateX(${currentX}px)`;
      startX = e.pageX;
    });

    document.addEventListener('mouseup', stopDrag);

    // Touch: only capture horizontal swipes, let vertical scroll through
    let touchStartX = 0;
    let touchStartY = 0;
    let isCarouselSwipe = false;

    viewport.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      startX = touchStartX;
      isCarouselSwipe = false;
      moved = false;
    }, { passive: true });

    viewport.addEventListener('touchmove', e => {
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      const dx = touchX - touchStartX;
      const dy = touchY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (!isCarouselSwipe && absDx > 10 && absDy < 5) {
        isCarouselSwipe = true;
        track.style.transition = 'none';
      }

      if (isCarouselSwipe) {
        e.preventDefault();
        const delta = touchX - startX;
        if (Math.abs(delta) > 3) moved = true;
        currentX += delta;
        clampX();
        track.style.transform = `translateX(${currentX}px)`;
        startX = touchX;
      }
    }, { passive: false });

    viewport.addEventListener('touchend', () => {
      if (isCarouselSwipe) {
        track.style.transition = 'transform 0.35s ease';
      }
      isCarouselSwipe = false;
    }, { passive: true });

    // Click protection
    track.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', e => {
        if (moved) e.preventDefault();
      });
    });

    // Arrows
    let gap, cellWidth;
    if (window.innerWidth <= 1023) {
      cellWidth = 140;
      gap = 12;
    } else if (window.innerWidth <= 1199) {
      cellWidth = 160;
      gap = 12;
    } else {
      cellWidth = 180;
      gap = 16;
    }
    const step = cellWidth + gap;
    const ARROW_MOVE_COUNT = 5;

    if (arrowRight) {
      arrowRight.onclick = () => {
        clearTimeout(restartTimeout);
        stopAutoplay();
        currentX -= step * ARROW_MOVE_COUNT;
        clampX();
        currentIndex = Math.round(-currentX / step);
        track.style.transform = `translateX(${currentX}px)`;
        restartTimeout = setTimeout(startAutoplay, 2000);
      };
    }

    if (arrowLeft) {
      arrowLeft.onclick = () => {
        clearTimeout(restartTimeout);
        stopAutoplay();
        currentX += step * ARROW_MOVE_COUNT;
        clampX();
        currentIndex = Math.round(-currentX / step);
        track.style.transform = `translateX(${currentX}px)`;
        restartTimeout = setTimeout(startAutoplay, 2000);
      };
    }

    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Recalculate cell dimensions based on new window width
        if (window.innerWidth <= 1023) {
          cellWidth = 140;
          gap = 12;
        } else if (window.innerWidth <= 1199) {
          cellWidth = 160;
          gap = 12;
        } else {
          cellWidth = 180;
          gap = 16;
        }
        // Recalculate step and clamp position
        const newStep = cellWidth + gap;
        currentX = 0; // Reset to start position
        track.style.transition = 'none';
        track.style.transform = 'translateX(0px)';
        requestAnimationFrame(() => {
          track.style.transition = 'transform 0.35s ease';
        });
      }, 300);
    });

    // Autoplay
    let autoplayInterval;
    const autoplayDelay = 3000;
    let direction = 1;
    let currentIndex = 0;
    const maxIndex = Math.floor((track.scrollWidth - viewport.clientWidth) / step);
    let restartTimeout;

    function startAutoplay() {
      autoplayInterval = setInterval(() => {
        currentIndex += direction;
        if (currentIndex > maxIndex) {
          currentIndex = maxIndex;
          direction = -1;
        } else if (currentIndex < 0) {
          currentIndex = 0;
          direction = 1;
        }
        currentX = -currentIndex * step;
        track.style.transform = `translateX(${currentX}px)`;
      }, autoplayDelay);
    }

    function stopAutoplay() {
      clearInterval(autoplayInterval);
    }

    // Start autoplay initially
    startAutoplay();

    // Stop on hover
    viewport.addEventListener('mouseenter', stopAutoplay);
    viewport.addEventListener('mouseleave', startAutoplay);

    // Stop on touch start, restart on touch end
    let touchEndTimer;
    viewport.addEventListener('touchstart', () => {
      stopAutoplay();
      clearTimeout(touchEndTimer);
    }, { passive: true });
    viewport.addEventListener('touchend', () => {
      touchEndTimer = setTimeout(() => {
        startAutoplay();
      }, 2000);
    }, { passive: true });
  }

  // Observe and initialize when near viewport
  document.addEventListener('DOMContentLoaded', () => {
    observeAndInit('.manga-carousel.popular-today', initPopularCarousel, '300px');
  });
})();

// Advanced search button redirect (except on cautare-avansata page)
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.ya-filter');
  if (!btn) return;

  // Don't redirect on cautare-avansata page - let toggle logic handle it
  if (document.querySelector('.cautare-avansata')) return;

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    
    // Clear all saved filter selections from localStorage before going to advanced search
    const filterKeys = [
      'mangayummy_filter_sort-select',
      'mangayummy_filter_type-select',
      'mangayummy_filter_language-select',
      'mangayummy_filter_status-select',
      'mangayummy_filter_genre-select',
      'mangayummy_filter_author-select',
      'mangayummy_filter_artist-select'
    ];

    filterKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    window.location.href = '/browse/';
  });
});

// ===============================
// Bookmark functionality (safe version)
// ===============================
function showGuestNotice(message, type = 'error') {
  const toast = document.createElement('div');
  toast.className = `ya-toast ya-toast--${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

document.addEventListener('click', function (e) {
    const box = e.target.closest('.bookmark-box');
    if (!box) return;

    // Check if user is logged in
    const isLoggedIn = box.getAttribute('data-logged-in') === '1';
    if (!isLoggedIn) {
      showGuestNotice('Trebuie să fii logat pentru a salva manga la favorite.', 'error');
        return;
    }

    const postId = box.dataset.post;
    const nonce = box.dataset.nonce;
    const icon = box.querySelector('.meta-svg-icon') || box.querySelector('.icon-bookmark');
    const count = box.querySelector('.meta-count');

    fetch(ya_ajax.ajax_url, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            action: 'mangayummy_toggle_bookmark',
            post_id: postId,
            nonce: nonce
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.data && res.data.login_required) {
        showGuestNotice(res.data.message || 'Trebuie să fii logat pentru această acțiune.', 'error');
            return;
        }
        if (!res.success) return;
        icon.classList.toggle('active', res.data.status === 'added');
        count.textContent = res.data.count;
    });
});

// ===============================
// Follow / Unfollow manga
// ===============================
document.addEventListener('click', function (e) {
    const box = e.target.closest('.follow-box');
    if (!box) return;

    const isLoggedIn = box.getAttribute('data-logged-in') === '1';
    if (!isLoggedIn) {
    showGuestNotice('Trebuie să fii logat pentru a urmări acest manga.', 'error');
        return;
    }

    const mangaId = box.dataset.manga;
    const nonce = box.dataset.nonce;
    const isFollowing = box.getAttribute('data-following') === '1';
    const icon = box.querySelector('.meta-svg-icon');
    const label = box.querySelector('.meta-label');

    const action = isFollowing ? 'mangayummy_unfollow_manga' : 'mangayummy_follow_manga';

    fetch(ya_ajax.ajax_url, {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: new URLSearchParams({
            action: action,
            manga_id: mangaId,
            nonce: nonce
        })
    })
    .then(r => r.json())
    .then(res => {
        if (res.data && res.data.login_required) {
        showGuestNotice(res.data.message || 'Trebuie să fii logat pentru această acțiune.', 'error');
            return;
        }

        if (!res.success) return;

        const nowFollowing = action === 'mangayummy_follow_manga';
        box.setAttribute('data-following', nowFollowing ? '1' : '0');
        icon.classList.toggle('active', nowFollowing);
        if (label) {
            label.textContent = nowFollowing ? 'Urmărești' : 'Urmărește';
        }

        // Update follower count badge
        const countEl = box.querySelector('.meta-count');
        if (countEl && res.data && typeof res.data.count !== 'undefined') {
            countEl.textContent = res.data.count;
        }
    });
});

// ===============================
// Summary toggle functionality
// ===============================
document.addEventListener('DOMContentLoaded', function () {
    const summaryToggle = document.getElementById('summaryToggle');
    const summaryText = document.getElementById('summaryText');
    const summaryWrapper = summaryText ? summaryText.parentElement : null;

    if (summaryToggle && summaryText && summaryWrapper) {
        // Check if summary overflow exists and show/hide toggle
        function checkSummaryOverflow() {
            // Check if content has actual text
            const textContent = summaryText.textContent.trim();
            if (!textContent || textContent.length === 0) {
                summaryToggle.remove();
                return;
            }
            
            // Check if wrapper content overflows (scrollHeight > maxHeight of 120px)
            const computed = window.getComputedStyle(summaryWrapper);
            const originalMaxHeight = computed.maxHeight;
            
            // temporarily remove restriction to measure full height
            summaryWrapper.style.maxHeight = 'none';
            const scrollHeight = summaryWrapper.scrollHeight;
            summaryWrapper.style.maxHeight = originalMaxHeight; // restore CSS value
            
            // parse the max-height value we actually use (could be rem/em/px)
            let maxHeight = parseFloat(originalMaxHeight);
            if (originalMaxHeight.indexOf('rem') !== -1) {
                // convert rem to px using root font size
                const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
                maxHeight *= rootFontSize;
            }
            // fallback to 120 if parsing failed
            if (isNaN(maxHeight) || maxHeight <= 0) {
                maxHeight = 120;
            }
            const hasOverflow = scrollHeight > maxHeight + 5;
            
            const bugButton = document.getElementById('bug-btn');

            if (!hasOverflow) {
                // Short description - hide toggle and bug button
                summaryToggle.style.display = 'none';
                if (bugButton) {
                    bugButton.style.display = 'none';
                }
            } else {
                // Long description - show toggle and bug button
                summaryToggle.style.display = 'block';
                if (bugButton) {
                    bugButton.style.display = 'inline-flex';
                }
                // set initial text according to type
                if (summaryToggle.classList.contains('more')) {
                    summaryToggle.textContent = '[Mai mult]';
                } else {
                    summaryToggle.textContent = '▾';
                }
            }
        }
        
        // Run check after fonts/images loaded
        if (document.readyState === 'complete') {
            checkSummaryOverflow();
        } else {
            window.addEventListener('load', checkSummaryOverflow);
        }
        
        // Re-check on window resize
        window.addEventListener('resize', checkSummaryOverflow);
        
        summaryToggle.addEventListener('click', function () {
            summaryWrapper.classList.toggle('expanded');
            const isExpanded = summaryWrapper.classList.contains('expanded');
            // if the toggle was converted to a "more" button, use text labels
            if (summaryToggle.classList.contains('more')) {
                summaryToggle.textContent = isExpanded ? '[Mai puțin]' : '[Mai mult]';
            } else {
                summaryToggle.textContent = isExpanded ? '▴' : '▾';
            }
        });
    }

    // Chapters Progress Modal handlers
    const modal = document.getElementById("chapters-progress-modal");
    if (modal) {
        const boxes = document.querySelectorAll(".progress-box");

        boxes.forEach(box => {
            box.addEventListener("click", function (e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Check if user is logged in
                const isLoggedIn = this.getAttribute('data-logged-in') === '1';
                if (!isLoggedIn) {
                  showGuestNotice('Trebuie să fii logat ca să salvezi capitolele citite.', 'error');
                    return;
                }
                
                // Populate modal with data
                const mangaId = this.getAttribute('data-manga-id');
                const currentCount = this.querySelector('.meta-count');
                const currentText = currentCount.textContent;
                const parts = currentText.split('/');
                const currentProgress = parseFloat(parts[0]) || 0;
                const totalChapters = parseFloat(parts[1]) || 0;
                
                // Update modal content
                const currentProgressSpan = document.getElementById('modal-current-progress');
                const totalChaptersSpan = document.getElementById('modal-total-chapters');
                const chapterInput = document.getElementById('chapter-input');
                
                if (currentProgressSpan) currentProgressSpan.textContent = currentProgress;
                if (totalChaptersSpan) totalChaptersSpan.textContent = totalChapters;
                if (chapterInput) {
                  // If progress is zero, leave input empty to avoid forcing users to delete '0'
                  chapterInput.value = (currentProgress && currentProgress > 0) ? currentProgress : '';
                }
                
                // Store data for saving
                modal.dataset.mangaId = mangaId;
                modal.dataset.maxChapters = totalChapters;
                
                modal.classList.add("is-open");
                
                // Focus input
                if (chapterInput) {
                    setTimeout(() => chapterInput.focus(), 100);
                }
            });
        });

        const closeBtn = modal.querySelector(".modal-close");
        if (closeBtn) {
            closeBtn.addEventListener("click", function () {
                modal.classList.remove("is-open");
            });
        }

        modal.addEventListener("click", function (e) {
            if (e.target === modal) {
                modal.classList.remove("is-open");
            }
        });

        // Modal buttons
        const modalCancel = modal.querySelector("#modal-cancel");
        const modalSave = modal.querySelector("#modal-save");
        const modalReset = modal.querySelector("#modal-reset");
        const chapterInput = document.getElementById('chapter-input');

        if (modalCancel) {
            modalCancel.addEventListener("click", function () {
                modal.classList.remove("is-open");
            });
        }

        if (modalReset) {
            modalReset.addEventListener("click", function () {
                if (chapterInput) chapterInput.value = 0;
            });
        }

        if (modalSave) {
            modalSave.addEventListener("click", function () {
                const chapterNumber = parseFloat(chapterInput.value) || 0;
                const mangaId = modal.dataset.mangaId;
                const maxChapters = parseFloat(modal.dataset.maxChapters) || 0;

                if (isNaN(chapterNumber)) {
                    // Show inline error instead of alert
                  const inputContainer = chapterInput.parentNode;
                    const err = document.createElement('div');
                    err.textContent = 'Te rog introdu un număr valid pentru capitol.';
                    err.style.cssText = 'color: #e74c3c; font-size: 12px; margin-top: 5px;';
                    inputContainer.appendChild(err);
                    setTimeout(() => err.remove(), 3000);
                    return;
                }

                if (chapterNumber < 0) {
                    // Show inline error
                  const inputContainer = chapterInput.parentNode;
                    const err = document.createElement('div');
                    err.textContent = 'Numărul capitolului nu poate fi negativ.';
                    err.style.cssText = 'color: #e74c3c; font-size: 12px; margin-top: 5px;';
                    inputContainer.appendChild(err);
                    setTimeout(() => err.remove(), 3000);
                    return;
                }

                // No limit on chapter number - user can add any number of chapters

                // Send AJAX request
                const formData = new FormData();
                formData.append('action', 'mangayummy_update_progress');
                formData.append('nonce', ya_ajax.nonce);
                formData.append('manga_id', mangaId);
                formData.append('chapter_number', chapterNumber);

                modalSave.classList.add('loading');
                modalSave.textContent = 'Se salvează...';

                fetch(ya_ajax.ajax_url, {
                    method: 'POST',
                    body: formData
                })
                .then(resp => resp.json())
                .then(data => {
                    if (data.success) {
                        // Update UI on the page
                        const box = document.querySelector(
                            '.progress-box[data-manga-id="' + mangaId + '"]'
                        );

                        if (box) {
                            const count = box.querySelector(".meta-count");
                            if (count) {
                                // Show progress/total (or just progress if total is 0)
                                if (data.data.total > 0) {
                                  count.textContent = data.data.progress + " / " + data.data.total;
                                } else {
                                  count.textContent = data.data.progress;
                                }
                            }

                            // Update book icon - closed to open when progress > 0
                            const bookIcon = box.querySelector(".meta-svg-icon");
                            if (bookIcon && data.data.progress > 0 && bookIcon.classList.contains('book-closed')) {
                                // Replace with open book SVG
                                bookIcon.outerHTML = '<svg class="meta-svg-icon book-open" viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM4 18V6h7v12H4zm16 0h-7V6h7v12z"/><path d="M6 8h3v2H6zm0 4h3v2H6zm9-4h3v2h-3zm0 4h3v2h-3z"/></svg>';
                            }

                              // bottom-nav initialization moved to global DOMContentLoaded handler

                            const progress = box.querySelector(".icon-progress");
                            if (progress && data.data.total > 0) {
                                const percent = (data.data.progress / data.data.total) * 100;
                                progress.style.setProperty("--progress", percent + "%");
                            }
                        }

                        // Show notification if status changed to completed
                        if (data.data.status_changed && data.data.new_status === 'completed') {
                            // Update status badge on page if exists
                            const statusBadges = document.querySelectorAll('.status-badge');
                            statusBadges.forEach(badge => {
                                // Remove all status classes
                                badge.className = badge.className.replace(/status-\w+/g, '').trim();
                                badge.classList.add('status-badge', 'status-completed');
                                badge.textContent = 'Finalizat';
                            });
                        }

                        // Update modal values for next time
                        const currentProgressSpan = document.getElementById('modal-current-progress');
                        if (currentProgressSpan) currentProgressSpan.textContent = data.data.progress;

                        modal.classList.remove("is-open");
                    } else {
                        console.error('Progress save error:', data);
                        if (data && data.data && data.data.login_required) {
                          showGuestNotice(data.data.message || 'Trebuie să fii logat ca să salvezi progresul.', 'error');
                        } else {
                          showGuestNotice((data && data.data && data.data.message) || 'Eroare la salvarea progresului.', 'error');
                        }
                    }
                })
                .catch(err => {
                    console.error(err);
                      showGuestNotice('Eroare de conexiune la salvarea progresului.', 'error');
                })
                .finally(() => {
                    modalSave.classList.remove('loading');
                    modalSave.textContent = 'Salvează';
                });
            });
        }

        // ESC key to close
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) {
                modal.classList.remove('is-open');
            }
        });

        // Enter key to save
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && modal.classList.contains('is-open')) {
                e.preventDefault();
                if (modalSave) modalSave.click();
            }
        });
    }
});
// ===============================
// Recently Added Section - Swiper Library (LAZY INIT)
// ===============================
(function() {
  // Helper: observe element and run init once when it approaches viewport
  function observeAndInitSwiper(selector, initFn, margin = '400px') {
    const el = document.querySelector(selector);
    if (!el) return;
    let inited = false;
    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !inited) {
          inited = true;
          try { initFn(); } catch (err) { console.error('Swiper init error for', selector, err); }
          observer.unobserve(el);
        }
      });
    }, { rootMargin: margin, threshold: 0.01 });
    obs.observe(el);
  }

  // Actual initializer (keeps existing behaviour)
  function initRecentlyAdded() {
    const swiperContainer = document.querySelector('.recently-added-swiper');
    if (!swiperContainer) return;

    // Check if Swiper library is available
    if (typeof Swiper === 'undefined') {
      initFallbackDrag();
      return;
    }

    // Prevent default image drag on desktop (only once)
    if (!window.__mangayummy_prevent_img_drag) {
      document.addEventListener('dragstart', function (e) {
        if (e.target && e.target.tagName === 'IMG') e.preventDefault();
      });
      window.__mangayummy_prevent_img_drag = true;
    }

    const recentlySwiper = new Swiper('.recently-added-swiper', {
      slidesPerView: 6,
      spaceBetween: 14,
      slidesPerGroup: 1,
      loop: false,
      watchOverflow: true,

      grabCursor: true,
      simulateTouch: true,
      touchStartPreventDefault: true,
      passiveListeners: false,

      autoHeight: true,

      breakpoints: {
        0: { slidesPerView: 2 },
        480: { slidesPerView: 3 },
        768: { slidesPerView: 4 },
        1024: { slidesPerView: 6 }
      },

      on: {
        init(swiper) {
          swiper.el.style.visibility = 'visible';
          if (swiper.slides.length > 50) {
            swiper.slides.slice(50).forEach(slide => slide.remove());
            swiper.update();
          }
        }
      }
    });
    
    // Connect external section-nav buttons for recently-added
    const prevBtn = document.querySelector('.swiper-prev-recently');
    const nextBtn = document.querySelector('.swiper-next-recently');
    
    if (prevBtn && nextBtn && recentlySwiper) {
      function updateNavButtons() {
        prevBtn.disabled = recentlySwiper.isBeginning;
        nextBtn.disabled = recentlySwiper.isEnd;
      }
      
      prevBtn.addEventListener('click', () => {
        recentlySwiper.slidePrev();
      });
      
      nextBtn.addEventListener('click', () => {
        recentlySwiper.slideNext();
      });
      
      recentlySwiper.on('slideChange', updateNavButtons);
      recentlySwiper.on('reachBeginning', updateNavButtons);
      recentlySwiper.on('reachEnd', updateNavButtons);
      updateNavButtons();
    }
  }

  // Observe and init only when section is near viewport
  document.addEventListener('DOMContentLoaded', () => {
    observeAndInitSwiper('.recently-added-swiper', initRecentlyAdded, '300px');
  });
})();

// Fallback implementation if Swiper library not available
function initFallbackDrag() {
  const recentlyAddedSwiper = document.querySelector('.recently-added-swiper');
  if (!recentlyAddedSwiper) return;

  const wrapper = recentlyAddedSwiper.querySelector('.swiper-wrapper');
  const slides = recentlyAddedSwiper.querySelectorAll('.swiper-slide');
  const prevBtn = recentlyAddedSwiper.querySelector('.swiper-button-prev');
  const nextBtn = recentlyAddedSwiper.querySelector('.swiper-button-next');

  if (!wrapper || slides.length === 0) return;

  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let moved = false;

  function clampX() {
    const maxScroll = wrapper.scrollWidth - recentlyAddedSwiper.clientWidth;
    currentX = Math.max(-maxScroll, Math.min(0, currentX));
  }

  function stopDrag() {
    isDragging = false;
    wrapper.style.transition = 'transform 0.35s ease';
  }

  function getItemsPerView() {
    const width = window.innerWidth;
    if (width < 480) return 2;
    if (width < 768) return 3;
    if (width < 1024) return 4;
    return 6;
  }

  // Mouse events
  wrapper.addEventListener('mousedown', e => {
    isDragging = true;
    moved = false;
    startX = e.pageX;
    wrapper.style.transition = 'none';
    e.preventDefault();
  });

  wrapper.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 5) moved = true;
    currentX += dx;
    clampX();
    wrapper.style.transform = `translateX(${currentX}px)`;
    startX = e.pageX;
  });

  document.addEventListener('mouseup', stopDrag);

  // Touch events - FIXED for mobile
  wrapper.addEventListener('touchstart', e => {
    isDragging = true;
    moved = false;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isHorizontal = false;
    wrapper.style.transition = 'none';
  }, { passive: true });

  wrapper.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);

    if (dx > dy) {
      isHorizontal = true;
      e.preventDefault();
      const delta = e.touches[0].clientX - startX;
      if (Math.abs(delta) > 5) moved = true;
      currentX += delta;
      clampX();
      wrapper.style.transform = `translateX(${currentX}px)`;
      startX = e.touches[0].clientX;
    } else {
      startY = e.touches[0].clientY;
    }
  }, { passive: false });

  document.addEventListener('touchend', stopDrag);

  // Click protection
  wrapper.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      if (moved) e.preventDefault();
    });
  });

  // Navigation buttons
  const gap = 14;
  const cardWidth = 130;

  function getStep() {
    if (window.innerWidth < 480) return 110 + gap;
    return (cardWidth + gap);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentX -= getStep();
      clampX();
      wrapper.style.transform = `translateX(${currentX}px)`;
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentX += getStep();
      clampX();
      wrapper.style.transform = `translateX(${currentX}px)`;
    });
  }

  window.addEventListener('resize', () => {
    clampX();
    wrapper.style.transform = `translateX(${currentX}px)`;
  });
}

// ===============================
// Slider Sections - Swiper Library (LAZY INIT)
// ===============================
(function() {
  function observeAndInit(selector, initFn, margin = '400px') {
    const el = document.querySelector(selector);
    if (!el) return;
    let inited = false;
    const obs = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !inited) {
          inited = true;
          try { initFn(); } catch (err) { console.error('Swiper init error for', selector, err); }
          observer.unobserve(el);
        }
      });
    }, { rootMargin: margin, threshold: 0.01 });
    obs.observe(el);
  }

  function initSwiper(selector) {
    const swiperContainer = document.querySelector(selector);
    if (!swiperContainer) return;

    if (typeof Swiper === 'undefined') {
      initFallbackDragGeneric(selector);
      return;
    }

    if (!window.__mangayummy_prevent_img_drag) {
      document.addEventListener('dragstart', function (e) {
        if (e.target && e.target.tagName === 'IMG') e.preventDefault();
      });
      window.__mangayummy_prevent_img_drag = true;
    }

    const swiper = new Swiper(selector, {
      slidesPerView: 6,
      spaceBetween: 14,
      slidesPerGroup: 1,
      loop: false,
      watchOverflow: true,

      grabCursor: true,
      simulateTouch: true,
      touchStartPreventDefault: true,
      passiveListeners: false,

      autoHeight: true,

      breakpoints: {
        0: { slidesPerView: 2 },
        480: { slidesPerView: 3 },
        768: { slidesPerView: 4 },
        1024: { slidesPerView: 6 }
      },

      on: {
        init(swiper) {
          swiper.el.style.visibility = 'visible';
          if (swiper.slides.length > 50) {
            swiper.slides.slice(50).forEach(slide => slide.remove());
            swiper.update();
          }
        }
      }
    });
    return swiper;
  }

  function initRecommended() {
    const swiper = initSwiper('.recommended-swiper');
    if (!swiper) return;
    
    // Connect external section-nav buttons
    const prevBtn = document.querySelector('.swiper-prev-recommended');
    const nextBtn = document.querySelector('.swiper-next-recommended');
    
    if (prevBtn && nextBtn) {
      function updateNavButtons() {
        prevBtn.disabled = swiper.isBeginning;
        nextBtn.disabled = swiper.isEnd;
      }
      
      prevBtn.addEventListener('click', () => {
        swiper.slidePrev();
      });
      
      nextBtn.addEventListener('click', () => {
        swiper.slideNext();
      });
      
      swiper.on('slideChange', updateNavButtons);
      swiper.on('reachBeginning', updateNavButtons);
      swiper.on('reachEnd', updateNavButtons);
      updateNavButtons();
    }
  }
  function initPopular() {
    const swiper = initSwiper('.popular-swiper');
    if (!swiper) return;
    
    // Connect external section-nav buttons
    const prevBtn = document.querySelector('.swiper-prev-popular');
    const nextBtn = document.querySelector('.swiper-next-popular');
    
    if (prevBtn && nextBtn) {
      function updateNavButtons() {
        prevBtn.disabled = swiper.isBeginning;
        nextBtn.disabled = swiper.isEnd;
      }
      
      prevBtn.addEventListener('click', () => {
        swiper.slidePrev();
      });
      
      nextBtn.addEventListener('click', () => {
        swiper.slideNext();
      });
      
      swiper.on('slideChange', updateNavButtons);
      swiper.on('reachBeginning', updateNavButtons);
      swiper.on('reachEnd', updateNavButtons);
      updateNavButtons();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    observeAndInit('.recommended-swiper', initRecommended, '300px');
    observeAndInit('.popular-swiper', initPopular, '300px');
  });
})();

// Fallback implementation if Swiper library not available (generic)
function initFallbackDragGeneric(selector) {
  const container = document.querySelector(selector);
  if (!container) return;

  const wrapper = container.querySelector('.swiper-wrapper');
  const slides = container.querySelectorAll('.swiper-slide');
  const prevBtn = container.querySelector('.swiper-button-prev');
  const nextBtn = container.querySelector('.swiper-button-next');

  if (!wrapper || slides.length === 0) return;

  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let moved = false;

  function clampX() {
    const maxScroll = wrapper.scrollWidth - container.clientWidth;
    currentX = Math.max(-maxScroll, Math.min(0, currentX));
  }

  function stopDrag() {
    isDragging = false;
    wrapper.style.transition = 'transform 0.35s ease';
  }

  function getItemsPerView() {
    const width = window.innerWidth;
    if (width < 480) return 2;
    if (width < 768) return 3;
    if (width < 1024) return 4;
    return 6;
  }

  // Mouse events
  wrapper.addEventListener('mousedown', e => {
    isDragging = true;
    moved = false;
    startX = e.pageX;
    wrapper.style.transition = 'none';
    e.preventDefault();
  });

  wrapper.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.pageX - startX;
    if (Math.abs(dx) > 5) moved = true;
    currentX += dx;
    clampX();
    wrapper.style.transform = `translateX(${currentX}px)`;
    startX = e.pageX;
  });

  document.addEventListener('mouseup', stopDrag);

  // Touch events - FIXED for mobile
  wrapper.addEventListener('touchstart', e => {
    isDragging = true;
    moved = false;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isHorizontal = false;
    wrapper.style.transition = 'none';
  }, { passive: true });

  wrapper.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = Math.abs(e.touches[0].clientX - startX);
    const dy = Math.abs(e.touches[0].clientY - startY);

    if (dx > dy) {
      isHorizontal = true;
      e.preventDefault();
      const delta = e.touches[0].clientX - startX;
      if (Math.abs(delta) > 5) moved = true;
      currentX += delta;
      clampX();
      wrapper.style.transform = `translateX(${currentX}px)`;
      startX = e.touches[0].clientX;
    } else {
      startY = e.touches[0].clientY;
    }
  }, { passive: false });

  document.addEventListener('touchend', stopDrag);

  // Click protection
  wrapper.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', e => {
      if (moved) e.preventDefault();
    });
  });

  // Navigation buttons
  const gap = 14;
  const cardWidth = 130;

  function getStep() {
    if (window.innerWidth < 480) return 110 + gap;
    return (cardWidth + gap);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentX -= getStep();
      clampX();
      wrapper.style.transform = `translateX(${currentX}px)`;
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentX += getStep();
      clampX();
      wrapper.style.transform = `translateX(${currentX}px)`;
    });
  }

  window.addEventListener('resize', () => {
    clampX();
    wrapper.style.transform = `translateX(${currentX}px)`;
  });
}

// Global bottom-nav initialization (runs after DOM ready)
document.addEventListener('DOMContentLoaded', function() {
  // ya-bottom-nav: initialization (logs removed in production)

  const bottomNav = document.querySelector('.ya-bottom-nav');
  if (!bottomNav) {
    console.warn('ya-bottom-nav: element not found in DOM (global)');
    return;
  }

  // enforce base style
  bottomNav.classList.add('visible');
  bottomNav.classList.remove('is-hidden');
  // Ensure the element is renderable and has the correct transition (inline to avoid load order issues)
  try {
    bottomNav.style.display = bottomNav.style.display || 'flex';
    bottomNav.style.transition = bottomNav.style.transition || 'transform .3s ease, opacity .3s ease';
    bottomNav.style.willChange = bottomNav.style.willChange || 'transform';
  } catch (err) {}

  // MutationObserver to detect external class changes
  let prevClass = bottomNav.className;
  const mo = new MutationObserver(mutations => {
    mutations.forEach(m => {
      if (m.attributeName === 'class') {
        const now = bottomNav.className;
        if (now !== prevClass) {
          // class changed externally (log suppressed)
          prevClass = now;
        }
      }
      if (m.attributeName === 'style') {
        // If some script sets display:none, revert it to flex to keep animations
        const ds = bottomNav.style.display;
        const tr = bottomNav.style.transform;
        if (ds === 'none') {
          console.warn('ya-bottom-nav: external script set display:none — reverting to flex');
          bottomNav.style.display = 'flex';
        }
        // log if transform touched
        if (tr && tr.indexOf('translateY') >= 0) {
          // no-op, but useful for debugging
        }
      }
    });
  });
  mo.observe(bottomNav, { attributes: true, attributeFilter: ['class'] });

  // Pointer swipe handling (mobile/tablet)
  let startY = null;
  let lastY = null;
  const SWIPE_THRESHOLD = 2; // react to very small touches

  function onPointerDown(e) {
    if (window.innerWidth > 1024) return;
    startY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY) || null;
    lastY = startY;
  }

  function onPointerMove(e) {
    if (startY === null) return;
    lastY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] && e.touches[0].clientY) || lastY;
  }

  function closeCommunityDropdown() {
    var dropdown = document.querySelector('.community-dropdown');
    if (!dropdown) return;
    if (!dropdown.classList.contains('open')) return;
    dropdown.classList.remove('open');
    dropdown.setAttribute('aria-hidden', 'true');
    var headerToggle = document.querySelector('.community-wrapper .community-toggle');
    if (headerToggle) {
      headerToggle.setAttribute('aria-expanded', 'false');
    }
  }

  function onPointerUp() {
    if (startY === null || lastY === null) { startY = lastY = null; return; }
    const delta = lastY - startY;
    if (Math.abs(delta) < SWIPE_THRESHOLD) { startY = lastY = null; return; }
    if (delta > 0) {
      bottomNav.classList.remove('is-hidden');
    } else {
      bottomNav.classList.add('is-hidden');
      closeCommunityDropdown();
    }
    startY = lastY = null;
  }

  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });
  document.addEventListener('touchstart', onPointerDown, { passive: true });
  document.addEventListener('touchmove', onPointerMove, { passive: true });
  document.addEventListener('touchend', onPointerUp, { passive: true });

  // Scroll handling using RAF throttling (instant toggle on next frame)
  let lastScroll = window.scrollY || document.documentElement.scrollTop;
  let lastKnownScrollY = lastScroll;
  let ticking = false;
  const SCROLL_DELTA = 1; // minimal threshold so even the smallest scroll triggers

  window.addEventListener('scroll', () => {
    lastKnownScrollY = window.scrollY || document.documentElement.scrollTop;
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function() {
        const cur = lastKnownScrollY;
        const diff = cur - lastScroll;

        // ignore micro-movements smaller than SCROLL_DELTA
        if (Math.abs(diff) < SCROLL_DELTA) {
          lastScroll = cur;
          ticking = false;
          return;
        }

        // Determine direction and toggle immediately
        if (diff > SCROLL_DELTA) {
          // scrolling down -> hide
          if (!bottomNav.classList.contains('is-hidden')) {
            bottomNav.classList.add('is-hidden');
            closeCommunityDropdown();
            try {
              const cs = window.getComputedStyle(bottomNav);
              // added is-hidden (log suppressed)
            } catch (err) {}
          }
        } else if (diff < -SCROLL_DELTA) {
          // scrolling up -> show
          if (bottomNav.classList.contains('is-hidden')) {
            bottomNav.classList.remove('is-hidden');
            try {
              const cs = window.getComputedStyle(bottomNav);
              // removed is-hidden (log suppressed)
            } catch (err) {}
          }
        }

        lastScroll = cur;
        ticking = false;
      });
    }
  }, { passive: true });

  // Ensure not sticky
  const compStyle = window.getComputedStyle(bottomNav);
  if (compStyle.position === 'sticky') {
    console.warn('ya-bottom-nav: element has position: sticky; overriding to fixed for proper behavior');
    bottomNav.style.position = 'fixed';
  }
});

// ===============================
// Translator Group Show More Chapters
// ===============================
document.addEventListener('DOMContentLoaded', function() {
  const showMoreBtn = document.querySelector('.show-more-btn');
  
  if (showMoreBtn) {
    showMoreBtn.addEventListener('click', function() {
      const hiddenChapters = document.querySelectorAll('.hidden-chapter');
      const showMoreText = this.querySelector('.show-more-text');
      const showLessText = this.querySelector('.show-less-text');
      const isExpanded = this.dataset.expanded === 'true';
      
      if (isExpanded) {
        // Hide chapters
        hiddenChapters.forEach(chapter => {
          chapter.style.display = 'none';
        });
        showMoreText.style.display = 'inline';
        showLessText.style.display = 'none';
        this.dataset.expanded = 'false';
      } else {
        // Show chapters
        hiddenChapters.forEach(chapter => {
          chapter.style.display = 'block';
        });
        showMoreText.style.display = 'none';
        showLessText.style.display = 'inline';
        this.dataset.expanded = 'true';
      }
    });
  }
});
// ===============================
// Toggle Filters on Cautare Avansata Page
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  // Only run on cautare-avansata page
  if (!document.querySelector('.cautare-avansata')) return;

  const filterBtn = document.querySelector('.ya-filter');
  const filtersSidebar = document.querySelector('.filters-sidebar');

  if (!filterBtn || !filtersSidebar) return;

  // Initially show filters (default open)
  filtersSidebar.style.display = 'block';
  filterBtn.innerHTML = '<i class="fa fa-filter"></i>Browse <i class="fa fa-chevron-up"></i>';

  filterBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const isHidden = filtersSidebar.style.display === 'none';

    if (isHidden) {
      // Show filters
      filtersSidebar.style.display = 'block';
      filterBtn.innerHTML = '<i class="fa fa-filter"></i>Browse <i class="fa fa-chevron-up"></i>';
      // Removed smooth scroll to filters
    } else {
      // Hide filters
      filtersSidebar.style.display = 'none';
      filterBtn.innerHTML = '<i class="fa fa-filter"></i>Browse <i class="fa fa-chevron-down"></i>';
    }
  });
});

// ===============================
// Load Real Data for Dropdowns on Cautare Avansata Page
// ===============================
document.addEventListener('DOMContentLoaded', () => {
  // Only run on cautare-avansata page
  if (!document.querySelector('.cautare-avansata')) return;

  // Load real data for dropdowns
  loadGenres();
  loadAuthors();
  loadArtists();
  loadYears();
});

function loadGenres() {
  const genreSelect = document.getElementById('genre-select');
  if (!genreSelect) return;

  fetch(ya_ajax.ajax_url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      'action': 'mangayummy_get_all_genres',
      'nonce': ya_ajax.nonce
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data && Array.isArray(data)) {
      data.forEach(genre => {
        const option = document.createElement('option');
        option.value = genre.slug;
        option.textContent = `${genre.name} (${genre.count})`;
        genreSelect.appendChild(option);
      });
    }
  })
  .catch(error => console.error('Error loading genres:', error));
}

function loadAuthors() {
  const authorSelect = document.getElementById('author-select');
  if (!authorSelect) return;

  fetch(ya_ajax.ajax_url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      'action': 'mangayummy_get_all_authors',
      'nonce': ya_ajax.nonce
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data && Array.isArray(data)) {
      data.forEach(author => {
        const option = document.createElement('option');
        option.value = author.slug;
        option.textContent = `${author.name} (${author.count})`;
        authorSelect.appendChild(option);
      });
    }
  })
  .catch(error => console.error('Error loading authors:', error));
}

function loadArtists() {
  const artistSelect = document.getElementById('artist-select');
  if (!artistSelect) return;

  fetch(ya_ajax.ajax_url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      'action': 'mangayummy_get_all_artists',
      'nonce': ya_ajax.nonce
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data && Array.isArray(data)) {
      data.forEach(artist => {
        const option = document.createElement('option');
        option.value = artist.slug;
        option.textContent = `${artist.name} (${artist.count})`;
        artistSelect.appendChild(option);
      });
    }
  })
  .catch(error => console.error('Error loading artists:', error));
}

function loadYears() {
  const yearFromSelect = document.getElementById('year-from');
  const yearToSelect = document.getElementById('year-to');
  if (!yearFromSelect || !yearToSelect) return;

  fetch(ya_ajax.ajax_url, {
    method: 'POST',
    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      'action': 'mangayummy_get_all_years',
      'nonce': ya_ajax.nonce
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data && Array.isArray(data)) {
      data.forEach(year => {
        const optionFrom = document.createElement('option');
        optionFrom.value = year.year;
        optionFrom.textContent = year.label;
        yearFromSelect.appendChild(optionFrom);

        const optionTo = document.createElement('option');
        optionTo.value = year.year;
        optionTo.textContent = year.label;
        yearToSelect.appendChild(optionTo);
      });
    }
  })
  .catch(error => console.error('Error loading years:', error));
}

// ===============================
// Latest Updates Pagination
// ===============================
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    let popularRecentAbortController = null;

    const container = document.querySelector('.latest-updates-list');
    if (!container) return;
    
    const items = container.querySelectorAll('.latest-update-item');
    if (items.length === 0) return;
    
    const prevBtn = document.querySelector('.swiper-prev-latest');
    const nextBtn = document.querySelector('.swiper-next-latest');
    if (!prevBtn || !nextBtn) return;
    
    const itemsPerPage = 6;
    let currentPage = 0;
    const totalPages = Math.ceil(items.length / itemsPerPage);
    
    function showPage(page) {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      
      items.forEach((item, index) => {
        if (index >= start && index < end) {
          item.style.display = '';
        } else {
          item.style.display = 'none';
        }
      });
      
      prevBtn.disabled = page === 0;
      nextBtn.disabled = page >= totalPages - 1;
    }
    
    prevBtn.addEventListener('click', () => {
      if (currentPage > 0) {
        currentPage--;
        showPage(currentPage);
      }
    });
    
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages - 1) {
        currentPage++;
        showPage(currentPage);
      }
    });
    
    // Initialize first page
    showPage(0);
  });
})();

// ===============================
// Section Dropdown (Time Period Filter)
// ===============================
(function() {
  document.addEventListener('DOMContentLoaded', function() {
    let popularRecentAbortController = null;

    // Toggle dropdown on button click
    document.querySelectorAll('.section-dropdown-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        const dropdown = this.closest('.section-dropdown');
        
        // Close other dropdowns
        document.querySelectorAll('.section-dropdown.open').forEach(d => {
          if (d !== dropdown) d.classList.remove('open');
        });
        
        dropdown.classList.toggle('open');
      });
    });
    
    // Handle item selection
    document.querySelectorAll('.section-dropdown-menu .dropdown-item').forEach(item => {
      item.addEventListener('click', function() {
        const dropdown = this.closest('.section-dropdown');
        const btn = dropdown.querySelector('.section-dropdown-btn');
        const period = this.dataset.period;
        
        // Update active state
        dropdown.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        this.classList.add('active');
        
        // Close dropdown
        dropdown.classList.remove('open');
        
        // Find the grid container and load data
        const section = dropdown.closest('section');
        const grid = section ? section.querySelector('#popular-recent-grid') : null;
        
        if (grid && typeof ya_ajax !== 'undefined') {
          if (popularRecentAbortController) {
            popularRecentAbortController.abort();
          }
          popularRecentAbortController = new AbortController();

          // Show loading state
          grid.style.opacity = '0.5';
          grid.style.pointerEvents = 'none';
          
          const formData = new FormData();
          formData.append('action', 'ya_popular_by_period');
          formData.append('period', period);
          formData.append('nonce', ya_ajax.nonce || '');
          
          fetch(ya_ajax.ajax_url, {
            method: 'POST',
            body: formData,
            signal: popularRecentAbortController.signal
          })
          .then(r => r.json())
          .then(data => {
            if (data.success && typeof data.data.html !== 'undefined') {
              grid.innerHTML = data.data.html || '<p class="no-results">Nu există date pentru perioada selectată.</p>';
            }
            grid.style.opacity = '1';
            grid.style.pointerEvents = 'auto';
            popularRecentAbortController = null;
          })
          .catch(err => {
            if (err && err.name === 'AbortError') {
              return;
            }
            console.error('Error loading popular manga:', err);
            grid.style.opacity = '1';
            grid.style.pointerEvents = 'auto';
            popularRecentAbortController = null;
          });
        }
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
      document.querySelectorAll('.section-dropdown.open').forEach(d => {
        d.classList.remove('open');
      });
    });
  });
})();
