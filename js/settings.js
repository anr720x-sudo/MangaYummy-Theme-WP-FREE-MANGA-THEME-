/**
 * Settings Page JavaScript
 * Handles tab switching and settings save functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // ═════════════════════════════════════════════════════════════════════════════
    // IMAGE CROP SYSTEM
    // ═════════════════════════════════════════════════════════════════════════════
    
    let cropper = null;
    let currentUploadType = null; // 'avatar' or 'banner'
    let originalFile = null;
    
    const cropModal = document.getElementById('cropModal');
    const cropImage = document.getElementById('cropImage');

    function setDefaultBannerPreview() {
        const bannerPreviewImg = document.getElementById('banner-preview-img');
        const bannerPreviewWrap = bannerPreviewImg ? bannerPreviewImg.closest('.banner-preview') : null;
        if (!bannerPreviewImg || !bannerPreviewWrap) return;

        const defaultLogo = bannerPreviewWrap.dataset.defaultLogo || '/wp-content/themes/mangayummy/assets/img/logo.png';
        bannerPreviewImg.src = defaultLogo + '?t=' + Date.now();
        bannerPreviewWrap.classList.add('is-default-banner');
    }

    function setCustomBannerPreview(url) {
        const bannerPreviewImg = document.getElementById('banner-preview-img');
        const bannerPreviewWrap = bannerPreviewImg ? bannerPreviewImg.closest('.banner-preview') : null;
        if (!bannerPreviewImg || !bannerPreviewWrap || !url) return;

        const nextUrl = url + '?t=' + Date.now();
        const preload = new Image();

        preload.onload = function() {
            bannerPreviewImg.src = nextUrl;
            bannerPreviewWrap.classList.remove('is-default-banner');
        };

        preload.onerror = function() {
            // Fallback to previous behavior if preload fails.
            bannerPreviewImg.src = nextUrl;
            bannerPreviewWrap.classList.remove('is-default-banner');
        };

        preload.src = nextUrl;
    }
    
    function initCropSystem() {
        if (!cropModal) return;
        
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
            const avatarInput = document.getElementById('avatar-file-input');
            const bannerInput = document.getElementById('banner-file-input');
            if (avatarInput) avatarInput.value = '';
            if (bannerInput) bannerInput.value = '';
        }
        
        if (closeBtn) closeBtn.addEventListener('click', closeCropModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeCropModal);
        
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
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                if (!cropper || !currentUploadType) return;
                
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving...';
                
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
                    formData.append('nonce', window.YA_SETTINGS?.nonce || '');
                    
                    fetch(window.YA_SETTINGS?.ajaxurl || '/wp-admin/admin-ajax.php', {
                        method: 'POST',
                        body: formData,
                        credentials: 'same-origin'
                    })
                    .then(r => r.json())
                    .then(res => {
                        if (res.success) {
                            // Update image on page
                            if (currentUploadType === 'avatar') {
                                const avatarImg = document.getElementById('avatar-preview-img');
                                if (avatarImg) avatarImg.src = res.data.url + '?t=' + Date.now();
                                const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
                                if (avatarRemoveBtn) avatarRemoveBtn.style.display = 'inline-block';
                            } else {
                                const bannerImg = document.getElementById('banner-preview-img');
                                if (bannerImg) setCustomBannerPreview(res.data.url);
                                const bannerRemoveBtn = document.getElementById('banner-remove-btn');
                                if (bannerRemoveBtn) bannerRemoveBtn.style.display = 'inline-block';
                            }
                            showToast('✅ Image saved successfully!', 'success');
                        } else {
                            showToast('❌ ' + (res.data || 'Save error'), 'error');
                        }
                        closeCropModal();
                    })
                    .catch(err => {
                        console.error(err);
                        showToast('❌ Connection error', 'error');
                        closeCropModal();
                    })
                    .finally(() => {
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Save';
                    });
                }, 'image/jpeg', 0.9);
            });
        }
    }
    
    // Open crop modal
    function openCropModal(file, type) {
        if (!cropModal || !cropImage) return;
        
        currentUploadType = type;
        originalFile = file;
        const modalTitle = cropModal.querySelector('.crop-modal-title');
        if (modalTitle) {
            modalTitle.textContent = type === 'avatar' ? 'Crop profile picture' : 'Crop banner';
        }
        
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
    }
    
    // Initialize crop system
    initCropSystem();
    
    // ===== AVATAR & BANNER UPLOAD WITH CROP =====
    const avatarUploadBtn = document.getElementById('avatar-upload-btn');
    const avatarFileInput = document.getElementById('avatar-file-input');
    const avatarPreviewImg = document.getElementById('avatar-preview-img');
    const avatarRemoveBtn = document.getElementById('avatar-remove-btn');
    
    const bannerUploadBtn = document.getElementById('banner-upload-btn');
    const bannerFileInput = document.getElementById('banner-file-input');
    const bannerPreviewImg = document.getElementById('banner-preview-img');
    const bannerRemoveBtn = document.getElementById('banner-remove-btn');

    // Avatar upload - opens crop modal
    if (avatarUploadBtn && avatarFileInput) {
        avatarUploadBtn.addEventListener('click', () => avatarFileInput.click());
        
        avatarFileInput.addEventListener('change', function() {
            if (!this.files || !this.files[0]) return;
            openCropModal(this.files[0], 'avatar');
        });
    }
    
    // Avatar remove
    if (avatarRemoveBtn) {
        avatarRemoveBtn.addEventListener('click', function() {
            if (!confirm('Are you sure you want to remove your profile picture?')) return;
            
            this.disabled = true;
            
            const formData = new FormData();
            formData.append('action', 'mangayummy_remove_avatar');
            formData.append('nonce', window.YA_SETTINGS?.nonce || '');
            
            fetch(window.YA_SETTINGS?.ajaxurl || '/wp-admin/admin-ajax.php', {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    avatarPreviewImg.src = res.data.default_url || '/wp-content/themes/mangayummy/assets/img/default-avatar.png';
                    avatarRemoveBtn.style.display = 'none';
                    showToast('✅ Profile picture removed!', 'success');
                } else {
                    showToast('❌ ' + (res.data || 'Error'), 'error');
                }
            })
            .catch(err => {
                console.error('Avatar remove error:', err);
                showToast('❌ Error', 'error');
            })
            .finally(() => {
                this.disabled = false;
            });
        });
    }
    
    // Banner upload - opens crop modal
    if (bannerUploadBtn && bannerFileInput) {
        bannerUploadBtn.addEventListener('click', () => bannerFileInput.click());
        
        bannerFileInput.addEventListener('change', function() {
            if (!this.files || !this.files[0]) return;
            openCropModal(this.files[0], 'banner');
        });
    }
    
    // Banner remove
    if (bannerRemoveBtn) {
        bannerRemoveBtn.addEventListener('click', function() {
            if (!confirm('Are you sure you want to remove the banner?')) return;
            
            this.disabled = true;
            
            const formData = new FormData();
            formData.append('action', 'mangayummy_remove_banner');
            formData.append('nonce', window.YA_SETTINGS?.nonce || '');
            
            fetch(window.YA_SETTINGS?.ajaxurl || '/wp-admin/admin-ajax.php', {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    setDefaultBannerPreview();
                    bannerRemoveBtn.style.display = 'none';
                    showToast('✅ Banner removed!', 'success');
                } else {
                    showToast('❌ ' + (res.data || 'Error'), 'error');
                }
            })
            .catch(err => {
                console.error('Banner remove error:', err);
                showToast('❌ Error', 'error');
            })
            .finally(() => {
                this.disabled = false;
            });
        });
    }
    
    const tabButtons = document.querySelectorAll('.settings-tabs .tab-button');
    const settingsTabs = document.querySelectorAll('.settings-content .profile-tab');
    const settingsContentArea = document.querySelector('.settings-content');

    // TAB SWITCHING
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const tabName = this.getAttribute('data-tab');
            
            // Remove active from all buttons and tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            settingsTabs.forEach(tab => tab.classList.remove('active'));
            
            // Add active to clicked button and corresponding tab
            this.classList.add('active');
            const activeTab = document.getElementById(tabName + '-tab');
            if (activeTab) {
                activeTab.classList.add('active');
            }

            if (settingsContentArea) {
                settingsContentArea.scrollTop = 0;
            }
        });
    });

    // ===== GENERAL SETTINGS =====
    const usernameInput = document.getElementById('username-input');
    const usernameStatus = document.getElementById('username-status');
    const usernameMessage = document.getElementById('username-message');
    const reqLength = document.getElementById('req-length');
    const reqUnique = document.getElementById('req-unique');
    const birthdayInput = document.getElementById('birthday-input');
    const genderSelect = document.getElementById('gender-select');
    const genderOptions = document.querySelectorAll('.segmented-option[data-value]');
    const bioTextarea = document.getElementById('bio-textarea');
    const saveGeneralBtn = document.getElementById('save-all-general-btn');

    if (genderSelect && genderOptions.length) {
        genderOptions.forEach(button => {
            if (button.dataset.value === genderSelect.value) {
                button.classList.add('active');
            }
            button.addEventListener('click', () => {
                genderOptions.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
                genderSelect.value = button.dataset.value;
            });
        });
    }
    
    // Get current user ID from wrapper
    const settingsWrapper = document.querySelector('.settings-wrapper');
    const currentUserId = settingsWrapper ? (settingsWrapper.dataset.userId || 0) : 0;
    const usernameValidator = document.querySelector('.username-validator');

    // Username validator
    if (usernameInput) {
        usernameInput.addEventListener('focus', function() {
            usernameValidator?.classList.add('username-validator--active');
        });

        usernameInput.addEventListener('blur', function() {
            if (!this.value.trim()) {
                usernameValidator?.classList.remove('username-validator--active');
            }
        });

        usernameInput.addEventListener('input', function() {
            usernameValidator?.classList.add('username-validator--active');
            const username = this.value.trim();
            
            // Check length (3-20 characters)
            const hasLength = username.length >= 3 && username.length <= 20;
            const tooShort = username.length > 0 && username.length < 3;
            const tooLong = username.length > 20;
            
            // Show requirement icon (✓ or ✗)
            if (hasLength) {
                reqLength.textContent = '✓';
                reqLength.style.color = '#13667a';
            } else if (tooShort || tooLong) {
                reqLength.textContent = '✗';
                reqLength.style.color = '#e74c3c';
            } else {
                reqLength.textContent = '○';
                reqLength.style.color = '#999';
            }
            
            // Check uniqueness (AJAX) - only if length is OK
            if (hasLength) {
                const formData = new FormData();
                formData.append('action', 'check_username_available');
                formData.append('username', username);
                formData.append('current_user_id', currentUserId);
                formData.append('nonce', window.YA_SETTINGS.nonce);
                
                fetch(window.YA_SETTINGS.ajaxurl, {
                    method: 'POST',
                    body: formData
                })
                .then(r => r.json())
                .then(res => {
                    if (res.success && res.data.available) {
                        reqUnique.textContent = '✓';
                        reqUnique.style.color = '#13667a';
                    } else {
                        reqUnique.textContent = '✗';
                        reqUnique.style.color = '#e74c3c';
                    }
                })
                .catch(err => {
                    console.error('Username check error:', err);
                    reqUnique.textContent = '?';
                    reqUnique.style.color = '#999';
                });
            } else {
                // If length not ok, don't check uniqueness yet
                reqUnique.textContent = '○';
                reqUnique.style.color = '#999';
            }
        });
    }

    // Save General Settings
    if (saveGeneralBtn) {
        // Store original username to detect changes
        const originalUsername = usernameInput?.value.trim() || '';
        
        saveGeneralBtn.addEventListener('click', function() {
            const username = usernameInput?.value.trim() || '';
            const birthday = birthdayInput?.value || '';
            const gender = genderSelect?.value || '';
            const bio = bioTextarea?.value.trim() || '';

            // Only validate username if it was ACTUALLY CHANGED
            const usernameChanged = username !== originalUsername;
            const reqLengthText = reqLength?.textContent || '';
            const reqUniqueText = reqUnique?.textContent || '';
            
            // If username WAS changed, it must pass validation
            if (usernameChanged) {
                if (!username) {
                    showToast('Username cannot be empty', 'error');
                    return;
                }
                if (reqLengthText !== '✓' || reqUniqueText !== '✓') {
                    showToast('❌ Username must be 3-20 characters and available', 'error');
                    return;
                }
            }

            this.disabled = true;
            this.textContent = '⏳ Saving...';

            // Save all fields with separate AJAX calls
            const savePromises = [];
            
            // Save username only if it actually changed AND validated
            if (usernameChanged && username) {
                savePromises.push(
                    fetch(window.YA_SETTINGS.ajaxurl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            action: 'mangayummy_change_username',
                            nonce: window.YA_SETTINGS.nonce,
                            username: username
                        })
                    }).then(r => r.json())
                );
            }

            // Save birthday (no validation needed)
            if (birthday) {
                savePromises.push(
                    fetch(window.YA_SETTINGS.ajaxurl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            action: 'save_birthday',
                            nonce: window.YA_SETTINGS.nonce,
                            birthday: birthday
                        })
                    }).then(r => r.json()).catch(() => ({ success: true }))
                );
            }

            // Save gender (no validation needed)
            if (gender) {
                savePromises.push(
                    fetch(window.YA_SETTINGS.ajaxurl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            action: 'save_gender',
                            nonce: window.YA_SETTINGS.nonce,
                            gender: gender
                        })
                    }).then(r => r.json()).catch(() => ({ success: true }))
                );
            }

            // Save bio (always send, even if empty to allow deletion)
            savePromises.push(
                fetch(window.YA_SETTINGS.ajaxurl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        action: 'save_bio',
                        nonce: window.YA_SETTINGS.nonce,
                        bio: bio
                    })
                }).then(r => r.json()).catch(() => ({ success: true }))
            );

            // If no promises (all fields empty), just show success
            if (savePromises.length === 0) {
                savePromises.push(Promise.resolve({ success: true }));
            }

            Promise.all(savePromises)
                .then(responses => {
                    
                    // Check each response individually for errors
                    const errors = responses
                        .map((r, idx) => {
                            if (!r.success && r.data?.message) {
                                return r.data.message;
                            }
                            return null;
                        })
                        .filter(e => e !== null);

                    if (errors.length === 0) {
                        showToast('✅ Settings saved successfully!', 'success');
                        // Keep form values - do NOT reload
                    } else {
                        showToast('❌ ' + errors.join('; '), 'error');
                    }
                })
                .catch(error => {
                    console.error('🔧 Save all error:', error);
                    showToast('❌ Error: ' + error.message, 'error');
                })
                .finally(() => {
                    saveGeneralBtn.disabled = false;
                    saveGeneralBtn.textContent = 'Save all';
                });
        });
    }

    // ===== SECURITY SETTINGS =====
    const newEmailInput = document.getElementById('new-email-input');
    const emailPasswordConfirm = document.getElementById('email-password-confirm');
    const saveEmailBtn = document.getElementById('save-email-btn');
    
    const currentPasswordInput = document.getElementById('current-password-input');
    const newPasswordInput = document.getElementById('new-password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const savePasswordBtn = document.getElementById('save-password-btn');

    if (saveEmailBtn) {
        saveEmailBtn.addEventListener('click', function() {
            const newEmail = newEmailInput?.value.trim();
            const password = emailPasswordConfirm?.value.trim();
            
            if (!newEmail) {
                showToast('Enter the new email', 'error');
                return;
            }
            
            if (!password) {
                showToast('Enter your current password for confirmation', 'error');
                return;
            }

            saveEmailBtn.disabled = true;
            saveEmailBtn.textContent = 'Saving...';

            fetch(window.YA_SETTINGS.ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'mangayummy_change_email',
                    nonce: window.YA_SETTINGS.nonce,
                    email: newEmail,
                    password: password
                })
            })
            .then(r => r.json())
            .then(res => {
                saveEmailBtn.disabled = false;
                saveEmailBtn.textContent = 'Change Email';
                
                if (res.success) {
                    newEmailInput.value = '';
                    emailPasswordConfirm.value = '';
                    showToast('Email updated successfully!', 'success');
                    // Update displayed email
                    const emailDisplay = document.querySelector('.setting-help strong');
                    if (emailDisplay) emailDisplay.textContent = newEmail;
                } else {
                    showToast(res.data || 'Error', 'error');
                }
            })
            .catch(err => {
                saveEmailBtn.disabled = false;
                saveEmailBtn.textContent = 'Change Email';
                console.error(err);
                showToast('Connection error', 'error');
            });
        });
    }

    if (savePasswordBtn) {
        savePasswordBtn.addEventListener('click', function() {
            const currentPassword = currentPasswordInput?.value.trim();
            const newPassword = newPasswordInput?.value.trim();
            const confirmPassword = confirmPasswordInput?.value.trim();
            
            if (!currentPassword) {
                showToast('Enter your current password', 'error');
                return;
            }
            
            if (!newPassword || newPassword.length < 6) {
                showToast('New password must be at least 6 characters', 'error');
                return;
            }
            
            if (newPassword !== confirmPassword) {
                showToast('New passwords do not match', 'error');
                return;
            }

            savePasswordBtn.disabled = true;
            savePasswordBtn.textContent = 'Saving...';

            fetch(window.YA_SETTINGS.ajaxurl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'mangayummy_change_password',
                    nonce: window.YA_SETTINGS.nonce,
                    current_password: currentPassword,
                    new_password: newPassword
                })
            })
            .then(r => r.json())
            .then(res => {
                savePasswordBtn.disabled = false;
                savePasswordBtn.textContent = 'Change Password';
                
                if (res.success) {
                    currentPasswordInput.value = '';
                    newPasswordInput.value = '';
                    confirmPasswordInput.value = '';
                    showToast('Password changed successfully!', 'success');
                } else {
                    showToast(res.data || 'Error', 'error');
                }
            })
            .catch(err => {
                savePasswordBtn.disabled = false;
                savePasswordBtn.textContent = 'Change Password';
                console.error(err);
                showToast('Connection error', 'error');
            });
        });
    }

    // ===== LEVEL EFFECT SELECTOR =====
    const effectOptions = document.querySelectorAll('.level-effect-option.unlocked');
    const effectSaveStatus = document.getElementById('effect-save-status');
    
    effectOptions.forEach(option => {
        option.addEventListener('click', function() {
            const effect = this.dataset.effect;
            
            // Don't do anything if already selected
            if (this.classList.contains('selected')) return;
            
            // Remove selected from all options
            document.querySelectorAll('.level-effect-option').forEach(opt => {
                opt.classList.remove('selected');
                const badge = opt.querySelector('.effect-selected-badge');
                if (badge) badge.remove();
            });
            
            // Add selected to clicked option
            this.classList.add('selected');
            const selectedBadge = document.createElement('div');
            selectedBadge.className = 'effect-selected-badge';
            selectedBadge.textContent = '✓';
            this.appendChild(selectedBadge);
            
            // Save to server
            const formData = new FormData();
            formData.append('action', 'mangayummy_save_level_effect');
            formData.append('nonce', window.YA_SETTINGS.nonce);
            formData.append('effect', effect);
            
            fetch(window.YA_SETTINGS.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (effectSaveStatus) {
                    if (res.success) {
                        effectSaveStatus.className = 'effect-save-status success';
                        effectSaveStatus.textContent = '✓ ' + res.data.message;
                        showToast('Effect saved!', 'success');
                    } else {
                        effectSaveStatus.className = 'effect-save-status error';
                        effectSaveStatus.textContent = '✗ ' + (res.data.message || 'Error');
                        showToast(res.data.message || 'Error', 'error');
                    }
                    
                    // Hide status after 3 seconds
                    setTimeout(() => {
                        effectSaveStatus.className = 'effect-save-status';
                        effectSaveStatus.textContent = '';
                    }, 3000);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Connection error', 'error');
            });
        });
    });

    // ===== AVATAR FRAME EFFECT SELECTOR =====
    const avatarEffectOptions = document.querySelectorAll('.avatar-effect-option.unlocked');

    // ===== PREFERENCES FORM =====
    const prefsForm = document.getElementById('prefs-form');
    if (prefsForm) {
        // pre-check boxes from YA_SETTINGS.readerPrefs if provided
        // rp.explicit and rp.genres now list *blocked* items; checked boxes
        // therefore indicate genres/content the user wants hidden.
        const rp = window.YA_SETTINGS.readerPrefs || {};
        if (rp.explicit) {
            rp.explicit.forEach(e => {
                if (e === 'nsfw') {
                    const checkbox = prefsForm.querySelector(`input[name="explicit[]"][value="${e}"]`);
                    if (checkbox) checkbox.checked = true;
                }
            });
        }
        if (rp.genres) {
            rp.genres.forEach(g => {
                const checkbox = prefsForm.querySelector(`input[name="genres[]"][value="${g}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }

        prefsForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(prefsForm);
            formData.append('action', 'save_reader_prefs');
            formData.append('nonce', window.YA_SETTINGS.nonce);
            fetch(window.YA_SETTINGS.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    showToast('Preferences saved!', 'success');
                    // update global copy
                    window.YA_SETTINGS.readerPrefs = formDataToObject(formData);
                } else {
                    showToast(res.data?.message || 'Save error', 'error');
                }
            })
            .catch(err => {
                console.error('Prefs save error', err);
                showToast('Network error', 'error');
            });
        });

        function formDataToObject(fd) {
            const obj = {};
            for (const pair of fd.entries()) {
                const name = pair[0];
                const value = pair[1];
                if (name.endsWith('[]')) {
                    const key = name.slice(0, -2);
                    obj[key] = obj[key] || [];
                    obj[key].push(value);
                } else {
                    obj[name] = value;
                }
            }
            return obj;
        }
    }
    const avatarEffectSaveStatus = document.getElementById('avatar-effect-save-status');
    
    avatarEffectOptions.forEach(option => {
        option.addEventListener('click', function() {
            const effect = this.dataset.effect;
            
            // Don't do anything if already selected
            if (this.classList.contains('selected')) return;
            
            // Remove selected from all options
            document.querySelectorAll('.avatar-effect-option').forEach(opt => {
                opt.classList.remove('selected');
                const badge = opt.querySelector('.effect-selected-badge');
                if (badge) badge.remove();
            });
            
            // Add selected to clicked option
            this.classList.add('selected');
            const selectedBadge = document.createElement('div');
            selectedBadge.className = 'effect-selected-badge';
            selectedBadge.textContent = '✓';
            this.appendChild(selectedBadge);
            
            // Save to server
            const formData = new FormData();
            formData.append('action', 'mangayummy_save_avatar_effect');
            formData.append('nonce', window.YA_SETTINGS.nonce);
            formData.append('effect', effect);
            
            fetch(window.YA_SETTINGS.ajaxurl, {
                method: 'POST',
                body: formData
            })
            .then(r => r.json())
            .then(res => {
                if (avatarEffectSaveStatus) {
                    if (res.success) {
                        avatarEffectSaveStatus.className = 'effect-save-status success';
                        avatarEffectSaveStatus.textContent = '✓ ' + res.data.message;
                        showToast('Avatar frame effect saved!', 'success');
                    } else {
                        avatarEffectSaveStatus.className = 'effect-save-status error';
                        avatarEffectSaveStatus.textContent = '✗ ' + (res.data.message || 'Error');
                        showToast(res.data.message || 'Error', 'error');
                    }
                    
                    // Hide status after 3 seconds
                    setTimeout(() => {
                        avatarEffectSaveStatus.className = 'effect-save-status';
                        avatarEffectSaveStatus.textContent = '';
                    }, 3000);
                }
            })
            .catch(err => {
                console.error(err);
                showToast('Connection error', 'error');
            });
        });
    });

    // ===== TOAST NOTIFICATIONS =====
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `ya-toast ya-toast--${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 3000);
    }

    const copyDiscordVerificationBtn = document.getElementById('copy-discord-verification-link');
    if (copyDiscordVerificationBtn) {
        copyDiscordVerificationBtn.addEventListener('click', function() {
            const input = document.getElementById('discord-verification-link');
            if (!input || !input.value) return;
            input.select();
            input.setSelectionRange(0, 99999);
            navigator.clipboard.writeText(input.value).then(() => {
                showToast('Verification link copied!', 'success');
            }).catch(() => {
                showToast('Could not copy the link. Please copy it manually.', 'error');
            });
        });
    }

    const generateDiscordVerificationBtn = document.getElementById('generate-discord-verification-link');
    if (generateDiscordVerificationBtn) {
        generateDiscordVerificationBtn.addEventListener('click', async function() {
            const verificationRow = document.getElementById('discord-verification-row');
            const verificationInput = document.getElementById('discord-verification-link');
            const ajaxUrl = (window.YA_SETTINGS && window.YA_SETTINGS.ajaxurl) || (typeof ya_ajax !== 'undefined' ? ya_ajax.ajax_url : '');
            const ajaxNonce = (window.YA_SETTINGS && window.YA_SETTINGS.nonce) || (typeof ya_ajax !== 'undefined' ? ya_ajax.nonce : '');
            if (!ajaxUrl || !ajaxNonce) {
                showToast('Missing AJAX URL or nonce.', 'error');
                return;
            }

            this.disabled = true;
            this.textContent = 'Generating...';

            const formData = new FormData();
            formData.append('action', 'mangayummy_generate_discord_verification_link');
            formData.append('nonce', ajaxNonce);

            try {
                const response = await fetch(ajaxUrl, {
                    method: 'POST',
                    body: formData,
                });
                const result = await response.json();

                if (result.success) {
                    if (verificationInput) {
                        verificationInput.value = result.data.link;
                    }
                    if (verificationRow) {
                        verificationRow.style.display = 'flex';
                    }
                    this.textContent = 'Regenerate link';
                    showToast('Verification link generated!', 'success');
                } else {
                    this.textContent = 'Generate verification link';
                    showToast(result.data?.message || 'Generation error', 'error');
                }
            } catch (err) {
                this.textContent = 'Generate verification link';
                showToast('Network error', 'error');
            } finally {
                this.disabled = false;
            }
        });
    }

    // ── Discord disconnect button ─────────────────────────────────────────────
    const discordDisconnectBtn = document.getElementById('discord-disconnect-btn');
    if (discordDisconnectBtn) {
        discordDisconnectBtn.addEventListener('click', async function() {
            if (!confirm('Are you sure you want to disconnect your Discord account?')) return;

            this.disabled = true;
            this.textContent = 'Disconnecting...';

            try {
                const res = await fetch(window.YA_SETTINGS.ajaxurl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        action: 'ya_discord_disconnect',
                        nonce: this.dataset.nonce,
                    }),
                }).then(r => r.json());

                if (res.success) {
                    showToast('✅ Discord account disconnected.', 'success');
                    setTimeout(() => window.location.reload(), 800);
                } else {
                    showToast('❌ ' + (res.data?.message || 'Error'), 'error');
                    this.disabled = false;
                    this.textContent = 'Disconnect';
                }
            } catch (e) {
                showToast('❌ Connection error', 'error');
                this.disabled = false;
                this.textContent = 'Disconnect';
            }
        });
    }

    // Auto-hide Discord success message after OAuth redirect.
    const discordLinkedSuccess = document.querySelector('.discord-linked-success');
    if (discordLinkedSuccess) {
        setTimeout(() => {
            discordLinkedSuccess.style.transition = 'opacity 0.3s ease';
            discordLinkedSuccess.style.opacity = '0';
            setTimeout(() => {
                discordLinkedSuccess.remove();
            }, 300);
        }, 3000);

        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.has('discord_linked')) {
            currentUrl.searchParams.delete('discord_linked');
            window.history.replaceState({}, document.title, currentUrl.toString());
        }
    }
});
