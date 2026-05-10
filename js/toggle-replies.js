/**
 * TOGGLE REPLIES — FIX FINAL CORECT
 * 
 * 🔑 REGULA DE AUR:
 * Counter se calculează DOAR când DOM-ul se schimbă (AJAX)
 * Toggle DOAR schimbă display, nu calculează
 */

/**
 * ✅ 0️⃣ PROCESS @NICK ELEMENTS
 * Transformă @username text în <nick> elements
 */
function processNickElements() {
  // Find all comments
  document.querySelectorAll('.comment-text').forEach(textEl => {
    // Skip if already processed
    if (textEl.dataset.nickProcessed === '1') return;
    
    const text = textEl.textContent;
    
    // Match @username pattern at start
    const match = text.match(/^@(\w+)\s+/);
    if (!match) {
      textEl.dataset.nickProcessed = '1';
      return;
    }
    
    const username = match[1];
    const remaining = text.substring(match[0].length);
    
    // Clear and rebuild with nick element
    textEl.innerHTML = '';
    
    const nickEl = document.createElement('nick');
    nickEl.className = 'nick-label';
    nickEl.contentEditable = 'false';
    nickEl.textContent = '@' + username;
    
    textEl.appendChild(nickEl);
    textEl.appendChild(document.createTextNode(' ' + remaining));
    textEl.dataset.nickProcessed = '1';
  });
}

/**
 * ✅ 1️⃣ FUNCȚIE UNICĂ DE CALCUL
 * Calculează counter și updatează text-ul pe button
 * 
 * ✅ DOAR comentarii direct children (TOȚI sunt în același container)
 * 
 * APELATĂ:
 * - După AJAX success (inserare reply)
 * - La page load (override PHP)
 * 
 * NU APELATĂ:
 * - În click handler
 * - În hover
 */
function updateRepliesCounter(commentId) {
  if (!commentId) return;

  // 1️⃣ Găsește container de replies
  const repliesContainer = document.querySelector(
    `.comment-replies[data-parent-id="${commentId}"]`
  );
  if (!repliesContainer) return;

  // 2️⃣ Calculează DOAR direct children (toți sunt în același container)
  const total = repliesContainer.querySelectorAll(':scope > .comment').length;

  // 3️⃣ Găsește comment element și toggle button
  const commentEl = document.querySelector(
    `.comment[data-comment-id="${commentId}"]`
  );
  if (!commentEl) return;

  let toggle = document.querySelector(
    `.toggle-replies[data-comment-id="${commentId}"]`
  );

  // 4️⃣ Dacă sunt replies, asigură că butonul EXISTĂ și e în poziția corectă
  if (total > 0) {
    if (!toggle) {
      // Creează button nou
      toggle = document.createElement('button');
      toggle.className = 'toggle-replies';
      toggle.dataset.commentId = commentId;
      // Inserează imediat după comment
      commentEl.parentNode.insertBefore(toggle, commentEl.nextSibling);
    } else if (toggle.previousElementSibling !== commentEl) {
      // Butonul e în poziția greșită, mută-l
      commentEl.parentNode.insertBefore(toggle, commentEl.nextSibling);
    }

    // 5️⃣ Update text butonului
    toggle.dataset.count = total;
    toggle.textContent = repliesContainer.classList.contains('open')
      ? `Ascunde răspunsurile (${total})`
      : `Afișează răspunsurile (${total})`;
  } else {
    // 6️⃣ Dacă nu sunt replies, șterge butonul
    if (toggle) {
      toggle.remove();
    }
  }
}

/**
 * ✅ 2️⃣ UPDATE COUNTER CHAIN — NU MAI NECESAR
 * 
 * VECHI: Trebuia să merge UP pentru că replies erau nested
 * ACUM: Toți descendenții sunt direct children în ROOT container
 * 
 * Păstrăm pentru compatibilitate backward, dar apelează DOAR pe startId
 */
function updateRepliesCounterChain(startCommentId) {
  if (!startCommentId) return;
  updateRepliesCounter(startCommentId);
}

/**
 * ✅ INIT — Page load
 * 1. Hide all replies
 * 2. Override PHP counters (recalculate correct)
 * 3. Process @nick elements
 */
document.addEventListener('DOMContentLoaded', function() {
  // 1️⃣ Hide all replies
  document.querySelectorAll('.comment-replies').forEach(replies => {
    replies.classList.remove('open');
  });

  // 2️⃣ Process @nick elements
  processNickElements();

  // 3️⃣ Recalculate ALL counters (override PHP)
  document.querySelectorAll('.toggle-replies').forEach(btn => {
    const commentId = btn.dataset.commentId || btn.dataset.parentId;
    if (commentId) {
      updateRepliesCounter(commentId);
    }
  });

  // 4️⃣ LIVE COUNTER: Monitor DOM changes și actualizează counters
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(mutation => {
      // Dacă s-a adăugat un reply nou, recalculează counter
      if (mutation.addedNodes.length > 0) {
        document.querySelectorAll('.toggle-replies').forEach(btn => {
          const commentId = btn.dataset.commentId || btn.dataset.parentId;
          if (commentId) {
            updateRepliesCounter(commentId);
          }
        });
      }
    });
  });

  // Observă .comment-replies containers pentru reply noi
  document.querySelectorAll('.comment-replies').forEach(container => {
    observer.observe(container, {
      childList: true,
      subtree: true
    });
  });

  // ✅ 5️⃣ DEEP LINKING: Deschide reply-ul dacă URL hash conține #comment-ID
  function handleHashLink() {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#comment-')) {
          const targetId = hash.substring(1);
          const target = document.getElementById(targetId);
          
          if (target) {
              
              // Find parent replies container (recursively up)
              let currentContainer = target.closest('.comment-replies');
              
              // Traverse up to open all nested containers
              while (currentContainer) {
                  // Show it
                  currentContainer.classList.add('open');
                  currentContainer.style.display = '';
                  
                  // Update toggle button for this container
                  const parentId = currentContainer.dataset.parentId;
                  const btn = document.querySelector(`.toggle-replies[data-comment-id="${parentId}"]`);
                  if (btn) {
                      const count = btn.dataset.count || currentContainer.querySelectorAll(':scope > .comment').length;
                      btn.textContent = `Ascunde răspunsurile (${count})`;
                      btn.dataset.expanded = 'true';
                  }
                  
                  // Go up to next level
                  // The container is usually inside a .comment which might be inside another .comment-replies
                  const parentComment = currentContainer.closest('.comment');
                  if (parentComment) {
                      currentContainer = parentComment.closest('.comment-replies');
                  } else {
                      currentContainer = null;
                  }
              }
              
              // Scroll to it with highlight
              setTimeout(() => {
                  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  target.classList.add('highlight-comment');
                  target.style.transition = 'background-color 0.5s ease';
                  target.style.backgroundColor = 'rgba(204, 146, 146, 0.84)';
                  
                  // Clear hash from URL to prevent re-scroll on refresh
                  history.replaceState(null, '', window.location.pathname + window.location.search);
                  
                  setTimeout(() => {
                      target.style.backgroundColor = '';
                      target.classList.remove('highlight-comment');
                  }, 3000);
              }, 500);
          }
      }
  }

  // Check on load
  setTimeout(handleHashLink, 500); // Small delay to ensure render
  
  // Listen for hash changes
  window.addEventListener('hashchange', handleHashLink);
});

/**
 * ✅ TOGGLE CLICK HANDLER
 * Schimbă display state și updatează text butonului
 * RECURSIVE: Ascunde/afișează TOȚI descendenții (replies la replies etc)
 * 
 * ✅ USES EVENT DELEGATION: Listener persists even after DOM re-render
 */
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.toggle-replies');
  if (!btn) return;

  e.preventDefault();
  e.stopPropagation();

  // Identifică comment ID
  const commentId = btn.dataset.commentId || btn.dataset.parentId;
  if (!commentId) {
    return;
  }

  // ✅ FIND CONTAINER BY DATA ATTRIBUTE (persists after DOM re-render/sortare)
  const container = document.querySelector(
    `.comment-replies[data-parent-id="${commentId}"]`
  );
  if (!container) {
    return;
  }

  // ✅ Toggle .open class pe containerul principal
  const isOpen = container.classList.contains('open');
  
  if (isOpen) {
    // ASCUNDE: Remove .open de la container și TOȚI descendenții recursiv
    container.classList.remove('open');
    // Setează inline style pentru a fi sigur
    container.style.display = 'none';
    
    // Recursiv ascunde TOȚI .comment-replies din interiorul containerului
    function hideAllDescendants(parent) {
      parent.querySelectorAll('.comment-replies').forEach(child => {
        child.classList.remove('open');
        child.style.display = 'none';
        hideAllDescendants(child);
      });
    }
    hideAllDescendants(container);
  } else {
    // AFIȘEAZĂ: Add .open și șterge inline style
    container.classList.add('open');
    // Șterge inline style - lasa CSS să se ocupe de display
    container.style.display = '';
  }

  // ✅ Update text butonului
  const count = container.querySelectorAll(':scope > .comment').length;
  btn.textContent = container.classList.contains('open')
    ? `Ascunde răspunsurile (${count})`
    : `Afișează răspunsurile (${count})`;
});

// ================================
// LONG COMMENT TEXT TRUNCATION
// ================================
document.addEventListener('DOMContentLoaded', function() {
  // Check all comment texts on page load
  checkCommentTextHeights();
  
  // Also check when tabs become visible (for reviews tab)
  function checkCommentTextHeights() {
    document.querySelectorAll('.comment-text.hide-text').forEach(textEl => {
      const moreBtn = textEl.parentNode.querySelector('.more-text');
      if (!moreBtn) return;
      
      // Check if element is visible (not in hidden tab)
      const isVisible = textEl.offsetParent !== null;
      
      if (!isVisible) {
        // Element is hidden (in inactive tab), check again later
        return;
      }
      
      // Check if content is taller than max-height
      const scrollHeight = textEl.scrollHeight;
      const maxHeight = parseInt(window.getComputedStyle(textEl).maxHeight);
      
      if (scrollHeight > maxHeight) {
        // Show the "show more" button
        moreBtn.style.display = 'inline-block';
      } else {
        // Hide the button if not needed
        moreBtn.style.display = 'none';
      }
    });
  }
  
  // Handle "show more" button clicks
  document.addEventListener('click', function(e) {
    const moreBtn = e.target.closest('.more-text');
    if (!moreBtn) return;
    
    e.preventDefault();
    
    const commentId = moreBtn.dataset.commentId;
    const textEl = document.querySelector(`.comment-text[data-comment-id="${commentId}"]`);
    
    if (textEl) {
      const currentMaxHeight = parseInt(textEl.style.maxHeight) || parseInt(window.getComputedStyle(textEl).maxHeight);
      
      if (currentMaxHeight < 200) { // Collapsed state (72px or 150px)
        // Expand
        textEl.style.setProperty('max-height', '2000px', 'important');
        moreBtn.textContent = 'Ascunde textul';
      } else { // Expanded state (2000px)
        // Collapse - use the appropriate height based on screen size
        const isMobile = window.innerWidth <= 768;
        const collapseHeight = isMobile ? '150px' : '72px';
        textEl.style.setProperty('max-height', collapseHeight, 'important');
        moreBtn.textContent = 'Afișează textul integral';
      }
    }
  });
  
  // Expose function for AJAX callbacks
  window.checkCommentTextHeights = checkCommentTextHeights;
});