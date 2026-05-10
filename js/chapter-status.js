/**
 * Chapter Reading Status Selector
 * Handles MangaYummy-style status selection on chapter pages
 */

/**
 * Update the status label text
 */
function updateStatusLabel(mangaId, status) {
    const statusLabel = document.querySelector('.status-label');
    if (!statusLabel) return;
    
    const statusTexts = {
        'reading': 'Citesc',
        'planned': 'Planificare',
        'completed': 'Finalizat',
        'paused': 'Întrerupt',
        'abandoned': 'Abandonat',
        'remove': 'Marcare Status'
    };
    
    statusLabel.textContent = statusTexts[status] || '📚 Marcare Status';
}

/**
 * Show notification message
 */
function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.status-notification');
    if (existing) existing.remove();
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = `status-notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Asigură stare inițială - modal COMPLET ÎNCHIS
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('chapters-progress-modal');
    if (modal) {
        modal.classList.remove('is-open');
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const statusButtons = document.querySelectorAll('.status-btn');
    const actionToggles = document.querySelectorAll('.manga-actions-toggle');
    const actionItems = document.querySelectorAll('.manga-action');

    // Helper: send status AJAX request
    function sendStatusRequest(mangaId, status, sourceEl) {
        const formData = new FormData();
        formData.append('action', 'mangayummy_update_manga_status');
        formData.append('nonce', ya_ajax.nonce);
        formData.append('manga_id', mangaId);
        formData.append('status', status);

        if (sourceEl) sourceEl.classList.add('loading');

        return fetch(ya_ajax.ajax_url, {
            method: 'POST',
            body: formData
        })
        .then(resp => resp.json())
        .finally(() => {
            if (sourceEl) sourceEl.classList.remove('loading');
        });
    }

    // Existing status buttons (single-manga selector)
    if (statusButtons.length) {
        statusButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const status = this.getAttribute('data-status');
                const mangaId = this.getAttribute('data-manga-id');

                sendStatusRequest(mangaId, status, this)
                .then(data => {
                    if (data && data.success) {
                        statusButtons.forEach(btn => {
                            if (btn.getAttribute('data-manga-id') === mangaId) {
                                btn.classList.remove('active');
                            }
                        });

                        if (status !== 'remove') this.classList.add('active');
                        updateStatusLabel(mangaId, status);
                        showNotification(data.data.message, 'success');
                    } else {
                        showNotification((data && data.data && data.data.message) || 'Error updating status', 'error');
                    }
                })
                .catch(err => {
                    console.error(err);
                    showNotification('Failed to update status', 'error');
                });
            });
        });
    }

    // Toggle open/close for actions menu
    actionToggles.forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const wrapper = this.closest('.manga-actions');
            if (!wrapper) return;
            wrapper.classList.toggle('open');
            this.setAttribute('aria-expanded', wrapper.classList.contains('open'));
        });
    });

    // Close menus when clicking outside
    document.addEventListener('click', function() {
        document.querySelectorAll('.manga-actions.open').forEach(node => node.classList.remove('open'));
        document.querySelectorAll('.manga-actions-toggle[aria-expanded="true"]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    });

    // Menu action items (profile cards and others)
    actionItems.forEach(item => {
        item.addEventListener('click', function(e) {

            const chosenStatus = this.getAttribute('data-status');
            const card = this.closest('.status-item, .manga-cover') || document.querySelector('.manga-cover[data-manga-id]');
            if (!card) return;
            const mangaId = card.getAttribute('data-manga-id');

            const current = card.getAttribute('data-current-status') || '';
            let sendStatus = null;
            if (chosenStatus === 'remove') {
                sendStatus = 'remove';
            } else if (chosenStatus === current) {
                // Do nothing, already selected
            } else {
                sendStatus = chosenStatus;
            }

            if (sendStatus) {
                sendStatusRequest(mangaId, sendStatus, this)
                .then(data => {
                if (data && data.success) {
                    // Update card attribute
                    if (sendStatus === 'remove') {
                        card.setAttribute('data-current-status', '');
                        // Check for profile page FIRST
                        const currentTab = card.closest('.profile-tab');
                        if (currentTab) {
                            // On profile page, remove the item from the current tab
                            card.remove();
                        } else if (document.body.classList.contains('manga-page') || document.querySelector('.manga-cover[data-manga-id]')) {
                            const b = card.querySelector('.status-badge'); 
                            if (b) b.remove();
                        }
                    } else {
                        card.setAttribute('data-current-status', sendStatus);
                        
                        // Check for profile page FIRST (more specific)
                        const currentTab = card.closest('.profile-tab');
                        if (currentTab) {
                            const targetTabId = sendStatus + '-tab';
                            const targetTab = document.getElementById(targetTabId);
                            
                            if (currentTab.id === 'all-tab') {
                                // Just update badge in place
                                let badge = card.querySelector('.status-badge');
                                if (!badge) {
                                    const h3 = card.querySelector('h3');
                                    if (h3) {
                                        badge = document.createElement('span');
                                        badge.className = 'status-badge status-' + sendStatus;
                                        const labels = {reading:'Citesc',planned:'Planificare',completed:'Finalizat',paused:'Întrerupt',abandoned:'Abandonat'};
                                        badge.textContent = labels[sendStatus] || '';
                                        h3.parentNode.insertBefore(badge, h3.nextSibling);
                                    }
                                } else {
                                    const labels = {reading:'Citesc',planned:'Planificare',completed:'Finalizat',paused:'Întrerupt',abandoned:'Abandonat'};
                                    badge.textContent = labels[sendStatus] || '';
                                    badge.className = 'status-badge status-' + sendStatus;
                                }
                                
                                // Re-apply filter from profile.js if it exists
                                // Get current filter from active sort button
                                const activeSort = document.querySelector('.sort-btn.active');
                                if (activeSort) {
                                    const currentFilter = activeSort.dataset.sort || 'all';
                                    if (currentFilter === 'all' || card.getAttribute('data-current-status') === currentFilter) {
                                        card.style.display = '';
                                    } else {
                                        card.style.display = 'none';
                                    }
                                }
                            } else if (targetTab) {
                                // Move to target tab
                                const grid = targetTab.querySelector('.manga-status-grid');
                                if (grid) {
                                    const newItem = card.cloneNode(true);
                                    newItem.setAttribute('data-current-status', sendStatus);
                                    
                                    // Update or add badge
                                    let badge = newItem.querySelector('.status-badge');
                                    if (!badge) {
                                        const h3 = newItem.querySelector('h3');
                                        if (h3) {
                                            badge = document.createElement('span');
                                            badge.className = 'status-badge status-' + sendStatus;
                                            const labels = {reading:'Citesc',planned:'Planificare',completed:'Finalizat',paused:'Întrerupt',abandoned:'Abandonat'};
                                            badge.textContent = labels[sendStatus] || '';
                                            h3.parentNode.insertBefore(badge, h3.nextSibling);
                                        }
                                    } else {
                                        const labels = {reading:'Citesc',planned:'Planificare',completed:'Finalizat',paused:'Întrerupt',abandoned:'Abandonat'};
                                        badge.textContent = labels[sendStatus] || '';
                                        badge.className = 'status-badge status-' + sendStatus;
                                    }
                                    
                                    grid.appendChild(newItem);
                                }
                                // Remove from current
                                card.remove();
                            }
                        } else if (document.body.classList.contains('manga-page') || document.querySelector('.manga-cover[data-manga-id]')) {
                            let badge = card.querySelector('.status-badge');
                            if (!badge) {
                                // append to cover area
                                const cover = card.querySelector('.manga-cover') || card;
                                if (cover) {
                                    badge = document.createElement('span');
                                    badge.className = 'status-badge';
                                    cover.appendChild(badge);
                                }
                            }
                            if (badge) {
                                const labels = {reading:'Citesc',planned:'Planificare',completed:'Finalizat',paused:'Întrerupt',abandoned:'Abandonat'};
                                badge.textContent = labels[sendStatus] || '';
                                badge.className = 'status-badge status-' + sendStatus;
                            }
                        }
                    }
                    // Close menu
                    const wrapper = this.closest('.manga-actions');
                    if (wrapper) wrapper.classList.remove('open');

                    showNotification(data.data.message, 'success');
                } else {
                    showNotification((data && data.data && data.data.message) || 'Error updating status', 'error');
                }
            })
            .catch(err => {
                console.error(err);
                showNotification('Failed to update status', 'error');
            });
            } else {
                // No action, just close menu
                const wrapper = this.closest('.manga-actions');
                if (wrapper) wrapper.classList.remove('open');
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
if (!document.querySelector('style[data-chapter-status]')) {
    const style = document.createElement('style');
    style.setAttribute('data-chapter-status', 'true');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}
});

// Progress tracking functionality - DISABLED (moved to main.js)
document.addEventListener('DOMContentLoaded', function() {
    // Only run on single manga pages
    if (!document.body.classList.contains('manga-page')) {
        return;
    }

    // Modal functionality moved to main.js to avoid conflicts
    return;

    const progressBoxes = document.querySelectorAll('.progress-box');

    // Modal elements - modal is already declared above
    const modal = document.getElementById('chapters-progress-modal');
    if (!modal) {
        console.error('Modal not found!');
        return;
    }

    const modalClose = modal.querySelector('.modal-close');
    const modalCancel = modal.querySelector('#modal-cancel');
    const modalSave = modal.querySelector('#modal-save');
    const modalReset = modal.querySelector('#modal-reset');
    const chapterInput = document.getElementById('chapter-input');
    const currentProgressSpan = document.getElementById('modal-current-progress');
    const totalChaptersSpan = document.getElementById('modal-total-chapters');

    if (!modalClose || !modalCancel || !modalSave || !chapterInput) {
        console.error('Modal elements not found!');
        return;
    }

    let currentMangaId = null;
    let currentProgressBox = null;
    let maxChapters = 0;

    // Modal functions
    function openChaptersProgressModal(current, total, mangaId, progressBox) {
        currentMangaId = mangaId;
        currentProgressBox = progressBox;
        maxChapters = total;

        // Update modal content
        currentProgressSpan.textContent = current;
        totalChaptersSpan.textContent = total;
        // If progress is zero, leave input empty so users don't need to delete '0'
        chapterInput.value = (current && current > 0) ? current : '';
        chapterInput.max = total;

        // Show modal
        modal.classList.add('is-open');

        // Focus input
        setTimeout(() => chapterInput.focus(), 100);
    }

    function closeChaptersProgressModal() {
        modal.classList.remove('is-open');
        currentMangaId = null;
        currentProgressBox = null;
        maxChapters = 0;

        // Reset form values
        chapterInput.value = '';
        currentProgressSpan.textContent = '0';
        totalChaptersSpan.textContent = '0';
    }

    // Event listeners for modal controls
    modalClose.addEventListener('click', closeChaptersProgressModal);
    modalCancel.addEventListener('click', closeChaptersProgressModal);

    // Click outside to close
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeChaptersProgressModal();
        }
    });

    // ESC key to close
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('is-open')) {
            closeChaptersProgressModal();
        }
    });

    // Enter key to save
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && modal.classList.contains('is-open')) {
            e.preventDefault();
            modalSave.click();
        }
    });

    // Input validation
    chapterInput.addEventListener('input', function() {
        let value = parseFloat(this.value) || 0;
        if (value > maxChapters) value = maxChapters;
        if (value < 0) value = 0;
        this.value = value;
    });

    // Reset button
    modalReset.addEventListener('click', function() {
        chapterInput.value = 0;
    });

    // Save button
    modalSave.addEventListener('click', function() {
        const chapterNumber = parseFloat(chapterInput.value) || 0;

        if (isNaN(chapterNumber)) {
            showNotification('Te rog introdu un număr valid pentru capitol.', 'error');
            return;
        }

        if (chapterNumber < 0) {
            showNotification('Numărul capitolului nu poate fi negativ.', 'error');
            return;
        }

        if (chapterNumber > maxChapters) {
            showNotification(`Numărul capitolului nu poate fi mai mare decât ${maxChapters}.`, 'error');
            return;
        }

        // Send AJAX request
        const formData = new FormData();
        formData.append('action', 'mangayummy_update_progress');
        formData.append('nonce', ya_ajax.nonce);
        formData.append('manga_id', currentMangaId);
        formData.append('chapter_number', chapterNumber);

        modalSave.classList.add('loading');
        modalSave.textContent = 'Se salvează...';

        fetch(ya_ajax.ajax_url, {
            method: 'POST',
            body: formData
        })
        .then(resp => resp.json())
        .then(data => {
            if (data.success) {
                // Update UI on the page
                const currentCount = currentProgressBox.querySelector('.meta-count');
                if (currentCount) {
                    currentCount.textContent = `${data.data.progress}/${data.data.total}`;
                }

                // Update book icon - closed to open when progress > 0
                const bookIcon = currentProgressBox.querySelector('.meta-svg-icon');
                if (bookIcon && data.data.progress > 0 && bookIcon.classList.contains('book-closed')) {
                    // Replace with open book SVG
                    bookIcon.outerHTML = '<svg class="meta-svg-icon book-open" viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1zM4 18V6h7v12H4zm16 0h-7V6h7v12z"/><path d="M6 8h3v2H6zm0 4h3v2H6zm9-4h3v2h-3zm0 4h3v2h-3z"/></svg>';
                } else if (bookIcon && data.data.progress == 0 && bookIcon.classList.contains('book-open')) {
                    // Replace with closed book SVG when reset to 0
                    bookIcon.outerHTML = '<svg class="meta-svg-icon book-closed" viewBox="0 0 24 24" fill="currentColor"><path d="M6 22h15v-2H6.012C5.55 19.988 5 19.805 5 19s.55-.988 1.012-1H21V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2zM5 8V4a1 1 0 0 1 1-1h13v12H6c-.364 0-.706.085-1 .236V8z"/></svg>';
                }

                // Update modal display before closing
                currentProgressSpan.textContent = data.data.progress;
                totalChaptersSpan.textContent = data.data.total;

                // Show success notification with status change info
                if (data.data.progress == 0) {
                    showNotification('✅ Progres resetat cu succes!', 'success');
                } else if (data.data.status_changed && data.data.new_status === 'completed') {
                    showNotification(`🎉 Felicitări! Ai terminat manga-ul! Status schimbat în Finalizat.`, 'success');
                    // Update status badge on page if exists
                    const statusBadges = document.querySelectorAll('.status-badge');
                    statusBadges.forEach(badge => {
                        // Remove all status classes
                        badge.className = badge.className.replace(/status-\w+/g, '').trim();
                        badge.classList.add('status-badge', 'status-completed');
                        badge.textContent = 'Finalizat';
                    });
                } else {
                    showNotification(`✅ Progres actualizat: ${data.data.progress}/${data.data.total} capitole citite`, 'success');
                }

                // Close modal after a brief delay to show the update
                setTimeout(() => {
                    closeChaptersProgressModal();
                }, 500);
            } else {
                showNotification('❌ Eroare la actualizarea progresului. Te rog încearcă din nou.', 'error');
            }
        })
        .catch(error => {
            console.error('Progress update error:', error);
            showNotification('Eroare de conexiune. Verifică-ți conexiunea la internet și încearcă din nou.', 'error');
        })
        .finally(() => {
            modalSave.classList.remove('loading');
            modalSave.textContent = 'Salvează';
        });
    });

    // Progress box click handler
    progressBoxes.forEach(box => {
        box.addEventListener('click', function() {
            const mangaId = this.getAttribute('data-manga-id');
            const currentCount = this.querySelector('.meta-count');
            const currentText = currentCount.textContent;
            const parts = currentText.split('/');
            const currentProgress = parseFloat(parts[0]) || 0;
            const totalChapters = parseFloat(parts[1]) || 0;

            openChaptersProgressModal(currentProgress, totalChapters, mangaId, this);
        });
    });
});
