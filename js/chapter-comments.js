/**
 * Chapter Comments Handler - Vanilla JS (No jQuery)
 * Handles: Comment submission, like/dislike, replies
 */

(function() {
    'use strict';

    // Toast notification styles
    function ensureToastStyles() {
        if (document.getElementById('comment-toast-style')) return;
        const css = `
            @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        `;
        const style = document.createElement('style');
        style.id = 'comment-toast-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    function showToast(message, type = 'success') {
        ensureToastStyles();
        const toast = document.createElement('div');
        toast.className = 'ya-toast ya-toast--' + type;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    function init() {
        // Like/Dislike functionality
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.comment-like, .comment-dislike');
            if (!btn) return;
            
            e.preventDefault();
            const commentId = btn.dataset.id;
            const action = btn.dataset.action;
            
            if (!commentId || !action || !mangayummy_comments) return;

            const formData = new FormData();
            formData.append('action', 'mangayummy_react_comment');
            formData.append('nonce', mangayummy_comments.nonce);
            formData.append('comment_id', commentId);
            formData.append('reaction', action);

            fetch(mangayummy_comments.ajax_url, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (!res.success) return;
                
                const box = btn.closest('.comment-actions');
                const likeCount = box.querySelector('.comment-like .count');
                const dislikeCount = box.querySelector('.comment-dislike .count');
                
                if (likeCount) likeCount.textContent = res.data.likes;
                if (dislikeCount) dislikeCount.textContent = res.data.dislikes;
                
                box.querySelectorAll('.comment-like, .comment-dislike').forEach(b => b.classList.remove('active'));
                if (res.data.current) {
                    const activeBtn = box.querySelector('.comment-' + res.data.current);
                    if (activeBtn) activeBtn.classList.add('active');
                }
            });
        });

        // Reply button - show reply form
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.reply-btn');
            if (!btn) return;
            
            e.preventDefault();
            
            // Remove existing reply forms
            document.querySelectorAll('.reply-form').forEach(f => f.remove());
            
            const commentId = btn.dataset.comment;
            const form = document.createElement('div');
            form.className = 'reply-form';
            form.innerHTML = `
                <textarea class="reply-textarea" placeholder="Reply..." rows="3"></textarea>
                <button type="button" class="submit-reply" data-parent="${commentId}">Post reply</button>
            `;
            
            btn.closest('.comment-actions').after(form);
            form.querySelector('textarea').focus();
            const replyEl = form.querySelector('textarea');
            if (typeof CommentFormatter === 'function') {
              try {
                new CommentFormatter(replyEl);
              } catch (err) {
                console.error('CommentFormatter init failed for reply textarea', err);
              }
            }
        });

        // Submit reply
        document.addEventListener('click', function(e) {
            const btn = e.target.closest('.submit-reply');
            if (!btn) return;
            
            const form = btn.closest('.reply-form');
            const textarea = form.querySelector('textarea');
            const text = textarea.value.trim();
            
            if (!text) {
                showToast('Scrie un răspuns', 'error');
                return;
            }
            
            const parentId = btn.dataset.parent;
            btn.disabled = true;
            btn.textContent = 'Se trimite...';

            const formData = new FormData();
            formData.append('action', 'mangayummy_post_comment');
            formData.append('nonce', mangayummy_comments.nonce);
            formData.append('post_id', mangayummy_comments.post_id);
            formData.append('content', text);
            formData.append('parent', parentId);

            fetch(mangayummy_comments.ajax_url, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (res.success && res.data && res.data.html) {
                    // Find parent comment and its replies container
                    const parentComment = document.getElementById('comment-' + parentId);
                    if (parentComment) {
                        let repliesContainer = parentComment.parentNode.querySelector('.comment-replies[data-parent-id="' + parentId + '"]');
                        
                        if (!repliesContainer) {
                            repliesContainer = document.createElement('div');
                            repliesContainer.className = 'comment-replies open';
                            repliesContainer.dataset.parentId = parentId;
                            parentComment.after(repliesContainer);
                        }
                        
                        repliesContainer.insertAdjacentHTML('beforeend', res.data.html);
                        repliesContainer.classList.add('open');
                    }
                    
                    form.remove();
                    showToast('Reply posted!', 'success');
                } else {
                    showToast(res.data?.message || 'Error posting', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Post reply';
                }
            })
            .catch(() => {
                showToast('Error posting', 'error');
                btn.disabled = false;
                btn.textContent = 'Post reply';
            });
        });

    }

    // Initialize when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
