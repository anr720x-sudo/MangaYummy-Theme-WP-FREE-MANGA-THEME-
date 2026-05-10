

/**
 * Profile Page JavaScript
 * Handles tab switching, profile interactions, and image cropping
 */


// ═════════════════════════════════════════════════════════════════════════════
// IMAGE CROP SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

let cropper = null;
let currentUploadType = null; // 'avatar' or 'banner'
let originalFile = null;

function initCropSystem() {
    const cropModal = document.getElementById('cropModal');
    if (!cropModal) return;
    
    const cropImage = document.getElementById('cropImage');
    const closeBtn = cropModal.querySelector('.crop-modal-close');
    const cancelBtn = cropModal.querySelector('.crop-btn-cancel');
    const saveBtn = cropModal.querySelector('.crop-btn-save');
    const modalTitle = cropModal.querySelector('.crop-modal-title');
    
    // Close modal functions
    function closeCropModal() {
        cropModal.classList.remove('active');
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        currentUploadType = null;
        originalFile = null;
        // Reset file inputs
        const avatarInput = document.getElementById('avatarUpload');
        const bannerInput = document.getElementById('bannerUpload');
        if (avatarInput) avatarInput.value = '';
        if (bannerInput) bannerInput.value = '';
    }
    
    closeBtn.addEventListener('click', closeCropModal);
    cancelBtn.addEventListener('click', closeCropModal);
    
    // Close on backdrop click
    cropModal.addEventListener('click', function(e) {
        if (e.target === cropModal) closeCropModal();
    });
    
    // Close on ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && cropModal.classList.contains('active')) {
            closeCropModal();
        }
    });
    
    // Save cropped image
    saveBtn.addEventListener('click', function() {
        if (!cropper || !currentUploadType) return;
        
        saveBtn.disabled = true;
        saveBtn.textContent = 'Se salvează...';
        
        // Get cropped canvas
        const canvas = cropper.getCroppedCanvas({
            width: currentUploadType === 'avatar' ? 400 : 1200,
            height: currentUploadType === 'avatar' ? 400 : 400,
            imageSmoothingEnabled: true,
            imageSmoothingQuality: 'high',
        });
        
        // Convert to blob
        canvas.toBlob(function(blob) {
            const formData = new FormData();
            formData.append('action', currentUploadType === 'avatar' 
                ? 'mangayummy_upload_avatar' 
                : 'mangayummy_upload_banner'
            );
            formData.append('file', blob, originalFile.name);
            formData.append('nonce', mangayummy_ajax.nonce);
            
            fetch(mangayummy_ajax.ajaxurl, {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    // Update image on page
                    if (currentUploadType === 'avatar') {
                        const avatarImg = document.querySelector('.profile-avatar');
                        if (avatarImg) avatarImg.src = res.data.url + '?t=' + Date.now();
                        // Also update header avatar
                        const headerAvatar = document.getElementById('headerAvatar');
                        if (headerAvatar) headerAvatar.src = res.data.url + '?t=' + Date.now();
                    } else {
                        const banner = document.querySelector('.profile-banner');
                        if (banner) banner.style.backgroundImage = 'url(' + res.data.url + '?t=' + Date.now() + ')';
                    }
                    showToast('Imaginea a fost salvată cu succes!', 'success');
                } else {
                    showToast(res.data || 'Eroare la salvare', 'error');
                }
                closeCropModal();
            })
            .catch(err => {
                console.error(err);
                showToast('Eroare de conexiune', 'error');
                closeCropModal();
            })
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Salvează';
            });
        }, 'image/jpeg', 0.9);
    });
    
    // Open crop modal
    window.openCropModal = function(file, type) {
        currentUploadType = type;
        originalFile = file;
        modalTitle.textContent = type === 'avatar' ? 'Decupează poza de profil' : 'Decupează bannerul';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            cropImage.src = e.target.result;
            cropModal.classList.add('active');
            
            // Wait for image to load then init cropper
            cropImage.onload = function() {
                if (cropper) cropper.destroy();
                
                cropper = new Cropper(cropImage, {
                    aspectRatio: type === 'avatar' ? 1 : 3, // 1:1 for avatar, 3:1 for banner
                    viewMode: 1,
                    dragMode: 'move',
                    autoCropArea: 1,
                    restore: false,
                    guides: true,
                    center: true,
                    highlight: false,
                    cropBoxMovable: true,
                    cropBoxResizable: true,
                    toggleDragModeOnDblclick: false,
                    minContainerWidth: 300,
                    minContainerHeight: 200,
                });
            };
        };
        reader.readAsDataURL(file);
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // CLICK HANDLERS FOR AVATAR/BANNER UPLOAD
    // ═══════════════════════════════════════════════════════════════════════
    
    const avatarWrapper = document.querySelector('.avatar-wrapper');
    const bannerOverlay = document.querySelector('.banner-overlay');
    const banner = document.querySelector('.profile-banner');
    

    
    // Avatar click
    if (avatarWrapper) {
        avatarWrapper.style.cursor = 'pointer';
        avatarWrapper.addEventListener('click', function(e) {
            // Don't intercept if clicking directly on the input
            if (e.target.tagName === 'INPUT') return;
            
            const input = document.getElementById('avatarUpload');
            if (input) {
                // Make sure input accepts images
                input.accept = 'image/*';
                input.click();
            }
        });
    }
    
    // Banner overlay click
    if (bannerOverlay) {
        bannerOverlay.addEventListener('click', function(e) {
            // Don't intercept if clicking directly on the input
            if (e.target.tagName === 'INPUT') return;
            
            const input = document.getElementById('bannerUpload');
            if (input) {
                // Make sure input accepts images
                input.accept = 'image/*';
                input.click();
            }
        });
    }

    // File change handler- opens crop modal
    document.addEventListener('change', function(e) {
        if (!e.target.matches('#avatarUpload, #bannerUpload')) return;
        
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file size
        const maxSize = mangayummy_ajax?.maxSize || (2 * 1024 * 1024);
        const maxSizeMB = Math.floor(maxSize / (1024 * 1024));
        if (file.size > maxSize) {
            showToast(`Fișierul este prea mare. Maximum ${maxSizeMB}MB.`, 'error');
            e.target.value = '';
            return;
        }
        
        // Validate file type - GIF only allowed if user has permission
        const allowGif = mangayummy_ajax?.allowGif || false;
        const validTypes = allowGif 
            ? ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
            : ['image/jpeg', 'image/png', 'image/webp'];
        
        if (!validTypes.includes(file.type)) {
            const msg = allowGif 
                ? 'Tip de fișier invalid. Folosește JPG, PNG, WebP sau GIF.'
                : 'Tip de fișier invalid. Folosește JPG, PNG sau WebP.';
            showToast(msg, 'error');
            e.target.value = '';
            return;
        }
        
        // For GIF files, upload directly without cropping to preserve animation
        if (file.type === 'image/gif') {
            const type = e.target.id === 'avatarUpload' ? 'avatar' : 'banner';
            uploadFileDirectly(file, type);
            e.target.value = '';
            return;
        }
        
        // Open crop modal for other image types
        const type = e.target.id === 'avatarUpload' ? 'avatar' : 'banner';
        window.openCropModal(file, type);
    });
}

// Function to upload file directly without cropping (for GIFs)
function uploadFileDirectly(file, type) {
    const formData = new FormData();
    formData.append('action', type === 'avatar' 
        ? 'mangayummy_upload_avatar' 
        : 'mangayummy_upload_banner'
    );
    formData.append('file', file);
    formData.append('nonce', mangayummy_ajax.nonce);
    
    showToast('Se încarcă...', 'info');
    
    fetch(mangayummy_ajax.ajaxurl, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
    })
    .then(r => r.json())
    .then(res => {
        if (res.success) {
            // Update image on page
            if (type === 'avatar') {
                const avatarImg = document.querySelector('.profile-avatar');
                if (avatarImg) avatarImg.src = res.data.url + '?t=' + Date.now();
                // Also update header avatar
                const headerAvatar = document.getElementById('headerAvatar');
                if (headerAvatar) headerAvatar.src = res.data.url + '?t=' + Date.now();
            } else {
                const banner = document.querySelector('.profile-banner');
                if (banner) banner.style.backgroundImage = 'url(' + res.data.url + '?t=' + Date.now() + ')';
            }
            showToast('GIF-ul animat a fost încărcat cu succes!', 'success');
        } else {
            showToast(res.data || 'Eroare la încărcare', 'error');
        }
    })
    .catch(err => {
        console.error(err);
        showToast('Eroare de conexiune', 'error');
    });
}

// Simple toast function (global)
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `ya-toast ya-toast--${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.opacity = '1', 10);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
}

// Set file input accept attributes based on GIF permission
function initializeFileInputs() {
    const allowGif = mangayummy_ajax?.allowGif || false;
    const accept = allowGif ? '.jpg,.jpeg,.png,.webp,.gif' : '.jpg,.jpeg,.png,.webp';
    
    const avatarInput = document.getElementById('avatarUpload');
    const bannerInput = document.getElementById('bannerUpload');
    
    if (avatarInput) avatarInput.setAttribute('accept', accept);
    if (bannerInput) bannerInput.setAttribute('accept', accept);
}

document.addEventListener('DOMContentLoaded', function() { 
    initializeFileInputs();
    initCropSystem();

    // Allow owner to open a popup by double-clicking the badge
    const achievementBadge = document.querySelector('.achievement-badge[data-removable="1"]');
    const bugPopup = document.getElementById('bug-hunter-popup');

    if (achievementBadge && bugPopup) {
        achievementBadge.style.cursor = 'pointer';

        achievementBadge.addEventListener('dblclick', function() {
            bugPopup.style.display = 'flex';
        });

        const closeBtn = document.getElementById('close-bug-block');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                bugPopup.style.display = 'none';
            });
        }

        const removeBtn = document.getElementById('remove-bug-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                const formData = new FormData();
                formData.append('action', 'mangayummy_remove_achievement');
                formData.append('nonce', mangayummy_ajax.nonce);
                formData.append('achievement', 'bug_hunter');

                fetch(mangayummy_ajax.ajaxurl, {
                    method: 'POST',
                    body: formData,
                    credentials: 'same-origin'
                })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        achievementBadge.remove();
                        bugPopup.style.display = 'none';
                        // Allow the bug to be rediscovered on single-manga pages
                        localStorage.removeItem('mangayummy_bug_hunter');
                        showToast('Achievement Bug Hunter a fost șters.', 'success');
                    } else {
                        showToast(res.data?.message || 'Eroare la ștergere', 'error');
                    }
                })
                .catch(() => {
                    showToast('Eroare de conexiune', 'error');
                });
            });
        }

        // Close popup when clicking overlay
        const overlay = bugPopup.querySelector('.bug-popup__overlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                bugPopup.style.display = 'none';
            });
        }
    }

    const PROFILE_ID = document.body.dataset.profileId;
    const profilePage = document.querySelector('.profile-page');
    if (!profilePage) return;

    // ═════════════════════════════════════════════════════════════════════════════
    // TAB SYSTEM (UI CORE)
    // ═════════════════════════════════════════════════════════════════════════════

    const tabButtons = document.querySelectorAll('.tab-button, .profile-side-tab');
    const profileTabs = document.querySelectorAll('.profile-tab');

    function activateTab(tabName) {
        // Deactivate all tab buttons and tabs
        tabButtons.forEach(btn => btn.classList.remove('active'));
        profileTabs.forEach(tab => tab.classList.remove('active'));

        // Show the tab row matching the current section, hide others
        document.querySelectorAll('.profile-tabs').forEach(row => {
            const rowSection = row.dataset.section;
            // manga tab row shows for 'all' and 'favorites'
            if (rowSection === 'all') {
                row.style.display = (tabName === 'all' || tabName === 'favorites') ? 'flex' : 'none';
            } else {
                row.style.display = rowSection === tabName ? 'flex' : 'none';
            }
        });

        // Mark the corresponding manga-status-tab as active (for favorites)
        document.querySelectorAll('.manga-status-tab').forEach(btn => {
            btn.classList.toggle('active', tabName === 'favorites' && btn.getAttribute('data-status') === 'favorites');
        });

        // Activate the clicked tab button
        const tabButtonMatches = document.querySelectorAll(`.profile-side-tab[data-tab="${tabName}"]`);
        tabButtonMatches.forEach(btn => btn.classList.add('active'));

        // Activate the corresponding tab content
        const activeTab = document.getElementById(tabName + '-tab');
        if (activeTab) {
            activeTab.classList.add('active');
            // Ensure all items are visible when entering all-tab
            if (tabName === 'all') {
                const items = activeTab.querySelectorAll('.status-item');
                items.forEach(item => {
                    item.style.display = '';
                });
                // Clear search input when entering all tab
                const searchInput = activeTab.querySelector('.manga-search-input');
                if (searchInput) {
                    searchInput.value = '';
                }
            }
        }

        // Save tab state for persistence (no URL hash changes)
        localStorage.setItem('profileActiveTab', tabName);
        // Keep URL clean: do not set window.location.hash
    }

    function activateTranslationTab(tabName) {
        document.querySelectorAll('[data-translation-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-translation-tab') === tabName);
        });
        document.querySelectorAll('.translation-subtab-content').forEach(section => {
            section.classList.toggle('active', section.id === 'translations-' + tabName);
        });

    }

    // Single event listener for all tab clicks
    document.addEventListener('click', function(e) {
        const tabButton = e.target.closest('[data-tab]');
        if (tabButton) {
            e.preventDefault();
            const tabName = tabButton.getAttribute('data-tab');
            activateTab(tabName);
            return;
        }

        const translationTabButton = e.target.closest('[data-translation-tab]');
        if (translationTabButton) {
            e.preventDefault();
            const translationTabName = translationTabButton.getAttribute('data-translation-tab');
            activateTranslationTab(translationTabName);
            return;
        }
    });

    // function that handles choosing and activating the startup tab
    function initializeTabs() {
        let initialTab = 'translations';
        const saved = localStorage.getItem('profileActiveTab');
        if (saved && document.getElementById(saved + '-tab')) {
            initialTab = saved;
        } else if (window.profileHasNews && document.getElementById('stiri-tab')) {
            initialTab = 'stiri';
        }
        activateTab(initialTab);
        activateTranslationTab('in-progress');

        // Keep URL clean: remove any #hash and avoid anchor navigation.
        if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }

        // do not scroll: preserve browser's default anchor position to avoid flicker
    }

    // run on initial load
    initializeTabs();
    // mark ready so styles reveal tabs/content
    document.body.classList.add('profile-js-ready');

    // also run when navigating with bfcache or refresh/restore
    window.addEventListener('pageshow', function(e) {
        initializeTabs();
        document.body.classList.add('profile-js-ready');
    });
    
    // Clear search inputs on page load
    const searchInputs = document.querySelectorAll('.manga-search-input, #social-search');
    searchInputs.forEach(input => {
        input.value = '';
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // SETTINGS are handled globally via #settings modal (footer script).
    
    // Hide Appearance tab
    const appearanceTabBtn = document.querySelector('[data-tab="appearance"]');
    if (appearanceTabBtn) {
        appearanceTabBtn.style.display = 'none';
    }
    
    // Settings Tabs Handler
    document.addEventListener('click', function(e) {
        const settingsTabBtn = e.target.closest('.settings-tabs .tab-button');
        if (settingsTabBtn) {
            e.preventDefault();
            const tabName = settingsTabBtn.getAttribute('data-tab');
            
            // Remove active from all settings buttons
            document.querySelectorAll('.settings-tabs .tab-button').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Remove active from all settings content tabs
            document.querySelectorAll('.settings-content .profile-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Add active to clicked button
            settingsTabBtn.classList.add('active');
            
            // Add active to corresponding content tab
            const contentTab = document.getElementById(tabName + '-tab');
            if (contentTab) {
                contentTab.classList.add('active');
            }
        }
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // NOTIFICATIONS - Moved to header dropdown
    // ═════════════════════════════════════════════════════════════════════════════

    // Notification management handled via header dropdown

    // ═════════════════════════════════════════════════════════════════════════════
    // REMOVE FROM FAVORITES
    // ═════════════════════════════════════════════════════════════════════════════

    const removeFavoriteButtons = document.querySelectorAll('.remove-favorite');
    removeFavoriteButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();

            const mangaId = this.getAttribute('data-manga-id');
            const statusItem = this.closest('.status-item');


            // Silent removal - no confirmation needed
            if (statusItem) {
                statusItem.style.opacity = '0';
                setTimeout(() => {
                    statusItem.remove();
                    // Check if favorites grid is now empty
                    const favoritesTab = document.querySelector('#favorites-tab');
                    const remainingItems = favoritesTab ? favoritesTab.querySelectorAll('.status-item').length : 0;
                    if (remainingItems === 0) {
                        location.reload(); // Reload to show empty state
                    }
                }, 200);
            }
        });
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // EDIT PROGRESS BADGE - PROFILE
    // ═════════════════════════════════════════════════════════════════════════════

    // custom modal logic
    const progressModal = document.getElementById('progress-modal');
    const progressInput = document.getElementById('progress-input');
    const progressSaveBtn = document.getElementById('progress-save-btn');
    const progressCancelBtn = document.getElementById('progress-cancel-btn');
    let activeBadge = null;

    document.addEventListener('click', function(e) {
        const badge = e.target.closest('.cover-progress.editable');
        if (!badge) return;
        e.preventDefault();
        activeBadge = badge;
        // if badge text contains slash, only set value before slash
        var text = badge.textContent.trim();
        var parts = text.split('/');
        progressInput.value = parts[0] || '';
        if (progressModal) progressModal.style.display = 'flex';
    });

    function closeModal() {
        if (progressModal) progressModal.style.display = 'none';
        activeBadge = null;
    }

    if (progressCancelBtn) {
        progressCancelBtn.addEventListener('click', function() {
            closeModal();
        });
    }

    if (progressSaveBtn) {
        progressSaveBtn.addEventListener('click', function() {
            if (!activeBadge) return;
            let newVal = parseInt(progressInput.value, 10);
            if (isNaN(newVal) || newVal < 0) {
                alert('Număr invalid');
                return;
            }
            const mangaId = activeBadge.getAttribute('data-manga-id');
            const formData = new FormData();
            formData.append('action', 'mangayummy_update_manga_progress');
            formData.append('nonce', ya_ajax.nonce);
            formData.append('manga_id', mangaId);
            formData.append('progress', newVal);
            fetch(ya_ajax.ajax_url, { method: 'POST', body: formData })
                .then(r => r.json())
                .then(data => {
                    if (data.success) {
                        // update text preserving total if present
                        var total = parseInt(activeBadge.dataset.totalChapters || '0', 10);
                        if (total > 0) {
                            if (newVal === 0) activeBadge.textContent = '0/' + total;
                            else activeBadge.textContent = newVal + '/' + total;
                        } else {
                            activeBadge.textContent = newVal;
                        }
                        showNotification('Progres actualizat', 'success');
                        closeModal();
                    } else {
                        showNotification(data.data?.message || 'Eroare', 'error');
                    }
                })
                .catch(() => {
                    showNotification('Eroare de rețea', 'error');
                });
        });
    }

    // close modal when clicking outside content
    if (progressModal) {
        progressModal.addEventListener('click', function(e) {
            if (e.target === progressModal) closeModal();
        });
    }

    // ===== rating modal handling =====
    const ratingModal = document.getElementById('rating-modal');
    const ratingInput = document.getElementById('rating-input');
    const ratingSaveBtn = document.getElementById('rating-save-btn');
    const ratingCancelBtn = document.getElementById('rating-cancel-btn');
    let activeRatingBadge = null;

    // helper: sort items within each visible status grid by rating desc
    function resortGrids() {
        document.querySelectorAll('.manga-status-grid').forEach(grid => {
            const items = Array.from(grid.querySelectorAll('.status-item'));
            items.sort((a,b) => {
                const ra = parseFloat(a.querySelector('.cover-rating')?.textContent || '0');
                const rb = parseFloat(b.querySelector('.cover-rating')?.textContent || '0');
                return rb - ra;
            });
            items.forEach(it => grid.appendChild(it));
        });
    }

    document.addEventListener('click', function(e) {
        const badge = e.target.closest('.cover-rating.editable');
        if (!badge) return;
        e.preventDefault();
        activeRatingBadge = badge;
        ratingInput.value = badge.textContent.trim();
        if (ratingModal) ratingModal.style.display = 'flex';
    });

    function closeRatingModal() {
        if (ratingModal) ratingModal.style.display = 'none';
        activeRatingBadge = null;
    }

    if (ratingCancelBtn) {
        ratingCancelBtn.addEventListener('click', function() {
            closeRatingModal();
        });
    }

    if (ratingSaveBtn) {
        ratingSaveBtn.addEventListener('click', function() {
            if (!activeRatingBadge) return;
            let newVal = parseFloat(ratingInput.value);
            if (isNaN(newVal) || newVal < 0 || newVal > 10) {
                alert('Rating invalid');
                return;
            }
            // send AJAX rating update
            const mangaId = activeRatingBadge.getAttribute('data-manga-id');
            const formData = new FormData();
            formData.append('action', 'manga_rate');
            formData.append('post', mangaId);
            formData.append('rating', newVal);
            formData.append('nonce', mangaRating ? mangaRating.nonce : ya_ajax.nonce);
            fetch(ya_ajax.ajax_url, { method: 'POST', body: formData })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        activeRatingBadge.textContent = newVal;
                        showNotification('Rating actualizat', 'success');
                        closeRatingModal();
                        // resort after updating value
                        resortGrids();
                    } else {
                        showNotification((res.data && res.data.message) || 'Eroare', 'error');
                    }
                })
                .catch(() => showNotification('Eroare de rețea', 'error'));
        });
    }

    if (ratingModal) {
        ratingModal.addEventListener('click', function(e) {
            if (e.target === ratingModal) closeRatingModal();
        });
    }


    // ═════════════════════════════════════════════════════════════════════════════

    // KEYBOARD NAVIGATION
    // ═════════════════════════════════════════════════════════════════════════════

    tabButtons.forEach((button, index) => {
        button.addEventListener('keydown', function(e) {
            let nextButton = null;

            if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextButton = tabButtons[index + 1] || tabButtons[0];
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                nextButton = tabButtons[index - 1] || tabButtons[tabButtons.length - 1];
            }

            if (nextButton) {
                nextButton.focus();
                nextButton.click();
            }
        });
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // ACCESSIBILITY: Tab button focus
    // ═════════════════════════════════════════════════════════════════════════════

    tabButtons.forEach(button => {
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', button.classList.contains('active'));
    });

    profileTabs.forEach(tab => {
        tab.setAttribute('role', 'tabpanel');
    });

    // ═════════════════════════════════════════════════════════════════════════════
    // SETTINGS FUNCTIONALITY
    // ═════════════════════════════════════════════════════════════════════════════

    // ═════════════════════════════════════════════════════════════════════════════
    // SETTINGS: SAVE ALL GENERAL DATA
    // ═════════════════════════════════════════════════════════════════════════════
    
    const saveAllGeneralBtn = document.getElementById('save-all-general-btn');
    if (saveAllGeneralBtn) {
        saveAllGeneralBtn.addEventListener('click', function() {
            const username = document.getElementById('username-input')?.value.trim() || '';
            const birthday = document.getElementById('birthday-input')?.value || '';
            const gender = document.getElementById('gender-select')?.value || '';
            const bio = document.getElementById('bio-textarea')?.value.trim() || '';

            if (!username) {
                showNotification('Numele nu poate fi gol', 'error');
                return;
            }

            this.disabled = true;
            this.textContent = '⏳ Se salvează...';

            // Save all fields with AJAX
            const savePromises = [
                // Save username
                fetch(ya_ajax.ajax_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'mangayummy_change_username', nonce: ya_ajax.nonce, username })
                }).then(r => r.json()),

                // Save birthday
                fetch(ya_ajax.ajax_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'save_birthday', nonce: ya_ajax.nonce, birthday })
                }).then(r => r.json()).catch(() => ({ success: true })),

                // Save gender
                fetch(ya_ajax.ajax_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'save_gender', nonce: ya_ajax.nonce, gender })
                }).then(r => r.json()).catch(() => ({ success: true })),

                // Save bio
                fetch(ya_ajax.ajax_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ action: 'save_bio', nonce: ya_ajax.nonce, bio })
                }).then(r => r.json()).catch(error => {
                    console.error('Profile bio save error:', error);
                    return { success: true };
                })
            ];

            Promise.all(savePromises)
                .then(responses => {
                    const allSuccess = responses.every(r => r.success);
                    if (allSuccess) {
                        showNotification('✅ Setări salvate cu succes!', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        showNotification('❌ Eroare la salvare', 'error');
                    }
                })
                .catch(error => {
                    console.error('Save all error:', error);
                    showNotification('❌ Eroare: ' + error.message, 'error');
                })
                .finally(() => {
                    saveAllGeneralBtn.disabled = false;
                    saveAllGeneralBtn.textContent = 'Salvează tot';
                });
        });
    }

    // Professional notification system
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `ya-toast ya-toast--${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Username change
    const saveUsernameBtn = document.getElementById('save-username-btn');
    const usernameInput = document.getElementById('username-input');
    const usernameStatus = document.getElementById('username-status');
    const usernameMessage = document.getElementById('username-message');
    const messageText = document.querySelector('.message-text');
    const reqLength = document.getElementById('req-length');
    const reqUnique = document.getElementById('req-unique');
    const usernameValidator = document.querySelector('.username-validator');
    const usernameRequirements = document.querySelector('.username-requirements');
    
    let checkTimeout;
    let isAvailable = false;

    // Expand/collapse username validator block
    if (usernameInput && usernameValidator) {
        usernameInput.addEventListener('focus', function() {
            usernameValidator.classList.add('expanded');
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (!usernameValidator.contains(e.target)) {
                usernameValidator.classList.remove('expanded');
            }
        });
    }

    // Real-time username availability check
    if (usernameInput) {
        usernameInput.addEventListener('input', function() {
            const username = this.value.trim();
            
            // Show requirements when typing
            if (username.length > 0 && usernameRequirements) {
                usernameRequirements.classList.add('visible');
            }
            
            clearTimeout(checkTimeout);
            updateRequirements(username);
            
            if (!username) {
                usernameMessage.classList.remove('visible', 'checking', 'available', 'taken');
                return;
            }
            
            if (username.length < 5) {
                usernameStatus.innerHTML = '<span class="status-icon">✕</span>';
                usernameStatus.style.color = '#e74c3c';
                messageText.textContent = '❌ Minim 5 caractere';
                usernameMessage.classList.remove('checking', 'taken', 'available');
                usernameMessage.classList.add('visible');
                isAvailable = false;
                updateSaveButton();
                return;
            }
            
            // Show checking state
            usernameStatus.innerHTML = '<span class="status-icon" style="animation: spin 1s linear infinite;">⟳</span>';
            messageText.textContent = 'Se verifică disponibilitatea...';
            usernameMessage.classList.add('visible', 'checking');
            
            checkTimeout = setTimeout(() => {
                const currentUserId = document.querySelector('[data-current-user-id]')?.dataset.currentUserId || 
                                     document.querySelector('.profile-username')?.closest('[data-user-id]')?.dataset.userId || 0;
                
                fetch(ya_ajax.ajax_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'check_username_available',
                        username: username,
                        current_user_id: currentUserId,
                        nonce: ya_ajax.nonce
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.data.available) {
                        isAvailable = true;
                        usernameStatus.innerHTML = '<span class="status-icon">✓</span>';
                        usernameStatus.style.color = '#27ae60';
                        messageText.textContent = '✓ Disponibil';
                        usernameMessage.classList.remove('checking', 'taken');
                        usernameMessage.classList.add('available');
                        reqUnique.parentElement.classList.add('met');
                        reqUnique.parentElement.classList.remove('unmet', 'pending');
                    } else {
                        isAvailable = false;
                        usernameStatus.innerHTML = '<span class="status-icon">✕</span>';
                        usernameStatus.style.color = '#e74c3c';
                        messageText.textContent = '❌ Acest nume este deja luat';
                        usernameMessage.classList.remove('checking', 'available');
                        usernameMessage.classList.add('taken');
                        reqUnique.parentElement.classList.add('unmet');
                        reqUnique.parentElement.classList.remove('met', 'pending');
                    }
                    updateSaveButton();
                })
                .catch(error => {
                    console.error('Check username error:', error);
                    usernameStatus.innerHTML = '<span class="status-icon">!</span>';
                    usernameStatus.style.color = '#999';
                    messageText.textContent = 'Eroare la verificare';
                    usernameMessage.classList.remove('checking', 'available', 'taken');
                    isAvailable = false;
                    updateSaveButton();
                });
            }, 600);
        });
    }
    
    function updateRequirements(username) {
        // Length requirement
        if (username.length >= 3) {
            reqLength.parentElement.classList.add('met');
            reqLength.parentElement.classList.remove('unmet', 'pending');
        } else if (username.length > 0) {
            reqLength.parentElement.classList.add('pending');
            reqLength.parentElement.classList.remove('met', 'unmet');
        } else {
            reqLength.parentElement.classList.add('pending');
            reqLength.parentElement.classList.remove('met', 'unmet');
        }
    }
    
    function updateSaveButton() {
        if (saveUsernameBtn) {
            if (isAvailable && usernameInput.value.trim().length >= 3) {
                saveUsernameBtn.disabled = false;
                saveUsernameBtn.style.opacity = '1';
                saveUsernameBtn.style.cursor = 'pointer';
            } else {
                saveUsernameBtn.disabled = true;
                saveUsernameBtn.style.opacity = '0.5';
                saveUsernameBtn.style.cursor = 'not-allowed';
            }
        }
    }

    if (saveUsernameBtn && usernameInput) {
        saveUsernameBtn.addEventListener('click', function() {
            const username = usernameInput.value.trim();

            // Validate length before sending to backend (3-20 characters)
            if (username.length < 3 || username.length > 20) {
                const msg = document.getElementById('profile-message');
                if (msg) {
                    msg.textContent = '❌ Numele trebuie să aibă între 3 și 20 caractere';
                    msg.style.display = 'block';
                    setTimeout(() => msg.style.display = 'none', 3000);
                }
                return;
            }

            if (!username || !isAvailable) {
                console.error('Nume invalid sau deja luat');
                return;
            }

            this.disabled = true;
            this.textContent = 'Se salvează...';

            fetch(ya_ajax.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'mangayummy_change_username',
                    nonce: ya_ajax.nonce,
                    username: username
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const newUsername = data.data?.username || username;
                    // Get current user ID - from ya_ajax which is now available globally
                    const currentUserId = ya_ajax?.currentUserId || 
                                        document.body.dataset.profileId || 
                                        document.querySelector('[data-user-id]')?.dataset.userId || 
                                        document.querySelector('.profile-username')?.closest('[data-user-id]')?.dataset.userId;
                    
                    // Call global function to update username everywhere
                    if (window.updateUsernameGlobally) {
                        window.updateUsernameGlobally(newUsername, currentUserId);
                    }
                    
                    // Show success message
                    const msg = document.getElementById('profile-message');
                    if (msg) {
                        msg.textContent = '✔ ' + (data.data?.message || 'Nume actualizat cu succes');
                        msg.style.display = 'block';
                        setTimeout(() => msg.style.display = 'none', 3000);
                    }
                } else {
                    console.error('Eroare: ' + data.data);
                    const msg = document.getElementById('profile-message');
                    if (msg) {
                        msg.textContent = '❌ ' + (data.data || 'Eroare la salvare');
                        msg.style.display = 'block';
                        setTimeout(() => msg.style.display = 'none', 3000);
                    }
                }
            })
            .catch(error => {
                console.error('Username update error:', error);
            })
            .finally(() => {
                saveUsernameBtn.disabled = false;
                saveUsernameBtn.textContent = 'Salvează';
            });
        });
    }

    // Email change
    const saveEmailBtn = document.getElementById('save-email-btn');
    const emailInput = document.getElementById('email-input');

    if (saveEmailBtn && emailInput) {
        saveEmailBtn.addEventListener('click', function() {
            const email = emailInput.value.trim();

            if (!email || !email.includes('@')) {
                console.error('Email invalid');
                return;
            }

            this.disabled = true;
            this.textContent = 'Se salvează...';

            fetch(ya_ajax.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'mangayummy_change_email',
                    nonce: ya_ajax.nonce,
                    email: email
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                } else {
                    console.error('Eroare: ' + data.data);
                }
            })
            .catch(error => {
                console.error('Email update error:', error);
            })
            .finally(() => {
                saveEmailBtn.disabled = false;
                saveEmailBtn.textContent = 'Salvează';
            });
        });
    }

    // Password change
    const savePasswordBtn = document.getElementById('save-password-btn');
    const passwordInput = document.getElementById('password-input');

    if (savePasswordBtn && passwordInput) {
        savePasswordBtn.addEventListener('click', function() {
            const password = passwordInput.value;

            if (!password || password.length < 6) {
                console.error('Parola trebuie să aibă cel puțin 6 caractere');
                return;
            }

            // Proceed with password change - remove confirmation popup
            this.disabled = true;
            this.textContent = 'Se schimbă...';

            fetch(ya_ajax.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'mangayummy_change_password',
                    nonce: ya_ajax.nonce,
                    password: password
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    passwordInput.value = '';
                } else {
                    console.error('Eroare: ' + data.data);
                }
            })
            .catch(error => {
                console.error('Password update error:', error);
            })
            .finally(() => {
                savePasswordBtn.disabled = false;
                savePasswordBtn.textContent = 'Schimbă Parola';
            });
        });
    }

    // Bio update
    const saveBioBtn = document.getElementById('save-bio-btn');
    const bioTextarea = document.getElementById('bio-textarea');

    if (saveBioBtn && bioTextarea) {
        saveBioBtn.addEventListener('click', function() {
            const bio = bioTextarea.value;

            if (typeof ya_ajax === 'undefined' || !ya_ajax.ajax_url) {
                console.error('ya_ajax not defined:', ya_ajax);
                alert('Eroare: AJAX nedisponibil');
                return;
            }

            this.disabled = true;
            this.textContent = 'Se salvează...';

                // Save bio
                fetch(ya_ajax.ajax_url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'mangayummy_update_bio',
                        nonce: ya_ajax.nonce,
                        bio: bio
                    })
                })
                .then(response => response.text())
                .then(text => {
                    try {
                        return JSON.parse(text);
                    } catch (e) {
                        throw e;
                    }
                })
                .then(data => {
                if (data.success) {
                    const successMsg = document.createElement('div');
                    successMsg.className = 'save-success';
                    successMsg.textContent = 'Bio salvată cu succes!';
                    saveBioBtn.parentElement.appendChild(successMsg);
                    setTimeout(() => successMsg.remove(), 3000);
                } else {
                    console.error('Bio error:', data);
                    alert('Eroare: ' + (data.data || 'Necunoscut'));
                }
            })
            .catch(error => {
                console.error('Bio update error:', error);
                alert('Eroare de rețea: ' + error.message);
            })
            .finally(() => {
                saveBioBtn.disabled = false;
                saveBioBtn.textContent = 'Salvează';
            });
        });
    }

    // Birthday update
    const saveBirthdayBtn = document.getElementById('save-birthday-btn');
    const birthdayInput = document.getElementById('birthday-input');

    if (saveBirthdayBtn && birthdayInput) {
        saveBirthdayBtn.addEventListener('click', function() {
            const birthday = birthdayInput.value;
            
            if (!birthday) {
                alert('Te rog selectează o dată!');
                return;
            }
            
            if (typeof ya_ajax === 'undefined' || !ya_ajax.ajax_url) {
                console.error('ya_ajax not defined:', ya_ajax);
                alert('Eroare: AJAX nedisponibil');
                return;
            }

            this.disabled = true;
            this.textContent = 'Se salvează...';

            fetch(ya_ajax.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'mangayummy_update_birthday',
                    nonce: ya_ajax.nonce,
                    birthday: birthday
                })
            })
            .then(response => {
                return response.text();
            })
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('JSON parse error:', e, 'text:', text);
                    throw e;
                }
            })
            .then(data => {
                if (data.success) {
                    const successMsg = document.createElement('div');
                    successMsg.className = 'save-success';
                    successMsg.textContent = 'Data nașterii salvată cu succes!';
                    saveBirthdayBtn.parentElement.appendChild(successMsg);
                    setTimeout(() => successMsg.remove(), 3000);
                } else {
                    console.error('Birthday error response:', data);
                    alert('Eroare: ' + (data.data || 'Necunoscut'));
                }
            })
            .catch(error => {
                console.error('Birthday update error:', error);
            })
            .finally(() => {
                saveBirthdayBtn.disabled = false;
                saveBirthdayBtn.textContent = 'Salvează';
            });
        });
    }

    // Gender update
    const saveGenderBtn = document.getElementById('save-gender-btn');
    const genderSelect = document.getElementById('gender-select');

    if (saveGenderBtn && genderSelect) {
        saveGenderBtn.addEventListener('click', function() {
            const gender = genderSelect.value;
            
            if (!gender) {
                alert('Te rog selectează un sex!');
                return;
            }

            if (typeof ya_ajax === 'undefined' || !ya_ajax.ajax_url) {
                console.error('ya_ajax not defined:', ya_ajax);
                alert('Eroare: AJAX nedisponibil');
                return;
            }

            this.disabled = true;
            this.textContent = 'Se salvează...';

            fetch(ya_ajax.ajax_url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'mangayummy_update_gender',
                    nonce: ya_ajax.nonce,
                    gender: gender
                })
            })
            .then(response => {
                return response.text();
            })
            .then(text => {
                try {
                    return JSON.parse(text);
                } catch (e) {
                    console.error('JSON parse error:', e);
                    throw e;
                }
            })
            .then(data => {
                if (data.success) {
                    const successMsg = document.createElement('div');
                    successMsg.className = 'save-success';
                    successMsg.textContent = 'Sexul salvat cu succes!';
                    saveGenderBtn.parentElement.appendChild(successMsg);
                    setTimeout(() => successMsg.remove(), 3000);
                } else {
                    console.error('Gender error:', data);
                    alert('Eroare: ' + (data.data || 'Necunoscut'));
                }
            })
            .catch(error => {
                console.error('Gender update error:', error);
                alert('Eroare de rețea: ' + error.message);
            })
            .finally(() => {
                saveGenderBtn.disabled = false;
                saveGenderBtn.textContent = 'Salvează';
            });
        });
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // SOCIAL SEARCH
    // ═════════════════════════════════════════════════════════════════════════════

    const socialInput = document.getElementById('social-search');
    const socialResults = document.getElementById('social-results');

    if (socialInput && socialResults) {
        socialInput.addEventListener('input', () => {
            const q = socialInput.value.trim();

            if (q.length < 2) {
                socialResults.innerHTML = '';
                return;
            }

            fetch(mangayummy_ajax.ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=mangayummy_user_search&query=${encodeURIComponent(q)}`
            })
            .then(r => r.text())
            .then(html => {
                socialResults.innerHTML = html;
            });
        });

        // Clear search input when clicking outside results
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-section') && socialResults.innerHTML !== '') {
                socialResults.innerHTML = '';
                socialInput.value = '';
            }
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MANGA SORT / FILTER (All tab)
    // ═════════════════════════════════════════════════════════════════════════

    const sortButtons = document.querySelectorAll('.manga-sort-filter .sort-btn');

    // current status filter state (drawer items)
    let currentFilter = 'reading';

    // central visibility helper combines active search query + status filter
    function updateItemVisibility(item) {
        // titles were moved onto the cover overlay; fall back to h3 if present
        let title = '';
        const coverTitle = item.querySelector('.cover-title');
        if (coverTitle) {
            title = coverTitle.textContent.trim().toLowerCase();
        } else {
            const h3 = item.querySelector('h3');
            title = h3 ? h3.textContent.trim().toLowerCase() : '';
        }
        // query the search field each time to avoid ordering issues
        const searchEl = document.querySelector('.manga-search-input');
        const q = searchEl ? searchEl.value.trim().toLowerCase() : '';
        const matchesSearch = !q || title.indexOf(q) !== -1;

        const current = (item.getAttribute('data-current-status') || '').trim();
        const matchesFilter = currentFilter === 'all' || current === currentFilter;

        item.style.display = (matchesSearch && matchesFilter) ? '' : 'none';
    }

    function refreshGroupVisibility() {
        document.querySelectorAll('.status-group-title').forEach(title => {
            const grid = title.nextElementSibling;
            if (!grid || !grid.classList.contains('manga-status-grid')) return;
            let any = false;
            grid.querySelectorAll('.status-item').forEach(it => {
                if (it.style.display !== 'none') any = true;
            });
            title.style.display = any ? '' : 'none';
        });
    }

    function applyMangaFilter(filter) {
        // remember state
        currentFilter = filter || 'all';

        // update drawer buttons active state (if present)
        document.querySelectorAll('.filter-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-status') === currentFilter);
        });

        // update quick status tabs active state (if present)
        document.querySelectorAll('.manga-status-tab').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-status') === currentFilter);
        });

        const items = document.querySelectorAll('#all-tab .status-item');
        if (!items) return;
        items.forEach(updateItemVisibility);
        refreshGroupVisibility();
        resortGrids();
    }

    // legacy sort buttons (none currently) – keep for compatibility
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.sort-btn');
        if (!btn) return;
        e.preventDefault();
        const filter = btn.dataset.sort || 'all';
        applyMangaFilter(filter);
        // no persistence, always reset to 'all' on reload
    });

    // initialize filter on Reading to match top status tabs
    applyMangaFilter('reading');

    // Quick status tabs in all-tab header
    document.addEventListener('click', function(e) {
        const quickTab = e.target.closest('.manga-status-tab');
        if (!quickTab) return;
        e.preventDefault();
        const status = quickTab.getAttribute('data-status') || 'reading';
        if (status === 'favorites') {
            activateTab('favorites');
        } else {
            activateTab('all');
            applyMangaFilter(status);
        }
    });

    // Search input for manga list
    const mangaSearch = document.querySelector('.manga-search-input');
    if (mangaSearch) {
        mangaSearch.addEventListener('input', function() {
            const items = document.querySelectorAll('#all-tab .status-item');
            items.forEach(updateItemVisibility);
            refreshGroupVisibility();
        });
    }

    // Comment reactions (like/dislike) in profile comments tab
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.comment-react-btn');
        if (!btn) return;
        e.preventDefault();

        const commentItem = btn.closest('.comment-item');
        if (!commentItem) return;
        const commentId = commentItem.dataset.commentId;
        const reaction = btn.dataset.reaction;
        if (!commentId || !reaction) return;

        if (btn.disabled) return;

        // Optimistic lock to prevent double clicks
        btn.disabled = true;

        const formData = new FormData();
        formData.append('action', 'mangayummy_react_comment');
        formData.append('nonce', (typeof mangayummy_ajax !== 'undefined' && mangayummy_ajax.comment_nonce) ? mangayummy_ajax.comment_nonce : '');
        formData.append('comment_id', commentId);
        formData.append('reaction', reaction);

        const ajaxUrl = (typeof mangayummy_ajax !== 'undefined') ? mangayummy_ajax.ajaxurl : '/wp-admin/admin-ajax.php';

        fetch(ajaxUrl, { method: 'POST', body: formData })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    const likeBtn    = commentItem.querySelector('.comment-react-btn--like');
                    const dislikeBtn = commentItem.querySelector('.comment-react-btn--dislike');
                    if (likeBtn)    likeBtn.querySelector('.react-count').textContent    = data.data.likes;
                    if (dislikeBtn) dislikeBtn.querySelector('.react-count').textContent = data.data.dislikes;

                    // Update active states
                    if (likeBtn)    likeBtn.classList.toggle('active', data.data.current === 'like');
                    if (dislikeBtn) dislikeBtn.classList.toggle('active', data.data.current === 'dislike');
                }
            })
            .catch(() => {})
            .finally(() => { btn.disabled = false; });
    });

    // Filter drawer toggle (three dots)
    const filterToggle = document.querySelector('.filter-toggle');
    const filterDrawer = document.getElementById('manga-filter-drawer');
    const drawerClose = document.querySelector('.drawer-close');
    
    function closeDrawer() {
        if (filterDrawer) {
            filterDrawer.classList.remove('open');
        }
    }
    
    // Ensure drawer is closed on page load - prevents flash
    if (filterDrawer) {
        filterDrawer.classList.remove('open');
    }
    
    if (filterToggle && filterDrawer) {
        filterToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            filterDrawer.classList.toggle('open');
        });

        // Close button in drawer
        if (drawerClose) {
            drawerClose.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeDrawer();
                // Ensure manga list is still visible after closing
                const allTab = document.getElementById('all-tab');
                if (allTab) {
                    allTab.style.display = '';
                }
            });
        }

        // Clicking outside drawer closes it
        document.addEventListener('click', function(e) {
            if (filterDrawer && filterDrawer.classList.contains('open')) {
                if (!filterDrawer.contains(e.target) && !filterToggle.contains(e.target)) {
                    closeDrawer();
                    // Ensure manga list is still visible
                    const allTab = document.getElementById('all-tab');
                    if (allTab) {
                        allTab.style.display = '';
                    }
                }
            }
        });

        // Clicking an item in drawer filters the list
        filterDrawer.addEventListener('click', function(e) {
            const target = e.target.closest('[data-drawer-action]');
            if (!target) return;
            e.preventDefault();
            const action = target.dataset.drawerAction;
            if (action === 'filter-status') {
                const status = target.getAttribute('data-status') || target.dataset.status || 'all';
                
                // Update active button in drawer
                filterDrawer.querySelectorAll('[data-drawer-action="filter-status"]').forEach(btn => {
                    btn.classList.toggle('active', btn.getAttribute('data-status') === status);
                });
                
                applyMangaFilter(status);
                localStorage.setItem('profileMangaFilter', status);
                closeDrawer();
            }
        });
    }

});
// ═════════════════════════════════════════════════════════════════════════════
// GLOBAL HANDLERS (outside DOMContentLoaded)
// ═════════════════════════════════════════════════════════════════════════════

// DEFINEȘTE siteurl GLOBAL
window.siteurl = window.siteurl || document.location.origin;

// CLICK HANDLER FINAL pentru social-user
document.addEventListener('click', function (e) {
    const user = e.target.closest('.social-user');
    if (!user) return;

    e.preventDefault();
    e.stopPropagation();

    const userId = user.dataset.userId;
    if (!userId) return;

    // Clear search input before redirect
    const searchInput = document.getElementById('social-search');
    if (searchInput) searchInput.value = '';

    window.location.href = siteurl + '/users/' + userId;
});

