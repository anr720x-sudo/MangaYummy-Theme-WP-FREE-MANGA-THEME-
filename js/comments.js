jQuery(document).ready(function($) {
  // Lightweight toast/inline notice for replies
  function ensureReplyToastStyles() {
    if (document.getElementById('reply-toast-style')) return;
    const css = `
      .reply-notice{margin-top:8px;padding:10px 12px;border-radius:6px;font-size:13px;line-height:1.4}
      .reply-toast{max-width:min(420px,calc(100vw - 32px))}
    `;
    const style = document.createElement('style');
    style.id = 'reply-toast-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function showReplyNotice(type, text, contextEl) {
    ensureReplyToastStyles();
    const $note = $('<div>').addClass('reply-notice ' + (type||'error')).text(text);
    if (contextEl && contextEl.length) {
      // Inline below the reply form
      const $ctx = $(contextEl);
      // Remove any existing note right nearby to avoid stacking
      $ctx.next('.reply-notice').remove();
      $ctx.after($note);
      $note[0].scrollIntoView({behavior:'smooth', block:'nearest'});
    } else {
      // Fallback toast at bottom-right
      const $toast = $('<div class="reply-toast ya-toast ya-toast--' + (type || 'error') + '">').text(text);
      $('body').append($toast);
      setTimeout(() => $toast.remove(), 4000);
      return;
    }
    setTimeout(() => $note.fadeOut(200, () => $note.remove()), 3500);
  }
  // GUARD: Skip if on manga single page (uses different comment system)
  if ($('body').hasClass('manga-page') || document.body.classList.contains('manga-page')) {
    console.info('ℹ️ comments.js skipped on manga-page (using vanilla JS handlers in single-manga.php)');
    return;
  }


  // IMPORTANT: Comment submission, text formatting, emoji picker, and sorting
  // are handled by vanilla JavaScript in single-manga.php template.
  // This file provides ONLY like/dislike and reply functionality for backwards compatibility.

  // Like/dislike functionality - use delegated event binding
  $(document).on('click', '.comment-like, .comment-dislike', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const $btn = $(this);
    const commentId = $btn.data('id');
    const action = $btn.data('action');

    // Check if user is logged in (no data attribute means not logged in)
    if (!commentId || !action) return;

    $.post(mangayummy_comments.ajax_url, {
      action: 'mangayummy_react_comment',
      nonce: mangayummy_comments.nonce,
      comment_id: commentId,
      reaction: action
    }, function(res) {
      if (!res.success) {
        console.error('Like/dislike error:', res.data);
        return;
      }

      const $box = $btn.closest('.comment-actions');
      // Update counts
      $box.find('.comment-like .count').text(res.data.likes);
      $box.find('.comment-dislike .count').text(res.data.dislikes);

      // Update active state
      $box.find('.comment-like, .comment-dislike').removeClass('active');
      if (res.data.current) {
        $box.find('.comment-' + res.data.current).addClass('active');
      }
    }).fail(function(err) {
      console.error('Like/dislike AJAX error:', err);
    });
  });

  // Reply functionality - use delegated event binding
  $(document).on('click', '.reply-btn', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    $('.reply-form').remove(); // Remove other reply forms
    const comment_id = $(this).data('comment');
    
    // Build reply form using DOM methods
    const $form = $('<div>').addClass('reply-form').attr('data-parent-id', comment_id);
    $('<textarea>')
      .attr({
        'placeholder': 'Răspunde...',
        'rows': '3',
        'class': 'reply-textarea'
      })
      .appendTo($form);
    
    $('<button>')
      .attr('type', 'button')
      .addClass('submit-reply')
      .attr('data-parent', comment_id)
      .text('Postează răspuns')
      .appendTo($form);

    $(this).closest('.comment-actions').after($form);
    $form.find('textarea').focus();
  });

  // Submit reply
  $(document).on('click', '.submit-reply', function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const $btn = $(this);
    const form = $btn.closest('.reply-form');
    const text = form.find('textarea').val().trim();
    
    if (!text) {
      showReplyNotice('error', 'Scrie un răspuns', form);
      return;
    }
    
    const parent = $btn.data('parent');
    
    $btn.disabled = true;
    const originalText = $btn.text();
    $btn.text('Se trimite...');

    const formData = new FormData();
    formData.append('action', 'mangayummy_post_comment');
    formData.append('nonce', mangayummy_comments.nonce);
    formData.append('post_id', mangayummy_comments.post_id);
    formData.append('content', text);
    formData.append('parent', parent);
    
    // Add guest name if not logged in
    if (typeof wp_data !== 'undefined' && !wp_data.is_user_logged_in) {
      formData.append('guest_name', 'Oaspete');
    }

    $.ajax({
      url: mangayummy_comments.ajax_url,
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: function(res) {
        if (res.success && res.data && res.data.html) {
          // ✅ FIX CORECT: Găsește ROOT comment-ul
          // Merge UP din parent până găsesc un comment fără parent
          
          const $parentComment = $('#comment-' + parent);
          const parentEl = $parentComment[0];
          
          if (!parentEl) {
            showReplyNotice('error', 'Eroare: Comentariu parent nu a fost găsit.', form);
            form.remove();
            return;
          }
          
          // Merge UP: găsește ROOT comment (fără comment_parent)
          let rootEl = parentEl;
          let currentEl = parentEl;
          
          while (currentEl) {
            const parentId = currentEl.dataset.parentId || currentEl.getAttribute('data-parent-id');
            if (!parentId || parentId === '0') {
              rootEl = currentEl;
              break;
            }
            // Merge UP
            currentEl = document.querySelector(`[data-comment-id="${parentId}"]`);
          }
          
          // Găsește containerul de replies al ROOT-ului
          const rootId = rootEl.dataset.commentId;
          
          // IMPORTANT: Caută containerul ROOT cu data-parent-id care e imediat după comentariu
          let repliesEl_DOM = rootEl.parentNode.querySelector(
            `:scope > .comment-replies[data-parent-id="${rootId}"]`
          );
          
          if (!repliesEl_DOM) {
            // Create if doesn't exist
            repliesEl_DOM = document.createElement('div');
            repliesEl_DOM.className = 'comment-replies';
            repliesEl_DOM.setAttribute('data-parent-id', rootId);
            repliesEl_DOM.setAttribute('data-initialized', 'true');
            // Inserează imediat după ROOT comment
            rootEl.parentNode.insertBefore(repliesEl_DOM, rootEl.nextSibling);
          }
          
          // ✅ Inserează reply la FINAL (beforeend) în containerul ROOT-ului
          repliesEl_DOM.insertAdjacentHTML('beforeend', res.data.html);
          
          // Deschide replies container și asigură că e vizibil
          repliesEl_DOM.classList.add('open');
          
          // Update toggle button text
          const toggleBtn = rootEl.nextElementSibling;
          if (toggleBtn && toggleBtn.classList.contains('toggle-replies')) {
            const count = repliesEl_DOM.querySelectorAll(':scope > .comment').length;
            toggleBtn.textContent = `Ascunde răspunsurile (${count})`;
          }
          
          // 🔥 CRITICAL: Update counter după DOM change
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Process new nick elements
              if (typeof processNickElements === 'function') {
                processNickElements();
              }
              // Update counters
              if (typeof updateRepliesCounterChain === 'function') {
                updateRepliesCounterChain(rootId);
              }
            });
          });
          
          form.remove();
        } else {
          try {
            const msg = (res && res.data && (res.data.message || res.data.error || res.data)) ? (res.data.message || res.data.error || res.data) : 'Eroare la postare';
            console.error('Reply error:', msg);
            showReplyNotice('error', String(msg), form);
          } catch (e) {
            console.error('Reply exception:', e);
            showReplyNotice('error', 'Eroare la postare', form);
          }
        }
      },
      error: function(err) {
        console.error('Reply error:', err);
        showReplyNotice('error', 'Eroare la conexiune', $('.reply-form').first());
      },
      complete: function() {
        $btn.disabled = false;
        $btn.text(originalText);
      }
    });
  });
});

/**
 * ===== SORTING SOLUTION (Clean & Correct) =====
 * Handles: Newest, Oldest, Liked
 * Preserves: Comment + Button + Replies structure
 */

// Helper: Extract comment block (comment + toggle button + replies)
function getCommentBlock(comment) {
  const elements = [comment];
  let next = comment.nextElementSibling;

  if (next && next.classList.contains('toggle-replies')) {
    elements.push(next);
    next = next.nextElementSibling;
  }

  if (next && next.classList.contains('comment-replies')) {
    elements.push(next);
  }

  return elements;
}

// Main sort function
function sortComments(type) {
  const list = document.querySelector('.comments-list');
  if (!list) return;

  // CRITICAL: Select ONLY top-level comments
  const comments = [...list.querySelectorAll(':scope > .comment')];

  comments.sort((a, b) => {
    if (type === 'newest') {
      return new Date(b.dataset.date) - new Date(a.dataset.date);
    }

    if (type === 'oldest') {
      return new Date(a.dataset.date) - new Date(b.dataset.date);
    }

    if (type === 'liked') {
      return (Number(b.dataset.likes) || 0) - (Number(a.dataset.likes) || 0);
    }

    return 0;
  });

  // Reattach as complete blocks (preserves button + replies)
  comments.forEach(comment => {
    getCommentBlock(comment).forEach(el => list.appendChild(el));
  });

  // Reset all replies to hidden state after sort
  document.querySelectorAll('.comment-replies').forEach(replies => {
    replies.style.display = 'none';
  });
}

// Wire sort buttons
document.querySelectorAll('.sort-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();

    // Update active state
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    // Sort
    const sortType = this.dataset.sort;
    sortComments(sortType);
  });
});
