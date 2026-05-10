
// Translator group click handler
// Chapter language filtering removed (UI deleted from template)

// Show mini profile tooltip when hovering translator name
(function() {
    let tooltip = null;
  const supportsHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // On touch/coarse pointers, disable hover tooltip to prevent random popups.
  if (!supportsHover) return;

    function createTooltip() {
        tooltip = document.createElement('div');
        tooltip.id = 'user-tooltip';
        tooltip.className = 'user-tooltip';
        tooltip.style.position = 'absolute';
        tooltip.style.display = 'none';
        tooltip.style.pointerEvents = 'none';
        document.body.appendChild(tooltip);
    }
    function showTooltipForAnchor(anchor) {
        if (!tooltip) createTooltip();
        // position tooltip below the anchor element, prefer left-aligned
        const rect = anchor.getBoundingClientRect();
        const scrollY = window.scrollY || window.pageYOffset;
        const scrollX = window.scrollX || window.pageXOffset;
        let top = rect.bottom + scrollY + 8; // 8px gap
        let left = rect.left + scrollX;
        // prevent overflow on right
        const maxLeft = document.documentElement.clientWidth - 320; // assume max tooltip width
        if (left > maxLeft) left = maxLeft;
        tooltip.style.top = top + 'px';
        tooltip.style.left = left + 'px';
        tooltip.style.display = 'block';
    }
    function hideTooltip() {
        if (tooltip) tooltip.style.display = 'none';
    }
    async function fetchTooltip(userId, anchor) {
        try {
            const url = mangayummy_ajax.ajaxurl + '?action=mangayummy_user_tooltip&user_id=' + encodeURIComponent(userId);
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.success && data.data.html) {
                anchor.dataset.tooltipHtml = data.data.html;
                anchor.dataset.tooltipLoaded = '1';
            }
        } catch (err) {
            console.error('Tooltip fetch error', err);
        }
    }
    document.addEventListener('mouseover', function(e) {
        const a = e.target.closest('.translator-user-link');
        if (!a) return;
      // Ignore mouse movements inside the same anchor.
      if (e.relatedTarget && a.contains(e.relatedTarget)) return;
        const uid = a.dataset.userId;
        if (!uid) return;
        if (!a.dataset.tooltipLoaded) {
            fetchTooltip(uid, a).then(() => {
                if (a.dataset.tooltipHtml) {
                    if (!tooltip) createTooltip();
                    tooltip.innerHTML = a.dataset.tooltipHtml;
                    showTooltipForAnchor(a);
                }
            }).catch(err => console.error('tooltip fetch failed', err));
        } else {
            if (!tooltip) createTooltip();
            tooltip.innerHTML = a.dataset.tooltipHtml;
            showTooltipForAnchor(a);
        }
    });
    document.addEventListener('mouseout', function(e) {
      const a = e.target.closest('.translator-user-link');
      if (!a) return;
      // Ignore mouse movements that stay inside the same anchor.
      if (e.relatedTarget && a.contains(e.relatedTarget)) return;
      if (a) {
            hideTooltip();
        }
    });

    window.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip);
    // Tooltip will be positioned once relative to the anchor; no follow-on-mouse movement.
})();

document.addEventListener('click', function(e) {
    const translatorName = e.target.closest('.translator-name');
    if (translatorName) {
        e.preventDefault();
        e.stopPropagation();
        const groupName = translatorName.textContent.trim();
        // Navigate to translator group page
        window.location.href = window.location.origin + '/translator/' + encodeURIComponent(groupName);
    }
});

// Alt titles: collapse to one line and show a "mai multe" toggle if overflowing.
(function () {
  function initAltTitlesToggle() {
    const row = document.getElementById('mangaLiveAltTitlesRow');
    const list = document.getElementById('mangaLiveAltTitles');
    if (!row || !list) return;

    const oldBtn = row.querySelector('.alt-titles-toggle');
    if (oldBtn) oldBtn.remove();

    if (row.dataset.altTitlesExpanded === '1') {
      row.classList.remove('is-collapsed');
      row.classList.add('is-expanded');
      return;
    }

    row.classList.remove('is-expanded');
    row.classList.add('is-collapsed');

    // Only show toggle when text actually overflows one line.
    const hasOverflow = (list.scrollWidth - list.clientWidth) > 1;
    if (!hasOverflow) {
      row.classList.remove('is-collapsed');
      return;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'alt-titles-toggle';
    btn.textContent = 'mai multe';
    btn.setAttribute('aria-expanded', 'false');

    btn.addEventListener('click', function () {
      row.classList.remove('is-collapsed');
      row.classList.add('is-expanded');
      row.dataset.altTitlesExpanded = '1';
      btn.remove();
    });

    row.appendChild(btn);
  }

  function scheduleInit() {
    window.requestAnimationFrame(initAltTitlesToggle);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInit);
  } else {
    scheduleInit();
  }

  window.addEventListener('resize', scheduleInit);

  const row = document.getElementById('mangaLiveAltTitlesRow');
  const list = document.getElementById('mangaLiveAltTitles');
  if (row && list) {
    const mo = new MutationObserver(scheduleInit);
    mo.observe(list, { childList: true, subtree: true, characterData: true });
  }
})();

// Mobile: show compact icon tooltip text on tap for a short time.
(function () {
  const isTouchLike = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
  if (!isTouchLike) return;

  let hideTimer = null;

  document.addEventListener('click', function (e) {
    const icon = e.target.closest('.manga-summary-actions.compact-tooltip-actions .meta-icon-box');
    if (!icon) return;

    document.querySelectorAll('.manga-summary-actions.compact-tooltip-actions .meta-icon-box.mobile-tooltip-open')
      .forEach(function (el) { el.classList.remove('mobile-tooltip-open'); });

    icon.classList.add('mobile-tooltip-open');

    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(function () {
      icon.classList.remove('mobile-tooltip-open');
    }, 1100);
  }, true);
})();

// Utility function to escape HTML
function escapeHtml(text) {
    // Ensure text is a string
    if (!text || typeof text !== 'string') {
        return String(text || '');
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Chapter search: filter chapters by number as user types in the single-manga page.
(function() {
    const input = document.getElementById('searchchapter');
    if (!input) return;

    const listItems = document.querySelectorAll('.latest-chapter-item');
    if (!listItems || listItems.length === 0) return;

    function normalizeNumber(value) {
        // trim, remove comma, keep dot as decimal separator
        return String(value).trim().replace(',', '.');
    }

    function filterChapters() {
        const raw = normalizeNumber(input.value);
        const query = raw === '' ? '' : raw;
        const isNumeric = query !== '' && /^[0-9]+(\.[0-9]+)?$/.test(query);

        listItems.forEach(item => {
            item.classList.remove('filtered-out');
            if (!isNumeric) return;

            const chapter = normalizeNumber(item.dataset.chapter || '');
            // Match exact number or if chapter has decimal part, allow searching by integer prefix (e.g. 25 matches 25.1)
            const matches = (chapter === query) || (chapter.startsWith(query + '.'));
            if (!matches) {
                item.classList.add('filtered-out');
            }
        });
    }

    input.addEventListener('input', filterChapters);
})();

// Allow clicking the translator group name without following the chapter link
// (prevents nested-anchor HTML issues and keeps chapter rows clickable)
document.addEventListener('click', function (e) {
  const credit = e.target.closest('.chapter-credit');
  if (!credit) return;
  // Prevent the click from bubbling up to the chapter link
  e.preventDefault();
  e.stopPropagation();

  const url = credit.dataset.url;
  if (url) {
    window.location.href = url;
  }
});

// Easter egg: spin the page when the bug button is clicked
(function() {
  const btn = document.querySelector('.bug-button');
  if (!btn) return;

  const wrapper = document.getElementById('page-rotate-wrapper');
  if (!wrapper) return;

  const STORAGE_KEY = 'mangayummy_bug_hunter';
  const ROTATED_CLASS = 'rotated';
  const DURATION_MS = 30000; // matches CSS animation duration

  let hasBugAchievement = false;

  function checkAchievement() {
    // If user is logged in, always check server (ignore local storage)
    if (window.ya_ajax && ya_ajax.currentUserId) {
      localStorage.removeItem(STORAGE_KEY);

      const formData = new FormData();
      formData.append('action', 'mangayummy_has_achievement');
      formData.append('nonce', ya_ajax.nonce);
      formData.append('achievement', 'bug_hunter');

      return fetch(ya_ajax.ajax_url, {
        method: 'POST',
        body: formData
      })
      .then(r => r.json())
      .then(res => {
        if (res && res.success) {
          hasBugAchievement = !!res.data.hasAchievement;
        }
        return hasBugAchievement;
      })
      .catch(() => {
        // If check fails, assume no achievement to allow showing toast once.
        hasBugAchievement = false;
        return false;
      });
    }

    // Use localStorage as fallback for anonymous users
    hasBugAchievement = !!localStorage.getItem(STORAGE_KEY);
    return Promise.resolve(hasBugAchievement);
  }

  function ensureToastStyles() {
    if (document.getElementById('bug-toast-style')) return;
    const css = `
      @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    const style = document.createElement('style');
    style.id = 'bug-toast-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showToast(message) {
    ensureToastStyles();
    const toast = document.createElement('div');
    toast.className = 'ya-toast ya-toast--success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function awardAchievement() {
    if (!window.ya_ajax || !ya_ajax.currentUserId) return;

    const formData = new FormData();
    formData.append('action', 'mangayummy_unlock_achievement');
    formData.append('nonce', ya_ajax.nonce);
    formData.append('achievement', 'bug_hunter');

    fetch(ya_ajax.ajax_url, {
      method: 'POST',
      body: formData
    }).catch(() => {
      // Ignore failures; achievement will still be stored locally
    });
  }

  function startRotation() {
    // Ensure header rotates with the rest of the page (it may be fixed/sticky)
    const header = document.querySelector('header.ya-header') || document.querySelector('header');
    const headerOldPosition = header ? header.style.position : '';
    if (header) {
      header.style.position = 'relative';
    }

    // If the footer is being relocated out of the wrapper by WP/plugins, move it back.
    const footer = document.querySelector('.site-footer');
    if (footer && !wrapper.contains(footer)) {
      wrapper.appendChild(footer);
    }

    if (wrapper.classList.contains(ROTATED_CLASS)) {
      wrapper.classList.remove(ROTATED_CLASS);
      void wrapper.offsetWidth; // restart animation
    }

    wrapper.classList.add(ROTATED_CLASS);

    const cleanup = () => {
      wrapper.classList.remove(ROTATED_CLASS);
      if (header) {
        header.style.position = headerOldPosition;
      }
      wrapper.removeEventListener('animationend', onAnimationEnd);
    };

    const onAnimationEnd = () => {
      cleanup();
    };

    wrapper.addEventListener('animationend', onAnimationEnd);
    setTimeout(cleanup, DURATION_MS);
  }

  // Ensure we know whether current user already has the achievement
  checkAchievement().then(() => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();

      startRotation();

      // If user already has achievement (server-side), don’t show the toast again
      if (hasBugAchievement) return;

      localStorage.setItem(STORAGE_KEY, Date.now().toString());
      showToast('🐛 Ai găsit bug-ul ascuns! Achievement deblocat: Bug Hunter');
      awardAchievement().then(() => {
        hasBugAchievement = true;
      });
    });

    // Mark already visited chapters in the list
    try {
      const seen = JSON.parse(localStorage.getItem('mangayummy_read_chapters') || '[]');
      if (Array.isArray(seen) && seen.length) {
        seen.forEach(id => {
          const li = document.querySelector(`.latest-chapter-item[data-id="${id}"]`);
          if (li) li.classList.add('chapter-read');
        });
      }
    } catch (e) {
      // ignore invalid localStorage JSON
    }
  });
})();
