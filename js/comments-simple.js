/**
 * MangaYummy Comment System
 * Simple, vanilla JS - Like/Dislike + Sort
 */

document.addEventListener('click', function (e) {

    /* LIKE / DISLIKE */
    const btn = e.target.closest('.comment-action-btn');
    if (btn && btn.dataset.action) {
        e.preventDefault();

        // Use mangayummy_comments or fallback to ya_ajax
        const ajaxData = window.mangayummy_comments || window.ya_ajax;
        if (!ajaxData) {
            console.error('AJAX data not available');
            return;
        }

        fetch(ajaxData.ajax_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'mangayummy_react_comment',
                nonce: ajaxData.nonce,
                comment_id: btn.dataset.comment,
                reaction: btn.dataset.action
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                btn.querySelector('span').textContent = res.data.likes || res.data.count || 0;
            } else {
            }
        })
        .catch(err => console.error('Comment react error:', err));
    }

    /* SORT */
    const sortBtn = e.target.closest('.sort-btn');
    if (sortBtn) {
        e.preventDefault();

        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        sortBtn.classList.add('active');

        const ajaxData = window.mangayummy_comments || window.ya_ajax;
        if (!ajaxData) return;

        fetch(ajaxData.ajax_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                action: 'mangayummy_sort_comments',
                nonce: ajaxData.nonce,
                post_id: ajaxData.post_id,
                sort: sortBtn.dataset.sort
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.success) {
                document.querySelector('.comments-list').innerHTML = res.data;
            }
        })
        .catch(err => console.error('Sort comments error:', err));
    }

});
