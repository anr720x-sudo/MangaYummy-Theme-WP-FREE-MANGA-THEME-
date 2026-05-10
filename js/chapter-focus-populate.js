(function(){
    document.addEventListener('DOMContentLoaded', function(){
        try {
            if (typeof chapterPreviewData === 'undefined') return;
            var postId = chapterPreviewData.postId || 0;
            var nonce = chapterPreviewData.nonce || '';
            if (!postId) return;

            var fd = new FormData();
            fd.append('action', 'mangayummy_get_chapter_focus');
            fd.append('post_id', postId);
            fd.append('nonce', nonce);

            fetch(chapterPreviewData.ajaxUrl, {
                method: 'POST',
                body: fd,
                credentials: 'same-origin'
            }).then(function(r){ return r.json(); }).then(function(json){
                if (!json || !json.success) return;
                var key = json.data.keyphrase;
                if (!key) return;

                // Candidate selectors for focus keyword inputs used by Yoast/RankMath/variants
                var selectors = [
                    'input#yoast_wpseo_focuskw',
                    'input[name="_yoast_wpseo_focuskw"]',
                    'input[name="yoast_wpseo_focuskw"]',
                    'input[name="yoast_wpseo_focus_keyword"]',
                    'input#yoast_focuskw',
                    'input[name="rank_math_focus_keyword"]',
                    'input[name="focus_keyword"]',
                    'input[name="yoast_focuskw"]'
                ];

                selectors.forEach(function(sel){
                    try {
                        var el = document.querySelector(sel);
                        if (!el) return;
                        var cur = (el.value || '').trim();
                        if (cur === '') {
                            el.value = key;
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                            el.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } catch (e) { /* ignore individual selector errors */ }
                });

                // Additionally, try to update any textarea-like editors (rare)
                var textareas = document.querySelectorAll('textarea[name*="focus"], input[name*="focus"]');
                textareas.forEach(function(t){
                    try {
                        var cur = (t.value || '').trim();
                        if (cur === '') {
                            t.value = key;
                            t.dispatchEvent(new Event('input', { bubbles: true }));
                            t.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    } catch (e) {}
                });

            }).catch(function(err){
                // silent
            });
        } catch (err) {
        }
    });
})();
