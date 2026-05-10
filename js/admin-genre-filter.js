(function(){
    function debounce(fn, delay) {
        var t;
        return function(){
            var args = arguments;
            clearTimeout(t);
            t = setTimeout(function(){ fn.apply(null, args); }, delay);
        };
    }

    function initGenreFilter() {
        console.debug('[mgy] initGenreFilter');
        // Try common selectors for the genre taxonomy meta box
        var box = document.getElementById('genrediv') || document.querySelector('[data-taxonomy="genre"]') || document.querySelector('.categorydiv');
        if (!box) return;

        // Remove any legacy search inputs (class 'my-genre-search') to avoid duplicate systems
        var legacy = box.querySelectorAll('.my-genre-search');
        if (legacy && legacy.length) {
            Array.prototype.slice.call(legacy).forEach(function(el){ try { el.parentNode.removeChild(el); } catch (e){} });
        }
        // Avoid adding twice (new implementation)
        if (box.querySelector('.mgy-genre-search')) return;

        // Find checklist (labels inside li)
        var checklist = box.querySelector('.categorychecklist, ul');
        if (!checklist) return;

        var input = document.createElement('input');
        input.type = 'search';
        // Use the new class only; legacy inputs removed above
        input.className = 'mgy-genre-search';
        input.placeholder = 'Caută genuri...';
        input.style.width = '100%';
        input.style.marginBottom = '8px';
        input.style.padding = '6px 8px';
        input.style.border = '1px solid #ddd';
        input.style.borderRadius = '3px';

        // Insert input before the checklist; if checklist isn't a direct child of box,
        // insert into the checklist's parent to avoid DOM "NotFoundError".
        if (checklist && checklist.parentNode && checklist.parentNode.contains(checklist)) {
            checklist.parentNode.insertBefore(input, checklist);
        } else if (checklist) {
            // Fallback: insert at start of the box
            box.insertBefore(input, box.firstChild);
        } else {
            box.insertBefore(input, box.firstChild);
        }

        // Collect items from all .categorychecklist lists inside the genre box.
        var items = [];
        var lists = Array.prototype.slice.call(box.querySelectorAll('.categorychecklist'));
        if (lists.length) {
            lists.forEach(function(ul){ items = items.concat(Array.prototype.slice.call(ul.querySelectorAll('li'))); });
        } else {
            items = checklist ? Array.prototype.slice.call(checklist.querySelectorAll('li')) : [];
        }

        // Build a list of entries with node + searchable text that supports several markup variants
        function buildEntries() {
            var entries = [];
            if (items.length > 0) {
                items.forEach(function(li){
                    var text = '';
                    var label = li.querySelector('label');
                    if (label) text = label.textContent || label.innerText || '';
                    else text = li.textContent || '';
                    entries.push({node: li, text: text.trim().toLowerCase()});
                });
            } else if (checklist) {
                // Fallback: try to build entries from labels or anchors inside the box
                var labels = Array.prototype.slice.call(checklist.querySelectorAll('label'));
                if (labels.length === 0) labels = Array.prototype.slice.call(box.querySelectorAll('label'));
                if (labels.length === 0) labels = Array.prototype.slice.call(checklist.querySelectorAll('a'));
                labels.forEach(function(lbl){
                    var text = (lbl.textContent || lbl.innerText || '').trim();
                    var li = lbl.closest('li');
                    // Only consider actual list items to avoid hiding headings/tabs
                    if (!li) return;
                    entries.push({node: li, text: text.toLowerCase()});
                });
            }
            return entries;
        }

        var entries = buildEntries();

        // Create or reuse the results container
        var tabs = document.getElementById('genre-tabs');
        if (!tabs) {
            tabs = document.createElement('ul');
            tabs.id = 'genre-tabs';
            tabs.style.listStyle = 'none';
            tabs.style.margin = '6px 0 0 0';
            tabs.style.padding = '0';
            tabs.style.maxHeight = '220px';
            tabs.style.overflowY = 'auto';
            tabs.style.border = '1px solid rgba(0,0,0,0.08)';
            tabs.style.borderRadius = '4px';
            tabs.style.background = '#fff';
            tabs.style.boxSizing = 'border-box';
            input.parentNode.insertBefore(tabs, input.nextSibling);
        }

        function filterList(q) {
            var term = (q || '').toString().trim().toLowerCase();
            // Rebuild entries if checklist changed (eg. after adding a term)
            if (!entries || entries.length === 0) entries = buildEntries();
            entries.forEach(function(it){
                if (!it || !it.node) return;
                try {
                    if (term === '' || (it.text && it.text.indexOf(term) !== -1)) {
                        it.node.style.display = '';
                    } else {
                        it.node.style.display = 'none';
                    }
                } catch (e) {
                    // ignore individual item errors
                }
            });
        }

        input.addEventListener('input', debounce(function(e){
            console.debug('[mgy] input value', e.target.value);
            filterList(e.target.value);
        }, 150));

        // Keyup handler for autocomplete using wp.ajax.post('ajax-tag-search')
        // Use local checklist filtering only; disable custom autocomplete output to avoid duplicate UI
        input.addEventListener('keyup', debounce(function(e){
            var q = (e.target.value || '').trim();
            console.debug('[mgy] keyup q=', q);
            // Filter the existing checklist items; do not render separate autocomplete results
            filterList(q);
            // Ensure any leftover results container is empty
            tabs.innerHTML = '';
        }, 200));

        // We intentionally do not render separate autocomplete results to avoid duplicating terms
        function renderResults(data, container, checklist) {
            // No-op: rely on the native checklist UI. Keep container empty to avoid duplicate markup.
            container.innerHTML = '';
            return;
        }

        // Delegate clicks on the results container to handle dynamic items
        tabs.addEventListener('click', function(ev){
            var target = ev.target;
            var li = target.closest && target.closest('li');
            if (!li) return;
            console.debug('[mgy] delegated click on', li.textContent, 'termId=', li.dataset.termId);
            // reuse the existing logic by triggering click on the li element
            try { li.click(); } catch (e) { console.debug('[mgy] delegated click failed', e); }
        });
    }

    // Initialize on DOM ready and on ajax success (term add may refresh the box)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGenreFilter);
    } else {
        initGenreFilter();
    }

    // If WordPress uses AJAX to add new terms, try to re-init after DOM changes
    document.addEventListener('ajaxComplete', function(){ setTimeout(initGenreFilter, 200); });
})();
