/**
 * Chapter Images Autogenerate
 * Automatically extracts chapter image URLs from a chapter page URL
 * Fetches the page, parses HTML, finds reader container, extracts all <img> in order
 */

function initChapterAutogenerate() {
    const autogenerateBtn = document.getElementById('autogenerate-btn');
    const baseUrlInput = document.getElementById('autogen-base-url');
    const statusDiv = document.getElementById('autogenerate-status');

    const autogenerateRomangaBtn = document.getElementById('autogenerate-romanga-btn');
    const romangaUrlInput = document.getElementById('autogen-romanga-url');
    const romangaStatusDiv = document.getElementById('autogenerate-romanga-status');

    if (!autogenerateBtn && !autogenerateRomangaBtn) {
        return; // Only on chapter edit page
    }

    // Prevent double-binding the click handler
    if (autogenerateBtn && autogenerateBtn.dataset.bound === '1') {
        return;
    }
    if (autogenerateRomangaBtn && autogenerateRomangaBtn.dataset.bound === '1') {
        return;
    }
    if (autogenerateBtn) autogenerateBtn.dataset.bound = '1';
    if (autogenerateRomangaBtn) autogenerateRomangaBtn.dataset.bound = '1';

    // Enhance existing rows with move controls (async to not block page load)
    // Backwards-compatible no-op if the legacy function was removed
    if (typeof window.enhanceExistingRows !== 'function') {
        window.enhanceExistingRows = function() {
            // legacy: previously enhanced existing image rows with move/remove controls
            // no-op kept for backward compatibility to avoid ReferenceError in admin logs
        };
    }
    setTimeout(() => {
        try { 
            enhanceExistingRows(); 
        } catch(e) {
            console.error('Error enhancing existing rows:', e);
        }
    }, 100);

    // General autogenerate button
    if (autogenerateBtn) {
        autogenerateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Prevent concurrent runs
            if (autogenerateBtn.dataset.running === '1') {
                return;
            }
            autogenerateBtn.dataset.running = '1';
            autogenerateImages().finally(() => {
                autogenerateBtn.dataset.running = '0';
            });
        });
    }

    // Sequential generator controls
    const seqBaseInput = document.getElementById('seq-base-url');
    const seqCountInput = document.getElementById('seq-count');
    const seqBtn = document.getElementById('seq-generate-btn');
    const seqStatus = document.getElementById('seq-status');
    if (seqBtn) {
        seqBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generateSequential();
        });
    }

    // Romanga autogenerate button
    if (autogenerateRomangaBtn) {
        autogenerateRomangaBtn.addEventListener('click', function(e) {
            e.preventDefault();
            // Prevent concurrent runs
            if (autogenerateRomangaBtn.dataset.running === '1') {
                return;
            }
            autogenerateRomangaBtn.dataset.running = '1';
            autogenerateImagesRomanga().finally(() => {
                autogenerateRomangaBtn.dataset.running = '0';
            });
        });
    }

    function autogenerateImages() {
        return new Promise((resolve) => {
            const pageUrl = baseUrlInput.value.trim();

            // Validation
            if (!pageUrl) {
                showStatus('error', '❌ Introduceți URL-ul paginii capitolului');
                resolve();
                return;
            }

            showStatus('info', '⏳ Loading page and extracting images...');
            autogenerateBtn.disabled = true;

            // AJAX call to PHP backend
            jQuery.ajax({
                url: ya_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'mangayummy_extract_chapter_images',
                    chapter_url: pageUrl,
                    nonce: ya_ajax.nonce
                },
                success: function(response) {
                    if (response.success && response.data.images) {
                        addImagesBatch(response.data.images);
                        showStatus('success', `✅ S-au adăugat ${response.data.images.length} imagini! (Salvează pentru a confirma)`);
                        baseUrlInput.value = '';
                    } else {
                        showStatus('error', '❌ ' + (response.data.message || 'Eroare necunoscută'));
                    }
                    autogenerateBtn.disabled = false;
                },
                error: function(xhr, status, error) {
                    showStatus('error', '❌ Eroare AJAX: ' + error);
                    autogenerateBtn.disabled = false;
                },
                complete: function() {
                    resolve();
                }
            });
        });
    }

    function autogenerateImagesRomanga() {
        return new Promise((resolve) => {
            const pageUrl = romangaUrlInput.value.trim();

            // Validation
            if (!pageUrl) {
                showStatusRomanga('error', '❌ Introduceți URL-ul paginii capitolului');
                resolve();
                return;
            }

            showStatusRomanga('info', '⏳ Loading Romanga page and extracting images...');
            autogenerateRomangaBtn.disabled = true;

            // AJAX call to PHP backend
            jQuery.ajax({
                url: ya_ajax.ajax_url,
                type: 'POST',
                data: {
                    action: 'mangayummy_extract_chapter_images_romanga',
                    chapter_url: pageUrl,
                    nonce: ya_ajax.nonce
                },
                success: function(response) {
                    if (response.success && response.data.images) {
                        addImagesBatch(response.data.images);
                        showStatusRomanga('success', `✅ S-au adăugat ${response.data.images.length} imagini! (Salvează pentru a confirma)`);
                        romangaUrlInput.value = '';
                    } else {
                        showStatusRomanga('error', '❌ ' + (response.data.message || 'Eroare necunoscută'));
                    }
                    autogenerateRomangaBtn.disabled = false;
                },
                error: function(xhr, status, error) {
                    showStatusRomanga('error', '❌ Eroare AJAX: ' + error);
                    autogenerateRomangaBtn.disabled = false;
                },
                complete: function() {
                    resolve();
                }
            });
        });
    }

    function verifyImageExists(url) {
        // Removed: no longer used
    }

    function addImageToList(url) {
        const chapterImagesList = document.getElementById('chapter-images-list');
        const newRow = document.createElement('div');
        newRow.className = 'image-url-row';
        newRow.innerHTML = 
            '<input type="url" class="image-url-input chapter-image-url" name="chapter_image_urls[]" value="' + escapeHtml(url) + '" placeholder="https://example.com/image.jpg">' +
            '<div class="image-url-actions">' +
                '<button type="button" class="move-btn" onclick="moveImageRowUp(this)">↑ Sus</button>' +
                '<button type="button" class="move-btn" onclick="moveImageRowDown(this)">↓ Jos</button>' +
                '<button type="button" class="remove-image-btn" onclick="removeImageRow(this)">Sterge</button>' +
            '</div>';
        chapterImagesList.appendChild(newRow);
    }

    function addImagesBatch(urls) {
        const chapterImagesList = document.getElementById('chapter-images-list');
        if (!chapterImagesList || !urls.length) return;
        const frag = document.createDocumentFragment();
        for (const url of urls) {
            const newRow = document.createElement('div');
            newRow.className = 'image-url-row';
            newRow.innerHTML =
                '<input type="url" class="image-url-input chapter-image-url" name="chapter_image_urls[]" value="' + escapeHtml(url) + '" placeholder="https://example.com/image.jpg">' +
                '<div class="image-url-actions">' +
                    '<button type="button" class="move-btn" onclick="moveImageRowUp(this)">↑ Sus</button>' +
                    '<button type="button" class="move-btn" onclick="moveImageRowDown(this)">↓ Jos</button>' +
                    '<button type="button" class="remove-image-btn" onclick="removeImageRow(this)">Sterge</button>' +
                '</div>';
            frag.appendChild(newRow);
        }
        chapterImagesList.appendChild(frag);
    }

    function showStatus(type, message) {
        statusDiv.className = 'autogenerate-status ' + type;
        statusDiv.textContent = message;
    }

    function showStatusRomanga(type, message) {
        romangaStatusDiv.className = 'autogenerate-status ' + type;
        romangaStatusDiv.textContent = message;
    }

    // Sequential URL generator helper
    function generateSequential() {
        const base = seqBaseInput ? seqBaseInput.value.trim() : '';
        const cnt = seqCountInput ? parseInt(seqCountInput.value, 10) : 0;
        if (!base) {
            showSeqStatus('error', '❌ Introduceți un URL de bază');
            return;
        }
        if (!cnt || cnt < 1) {
            showSeqStatus('error', '❌ Introduceți un număr valid de pagini');
            return;
        }
        const m = base.match(/^(.*?)(\d+)(\.[^\.]+)$/);
        if (!m) {
            showSeqStatus('error', '❌ URL-ul trebuie să se termine cu un număr urmat de extensie, ex. 001.png');
            return;
        }
        const prefix = m[1];
        const numStr = m[2];
        const suffix = m[3];
        const width = numStr.length;
        let start = parseInt(numStr, 10);
        if (isNaN(start)) start = 1;
        const urls = [];
        for (let i = 0; i < cnt; i++) {
            const nval = String(start + i).padStart(width, '0');
            urls.push(prefix + nval + suffix);
        }
        addImagesBatch(urls);
        showSeqStatus('success', `✅ S-au generat ${urls.length} URL-uri! (Salvați pentru a confirma)`);
        // clear inputs?
        // seqBaseInput.value = '';
        // seqCountInput.value = '';
    }

    function showSeqStatus(type, message) {
        if (!seqStatus) return;
        seqStatus.className = 'autogenerate-status ' + type;
        seqStatus.textContent = message;
    }

    function updateStatus(type, message) {
        statusDiv.className = 'autogenerate-status ' + type;
        statusDiv.textContent = message;
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Ensure init runs whether script loads before or after DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChapterAutogenerate);
} else {
    initChapterAutogenerate();
}
