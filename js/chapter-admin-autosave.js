/**
 * Chapter Admin Autosave - Automatically saves last Manga Series and Translation Group selection PER CHAPTER
 * Reloads values when opening that chapter again
 */

document.addEventListener('DOMContentLoaded', function() {
    // Cache selectors
    const mangaSelect = document.querySelector('select[name="manga_id"]');
    const translationInput = document.querySelector('input[name="translation_group"]');
    
    if (!mangaSelect || !translationInput) {
        return;
    }

    // Get chapter post ID from localized data
    const postId = typeof chapterAutosaveData !== 'undefined' ? chapterAutosaveData.postId : null;
    
    if (!postId) {
        return;
    }

    // Detect if it's a NEW post by checking the URL
    // New posts are on: post-new.php
    // Existing posts are on: post.php?post=ID
    const isNewPost = window.location.pathname.includes('post-new.php');

    const STORAGE_KEY_MANGA = `mangayummy_chapter_${postId}_manga_id`;
    const STORAGE_KEY_GROUP = `mangayummy_chapter_${postId}_translation_group`;
    
    // Global keys to remember LAST EDITED chapter
    const STORAGE_KEY_LAST_MANGA = 'mangayummy_last_edited_manga_id';
    const STORAGE_KEY_LAST_GROUP = 'mangayummy_last_edited_translation_group';

    // ===== 1. Restore previously saved values =====
    function restoreLastValues() {
        if (isNewPost) {
            const lastMangaId = localStorage.getItem(STORAGE_KEY_LAST_MANGA);
            const lastGroup = localStorage.getItem(STORAGE_KEY_LAST_GROUP);

            if (lastMangaId && mangaSelect.querySelector(`option[value="${lastMangaId}"]`)) {
                mangaSelect.value = lastMangaId;
            }

            if (lastGroup) {
                translationInput.value = lastGroup;
            }
        } else {
            const lastMangaId = localStorage.getItem(STORAGE_KEY_MANGA);
            const lastGroup = localStorage.getItem(STORAGE_KEY_GROUP);

            if (lastMangaId && mangaSelect.querySelector(`option[value="${lastMangaId}"]`)) {
                mangaSelect.value = lastMangaId;
            }

            if (lastGroup) {
                translationInput.value = lastGroup;
            }
        }
    }

    // ===== 2. Save values on change =====
    mangaSelect.addEventListener('change', function() {
        localStorage.setItem(STORAGE_KEY_MANGA, this.value);
        localStorage.setItem(STORAGE_KEY_LAST_MANGA, this.value);
        showSavedNotification('Manga Series saved');
    });

    translationInput.addEventListener('change', function() {
        if (this.value.trim()) {
            localStorage.setItem(STORAGE_KEY_GROUP, this.value);
            localStorage.setItem(STORAGE_KEY_LAST_GROUP, this.value);
            showSavedNotification('Translation Group saved');
        }
    });

    // ===== 3. Also save on input (live) for translation group =====
    let translationTimeout;
    translationInput.addEventListener('input', function() {
        clearTimeout(translationTimeout);
        translationTimeout = setTimeout(() => {
            if (this.value.trim()) {
                localStorage.setItem(STORAGE_KEY_GROUP, this.value);
                localStorage.setItem(STORAGE_KEY_LAST_GROUP, this.value);
            }
        }, 800);
    });

    // ===== 4. Visual save notification =====
    function showSavedNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'manga-autosave-notification';
        notification.textContent = '✓ ' + message;
        notification.style.cssText = `
            position: fixed;
            bottom: 100px;
            right: 20px;
            background: #13667a;
            color: white;
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 13px;
            font-weight: 600;
            z-index: 10000;
            animation: slideInUp 0.3s ease-out;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;

        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutDown 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        }, 2500);
    }

    // ===== 6. Interceptare form submit - LOAD din localStorage și write în form ÎNAINTE de trimitere =====
    const postForm = document.querySelector('#post');
    if (postForm) {
        postForm.addEventListener('submit', function(e) {
            const storedMangaId = localStorage.getItem(STORAGE_KEY_MANGA);
            const storedGroup = localStorage.getItem(STORAGE_KEY_GROUP);

            if (storedMangaId) {
                mangaSelect.value = storedMangaId;
            }

            if (storedGroup) {
                translationInput.value = storedGroup;
            }

            // FORCE save to GLOBAL keys (pentru NEW posts)
            const currentMangaId = mangaSelect.value;
            const currentGroup = translationInput.value;
            
            if (currentMangaId) {
                localStorage.setItem(STORAGE_KEY_LAST_MANGA, currentMangaId);
            }
            
            if (currentGroup && currentGroup.trim()) {
                localStorage.setItem(STORAGE_KEY_LAST_GROUP, currentGroup);
            }
        });
    }

    // ===== 7. Periodice check - dacă valorile din localStorage diferă de form, update form =====
    setInterval(function() {
        const storedMangaId = localStorage.getItem(STORAGE_KEY_MANGA);
        const storedGroup = localStorage.getItem(STORAGE_KEY_GROUP);

        if (storedMangaId && storedMangaId !== mangaSelect.value) {
            if (mangaSelect.querySelector(`option[value="${storedMangaId}"]`)) {
                mangaSelect.value = storedMangaId;
            }
        }

        if (storedGroup && storedGroup !== translationInput.value) {
            translationInput.value = storedGroup;
        }
    }, 2000);

    // ===== 5. Inițializează =====
    restoreLastValues();
});
