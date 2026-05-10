
// Simple toast function for custom notifications
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
  toast.className = `ya-toast ya-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function canUseHoverPointer() {
  return window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function getDisplayRating(wrap) {
  const isLogged = (wrap.dataset.logged === '1');
  const userRating = parseFloat(wrap.dataset.userRating || '0') || 0;
  const avgRating = parseFloat(wrap.dataset.rating || '0') || 0;

  if (isLogged && userRating > 0) return userRating;
  return avgRating;
}

document.addEventListener('DOMContentLoaded', () => {
  // Initialize stars based on average rating
  document.querySelectorAll('.mangayummy-rating-wrap').forEach(box => {
    const stars = box.querySelectorAll('.star');
    updateStarsDisplay(stars, getDisplayRating(box));

    // remove any leftover collapsed/no-rating classes if present
    box.classList.remove('collapsed', 'no-rating');

    // Single manga can run in collapsible mode: only first star is visible
    // until hover on desktop or tap on touch devices.
    if (box.dataset.collapsibleRating === '1' && !canUseHoverPointer()) {
      box.classList.remove('expanded');
    }

    // Add hover effects - show current rating when hovering
    const starsContainer = box.querySelector('.mangayummy-rating-stars');
    
    stars.forEach((star) => {
      star.addEventListener('mouseenter', () => {
        updateStarsDisplay(stars, getDisplayRating(box));
      });
    });

    if (starsContainer) {
      // Desktop hover-lock: once pointer enters an actual star, keep expanded
      // while moving inside the stars row (including tiny gaps between stars).
      starsContainer.addEventListener('mouseover', (e) => {
        if (box.dataset.collapsibleRating !== '1' || !canUseHoverPointer()) return;
        if (e.target && e.target.closest('.star')) {
          box.classList.add('expanded-hover');
        }
      });

      starsContainer.addEventListener('mouseleave', () => {
        box.classList.remove('expanded-hover');
        updateStarsDisplay(stars, getDisplayRating(box));
      });

      // Collapse when mouse enters the meta area (to the right of the last star).
      const metaInline = starsContainer.querySelector('.rating-meta-inline');
      if (metaInline) {
        metaInline.addEventListener('mouseenter', () => {
          if (box.dataset.collapsibleRating !== '1' || !canUseHoverPointer()) return;
          box.classList.remove('expanded-hover');
        });
      }
    }
  });
});

// Use event delegation for star clicks
let lastClickTime = 0;
document.addEventListener('click', function (e) {
  const star = e.target.closest('.star');
  if (!star) return;


  const wrap = star.closest('.mangayummy-rating-wrap');
  if (!wrap) return;

  // In collapsible mode, first click/tap only expands the control.
  // Voting is allowed only on a later click/tap.
  if (wrap.dataset.collapsibleRating === '1') {
    const isExpanded = wrap.classList.contains('expanded');

    if (!isExpanded) {
      e.preventDefault();
      e.stopPropagation();
      wrap.classList.add('expanded');
      return;
    }

    wrap.classList.add('expanded');
  }


  // Prevent rapid clicking (debounce 500ms)
  const now = Date.now();
  if (now - lastClickTime < 500) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  lastClickTime = now;

  // Prevent multiple simultaneous requests
  if (wrap.dataset.ratingInProgress === 'true') {
    e.preventDefault();
    e.stopPropagation();
    return;
  }
  wrap.dataset.ratingInProgress = 'true';

  // Prevent default to avoid any double-processing
  e.preventDefault();
  e.stopPropagation();

  // Add loading state to stars
  wrap.classList.add('rating-loading');

  // Calculate rating based on click position within star
  // Use getBoundingClientRect for accurate positioning
  const rect = star.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const starWidth = rect.width;
  const baseValue = parseInt(star.dataset.value);
  
  
  // If click is on left half of star, subtract 0.5
  // Use 50% threshold for accurate half-star detection
  const value = (clickX < starWidth * 0.5) ? baseValue - 0.5 : baseValue;
  

  const post = wrap.dataset.post;

  // Get stars reference for error handling
  const starsNow = wrap.querySelectorAll('.star');

  // Optimistically update UI immediately to reflect 10-point scale
  try {
    updateStarsDisplay(starsNow, value);
    const numEl = wrap.querySelector('.rating-number');
    if (numEl) numEl.textContent = value;
    const txtEl = wrap.querySelector('.mangayummy-rating-text');
    if (txtEl) {
      // Extract existing vote count safely (match 'din N')
      var prev = txtEl.textContent || '';
      var m = prev.match(/din\s+(\d+)/i);
      var count = m ? parseInt(m[1], 10) : '';
      txtEl.textContent = `Media ${value} din ${count} vot${count == 1 ? '' : 'uri'}`;
    }
  } catch (e) { /* ignore optimistic update errors */ }

  fetch(mangaRating.ajax, {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({
      action: 'mangayummy_manga_rate',
      post: post,
      rating: value,
      nonce: mangaRating.nonce
    })
  })
  .then(r => {
    if (!r.ok) {
      throw new Error(`HTTP ${r.status}: ${r.statusText}`);
    }
    return r.json();
  })
  .then(res => {
    if (!res.success) {
      // Handle login requirement
      if (res.data && res.data.message) {
        if (res.data.message.includes('logat') || res.data.message.includes('logged')) {
          showToast('Trebuie să fii logat pentru a evalua manga-urile.', 'error');
        } else {
          showToast('Eroare: ' + res.data.message, 'error');
        }
      } else {
        showToast('Eroare la evaluare. Încearcă din nou.', 'error');
      }
      // Reset stars to previous state
      updateStarsDisplay(starsNow, getDisplayRating(wrap));
      return;
    }

    // Update display with new average (always format to one decimal)
    const stars = wrap.querySelectorAll('.star');
    const avgNum = parseFloat(res.data.avg) || 0;
    const avgFixed = avgNum.toFixed(1);
    // Keep stars user-specific while text remains global average.
    try { wrap.dataset.userRating = String(value); } catch (e) {}
    updateStarsDisplay(stars, getDisplayRating(wrap));

    const ratingNumberEl = wrap.querySelector('.rating-number');
    if (ratingNumberEl) ratingNumberEl.textContent = avgFixed;

    // Update dataset so observers know the authoritative value
    try { wrap.dataset.rating = avgFixed; } catch (e) {}

    const textEl = wrap.querySelector('.mangayummy-rating-text');
    if (textEl) {
      textEl.textContent = `Media ${avgFixed} din ${res.data.count} vot${res.data.count == 1 ? '' : 'uri'}`;
    }
    
    // Remove loading state
    wrap.classList.remove('rating-loading');
  })
  .catch(error => {
    console.error('Rating error:', error);
    // Extract meaningful error message
    let errorMessage = 'Eroare de rețea. Verifică conexiunea și încearcă din nou.';
    if (error.message) {
      // Check for common error types and provide user-friendly messages
      if (error.message.includes('fetch')) {
        errorMessage = 'Eroare de conexiune. Verifică internetul și încearcă din nou.';
      } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
        errorMessage = 'Eroare de rețea. Serverul nu răspunde.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Conexiunea a expirat. Încearcă din nou.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = 'Eroare server: ' + error.message;
      } else {
        errorMessage = 'Eroare: ' + error.message;
      }
    }
    showToast(errorMessage, 'error');
    // Reset stars to previous state
    updateStarsDisplay(starsNow, getDisplayRating(wrap));
  })
  .finally(() => {
    // Clear the in-progress flag and loading state
    wrap.dataset.ratingInProgress = 'false';
    wrap.classList.remove('rating-loading');
  });
});

function updateStarsDisplay(stars, rating) {
  // Clear all classes first
  stars.forEach(s => {
    s.classList.remove('filled', 'half-filled', 'hover-preview');
  });
  
  // Apply classes based on rating
  stars.forEach((star, index) => {
    const starValue = index + 1;
    
    if (starValue <= rating) {
      star.classList.add('filled');
    } else if (starValue - 0.5 <= rating) {
      star.classList.add('half-filled');
    }
  });
}

// Normalize a full rating wrap element when it's added or replaced by other scripts
function normalizeRatingWrap(wrap) {
  if (!wrap || wrap.nodeType !== 1) return;

  // Try to read an average from text or dataset
  let textEl = wrap.querySelector('.mangayummy-rating-text');
  let numEl = wrap.querySelector('.rating-number');
  let rawAvg = null;

  if (numEl && numEl.textContent) rawAvg = parseFloat(numEl.textContent.replace(',', '.'));
  if (!rawAvg && wrap.dataset && wrap.dataset.rating) rawAvg = parseFloat(wrap.dataset.rating);

  // Detect if the incoming HTML used a '/ 5' denominator and scale the average if needed
  let usedFive = false;
  if (textEl) {
    if (/\/\s*5\b/.test(textEl.textContent || '')) usedFive = true;
  }

  if (rawAvg && usedFive) rawAvg = rawAvg * 2;
  if (!rawAvg) rawAvg = 0;
  const isLogged = wrap.dataset && wrap.dataset.logged === '1';
  const userRating = parseFloat((wrap.dataset && wrap.dataset.userRating) ? wrap.dataset.userRating : '0') || 0;
  const displayRating = (isLogged && userRating > 0) ? userRating : rawAvg;

  // Ensure rating-number exists and shows one decimal
  if (numEl) numEl.textContent = rawAvg.toFixed(1);

  // Rebuild stars container to always contain 10 star spans and correct filled state
  const starsContainer = wrap.querySelector('.mangayummy-rating-stars');
  if (starsContainer) {
    // Preserve full rating metadata block (views, raters, external ratings).
    const ratingMetaInlineEl = starsContainer.querySelector('.rating-meta-inline');
    const ratingMetaInlineHTML = ratingMetaInlineEl ? ratingMetaInlineEl.outerHTML : '';

    // Build 10 stars
    const filled = Math.round(displayRating);
    let starsHtml = '';
    for (let i = 1; i <= 10; i++) {
      starsHtml += `<span class="star${i <= filled ? ' filled' : ''}" data-value="${i}"></span>`;
    }

    starsContainer.innerHTML = starsHtml + ratingMetaInlineHTML;
  }

  // Normalize rating text to use '/ 10' and updated average
  if (textEl) {
    // keep existing vote count if present
    const m = (textEl.textContent || '').match(/din\s+(\d+)/i);
    const votes = m ? parseInt(m[1], 10) : '';
    textEl.textContent = `Media ${rawAvg.toFixed(1)} din ${votes} vot${votes == 1 ? '' : 'uri'}`;
  }
}

// Ensure any stray "/ 5" text is normalized to "/ 10" even if other scripts overwrite it.
function normalizeRatingTextNode(el) {
  if (!el) return;
  try {
    var txt = el.textContent || '';
    // Replace denominator patterns like '/ 5', '/5' (various spacing) with '/ 10'
    // Use a conservative pattern so we only change the denominator, not other numbers.
    var fixed = txt.replace(/\/\s*5(?!\d)/g, '/ 10');
    if (fixed !== txt) el.textContent = fixed;
  } catch (e) { /* ignore */ }
}

// Observe changes to rating text nodes and normalize quickly
function initRatingTextObserver() {
  // fix existing
  document.querySelectorAll('.mangayummy-rating-text').forEach(normalizeRatingTextNode);

  var mo = new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      if (m.type === 'characterData') {
        normalizeRatingTextNode(m.target.parentNode);
      } else if (m.type === 'childList') {
        m.addedNodes && m.addedNodes.forEach(function(node){
          if (node.nodeType === 1 && node.classList && node.classList.contains('mangayummy-rating-text')) normalizeRatingTextNode(node);
          else if (node.querySelectorAll) node.querySelectorAll('.mangayummy-rating-text').forEach(normalizeRatingTextNode);
        });
      }
    });
  });

  mo.observe(document.body, { subtree: true, childList: true, characterData: true });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRatingTextObserver);
else initRatingTextObserver();

// Also watch for entire rating wrap replacements and normalize them
const wrapObserver = new MutationObserver(function(mutations){
  mutations.forEach(function(m){
    if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
      m.addedNodes.forEach(function(node){
        if (node.nodeType !== 1) return;
        if (node.classList && node.classList.contains('mangayummy-rating-wrap')) {
          normalizeRatingWrap(node);
        } else if (node.querySelectorAll) {
          node.querySelectorAll('.mangayummy-rating-wrap').forEach(function(w){ normalizeRatingWrap(w); });
        }
      });
    }
  });
});

wrapObserver.observe(document.body, { childList: true, subtree: true });

// Collapse expanded rating controls when clicking/tapping outside.
document.addEventListener('click', function (e) {
  document.querySelectorAll('.mangayummy-rating-wrap.collapsible-rating.expanded').forEach(function (wrap) {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove('expanded');
      wrap.classList.remove('expanded-hover');
    }
  });
});