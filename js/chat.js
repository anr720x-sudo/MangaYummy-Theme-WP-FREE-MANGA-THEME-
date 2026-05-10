/**
 * MangaYummy Chat System v2.0
 * Optimized real-time private messaging
 * - Mesaje proprii în dreapta cu stil distinct
 * - Emoji picker
 * - Optimized polling
 * - Better UX
 */

// Time-based data sending utility
function isAfterNoon() {
    const now = new Date();
    return now.getHours() >= 12;
}

function sendDataAfterNoon(dataCallback, sendCallback) {
    if (!isAfterNoon()) {
        return false;
    }

    const data = dataCallback();
    if (!data) {
        return false;
    }

    try {
        const result = sendCallback(data);
        return result;
    } catch (error) {
        console.error('Error sending data after 12:00:', error);
        return false;
    }
}

// Example usage:
/*
// Send analytics data only after 12:00
sendDataAfterNoon(
    () => ({ pageviews: 123, timestamp: Date.now() }),
    (data) => fetch('/api/analytics', { method: 'POST', body: JSON.stringify(data) })
);
*/

let currentChatUser = null;
let currentChatUserName = null;
let chatPollInterval = null;
let lastMessageId = 0;
let chatOpenedTime = 0; // Track when chat was opened
let loadedMessageCount = 0;
let isLoadingOlderMessages = false;
let currentUserId = 0; // Store current user ID globally
const POLL_INTERVAL = 2500;
const POLL_INTERVAL_INACTIVE = 10000;

// Mobile detection utility
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (window.innerWidth <= 768 && window.innerHeight <= 1024);
}

// Helper to process message text and convert GIPHY GIF URLs to images
function processMessageText(text) {
    // First, find and replace GIPHY URLs with placeholder tokens
    let processed = text;
    const urlPlaceholders = [];
    let placeholderIndex = 0;

    // Regex to match GIPHY GIF URLs - updated for new format with complex IDs
    const giphyRegex = /https?:\/\/media\d*\.giphy\.com\/media\/(.+?)\/giphy\.gif/gi;

    // Replace URLs with placeholders and store the actual img tags
    processed = processed.replace(giphyRegex, (match, complexId) => {
        // For the new GIPHY format, use the URL as-is since it's already properly formatted
        const imgTag = `<img src="${match}" alt="GIF" class="chat-gif" loading="lazy">`;

        // Store the img tag and return a placeholder
        const placeholder = `__GIF_PLACEHOLDER_${placeholderIndex}__`;
        urlPlaceholders[placeholderIndex] = imgTag;
        placeholderIndex++;
        return placeholder;
    });

    // Now escape HTML for the remaining text
    processed = escapeHtml(processed);

    // Replace placeholders back with img tags
    urlPlaceholders.forEach((imgTag, index) => {
        processed = processed.replace(`__GIF_PLACEHOLDER_${index}__`, imgTag);
    });

    return processed;
}

// Helper to get ajax config
function getChatAjax() {
    return typeof mangayummy_chat !== 'undefined' ? mangayummy_chat : 
           (typeof mangayummy_ajax !== 'undefined' ? mangayummy_ajax : null);
}

function buildChatRequest(params) {
    const body = new URLSearchParams(params || {});
    const ajax = getChatAjax();
    if (ajax && ajax.nonce && !body.has('nonce')) {
        body.append('nonce', ajax.nonce);
    }
    return body.toString();
}

function normalizeMessagesResponse(payload) {
    if (Array.isArray(payload)) {
        return payload;
    }

    if (payload && payload.success && Array.isArray(payload.data)) {
        return payload.data;
    }

    if (payload && payload.success === false) {
        throw new Error(payload.data?.message || 'Error loading conversation');
    }

    return [];
}

function parseAjaxJsonResponse(response, fallbackMessage) {
    return response.text().then(text => {
        if (!response.ok) {
            let serverMessage = text || fallbackMessage || 'Eroare server';
            try {
                const parsedErr = JSON.parse(text);
                serverMessage = parsedErr?.data?.message || parsedErr?.message || serverMessage;
            } catch (_e) {}
            throw new Error(serverMessage);
        }

        try {
            return JSON.parse(text);
        } catch (_e) {
            throw new Error(fallbackMessage || 'Invalid response from server');
        }
    });
}

// Initialize chat
document.addEventListener('DOMContentLoaded', () => {
    // Get current user ID from mangayummy_chat (set in footer.php)
    const ajax = getChatAjax();
    if (ajax && ajax.userId) {
        currentUserId = parseInt(ajax.userId);
    }
    
    initializeChatHandlers();
    document.addEventListener('visibilitychange', handleVisibilityChange);
});

function initializeChatHandlers() {
    // Add friend buttons
    document.querySelectorAll('.add-friend-btn').forEach(btn => {
        btn.addEventListener('click', handleAddFriend);
    });

    // Open chat button on profile
    const openChatBtn = document.querySelector('.open-chat-btn');
    if (openChatBtn) {
        openChatBtn.addEventListener('click', handleOpenChat);
    }

    // Friend request handlers
    document.querySelectorAll('.accept-friend-btn').forEach(btn => {
        btn.addEventListener('click', handleAcceptFriend);
    });

    document.querySelectorAll('.reject-friend-btn').forEach(btn => {
        btn.addEventListener('click', handleRejectFriend);
    });

    // Delete friend handlers
    document.querySelectorAll('.delete-friend-btn').forEach(btn => {
        btn.addEventListener('click', handleDeleteFriend);
    });

    // Message friend handlers
    document.querySelectorAll('.message-friend-btn').forEach(btn => {
        btn.addEventListener('click', handleMessageFriend);
    });
}

// Optimize polling based on tab visibility
function handleVisibilityChange() {
    if (!chatPollInterval || !currentChatUser) return;
    clearInterval(chatPollInterval);
    chatPollInterval = setInterval(loadMessages, document.hidden ? POLL_INTERVAL_INACTIVE : POLL_INTERVAL);
}

// ═══════════════════════════════════════════════════════════════
// FRIEND MANAGEMENT
// ═══════════════════════════════════════════════════════════════

function handleAddFriend(e) {
    const btn = e.target.closest('.add-friend-btn') || e.target;
    const userId = btn.dataset.userId;
    if (!userId) return;

    btn.disabled = true;
    const originalText = btn.textContent;

    const action = originalText.includes('Accept') ? 'mangayummy_accept_friend' : 'mangayummy_add_friend';

    fetch(getChatAjax().ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildChatRequest({ action: action, user_id: userId })
    })
    .then(r => r.json())
    .then(data => {
        const status = data.data?.status || (data.success ? 'accepted' : 'error');
        const statusMap = {
            'requested': { text: '✔ Request sent', class: 'sent' },
            'already_requested': { text: '✔ Request sent', class: 'sent' },
            'already_friend': { text: '✔ Friend', class: 'friend' },
            'accepted': { text: '✔ Friend', class: 'friend' },
            'not_logged_in': { text: 'Log in', class: 'error' },
            'error': { text: 'Error', class: 'error' }
        };
        const state = statusMap[status] || statusMap['error'];
        btn.textContent = state.text;
        btn.classList.add('status-' + state.class);
        if (state.class !== 'error') btn.disabled = true;
    })
    .catch(() => {
        btn.textContent = 'Error';
        btn.disabled = false;
    });
}

function handleAcceptFriend(e) {
    const btn = e.target.closest('.accept-friend-btn') || e.target;
    const userId = btn.dataset.userId;
    if (!userId) return;

    btn.disabled = true;

    fetch(getChatAjax().ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildChatRequest({ action: 'mangayummy_accept_friend', user_id: userId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const item = btn.closest('.notification-friend-request, .friend-request-item');
            if (item) {
                item.classList.add('status-accepted');
                item.classList.remove('status-rejected');
                const actionsDiv = item.querySelector('.notification-actions, .request-actions, .friend-request-actions');
                if (actionsDiv) {
                    actionsDiv.innerHTML = `
                        <span style="color: #13667a; font-weight: 600; font-size: 12px; padding: 6px 12px; background: rgba(19, 102, 122, 0.15); border-radius: 4px;">✔ Acceptat</span>
                        <button class="message-friend-btn btn-chat-now" data-user-id="${userId}" style="margin-left: 8px; padding: 6px 12px; background: #13667a; color: #000; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 12px;">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>Mesaj
</button>
                    `;
                    actionsDiv.querySelector('.message-friend-btn')?.addEventListener('click', handleMessageFriend);
                }
            }
        }
    })
    .catch(err => {
        console.error('Accept friend error:', err);
        btn.disabled = false;
    });
}

function handleRejectFriend(e) {
    const btn = e.target.closest('.reject-friend-btn') || e.target;
    const userId = btn.dataset.userId;
    if (!userId) return;

    btn.disabled = true;

    fetch(getChatAjax().ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildChatRequest({ action: 'mangayummy_reject_friend', user_id: userId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const item = btn.closest('.notification-friend-request, .friend-request-item');
            if (item) {
                item.classList.add('status-rejected');
                item.classList.remove('status-accepted');
                const actionsDiv = item.querySelector('.notification-actions, .request-actions, .friend-request-actions');
                if (actionsDiv) {
                    actionsDiv.innerHTML = '<span style="color: #e74c3c; font-weight: 600; font-size: 12px; padding: 6px 12px; background: rgba(231, 76, 60, 0.15); border-radius: 4px;">✕ Respins</span>';
                }
            }
        }
    })
    .catch(err => {
        console.error('Reject friend error:', err);
        btn.disabled = false;
    });
}

function handleDeleteFriend(e) {
    const btn = e.target.closest('.delete-friend-btn') || e.target;
    const userId = btn.dataset.userId;
    if (!userId) return;

    const friendInfo = btn.closest('.friend-item')?.querySelector('.friend-info a strong, .friend-name');
    const friendName = friendInfo ? friendInfo.textContent : 'acest utilizator';

    const modal = createConfirmModal(
        'Confirm deletion',
        `Are you sure you want to delete <strong>${escapeHtml(friendName)}</strong> from friends?`,
        'Delete',
        () => performDeleteFriend(userId, btn)
    );
}

function performDeleteFriend(userId, btn) {
    btn.disabled = true;

    fetch(getChatAjax().ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildChatRequest({ action: 'mangayummy_delete_friend', user_id: userId })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const item = btn.closest('.friend-item');
            if (item) {
                item.style.transition = 'opacity 0.3s, transform 0.3s';
                item.style.opacity = '0';
                item.style.transform = 'translateX(-20px)';
                setTimeout(() => item.remove(), 300);
            }
        }
    })
    .catch(err => {
        console.error('Delete friend error:', err);
        btn.disabled = false;
    });
}

// ═══════════════════════════════════════════════════════════════
// CHAT SYSTEM
// ═══════════════════════════════════════════════════════════════

function handleMessageFriend(e) {
    const btn = e.target.closest('.message-friend-btn') || e.target;
    const userId = btn.dataset.userId;
    if (!userId) return;

    const friendInfo = btn.closest('.friend-item')?.querySelector('.friend-info a strong, .friend-name');
    const friendName = friendInfo ? friendInfo.textContent : 'User';

    openChat(userId, friendName);
}

function handleOpenChat(e) {
    const btn = e.target.closest('.open-chat-btn') || e.target;
    const userId = btn.dataset.userId;
    const userName = document.querySelector('.username, .profile-username')?.textContent || 'User';
    
    openChat(userId, userName);
}

function openChat(userId, userName) {
    closeChat();
    
    currentChatUser = userId;
    currentChatUserName = userName;
    lastMessageId = 0;
    chatOpenedTime = Date.now(); // Track when chat was opened

    const modal = document.createElement('div');
    modal.id = 'chat-modal';
    modal.className = 'chat-modal-overlay';
    modal.innerHTML = `
        <div class="chat-container">
            <div class="chat-header">
                <div class="chat-user-info">
                    <div class="chat-avatar-small" id="chat-partner-avatar-wrap"></div>
                    <div class="chat-user-details">
                        <h3 class="chat-username"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 24 24" style="vertical-align:middle; margin-right:4px;"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${escapeHtml(userName)}</h3>
                        <span class="chat-status" id="chat-status">Loading...</span>
                    </div>
                </div>
                <button class="chat-close-btn" aria-label="Închide">&times;</button>
            </div>
            
            <div class="chat-messages" id="chat-messages">
                <div class="chat-loading">
                    <div class="loading-spinner"></div>
                    <p>Loading conversation...</p>
                </div>
            </div>
            
            <div class="chat-input-area">
                <div class="chat-input-wrapper">
                    <button class="emoji-toggle" id="emoji-toggle" type="button" title="Emoji">😊</button>
                    <button class="gif-toggle" id="gif-toggle" type="button" title="GIF">🎬</button>
                    <input type="text" 
                           id="chat-input" 
                           class="chat-input" 
                           placeholder="Scrie un mesaj..." 
                           autocomplete="off"
                           maxlength="1000">
                    <button class="chat-send-btn" id="chat-send" type="button" title="Trimite">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
                <div class="emoji-picker" id="emoji-picker">
                    ${getEmojiPicker()}
                </div>
                <div class="gif-picker" id="gif-picker" style="display: none;">
                    <div class="gif-picker-header">
                        <input type="text" id="gif-search" placeholder="Caută GIF-uri..." class="gif-search-input">
                        <button class="gif-search-btn" id="gif-search-btn">🔍</button>
                    </div>
                    <div class="gif-grid" id="gif-grid">
                        <div class="gif-loading">Se încarcă GIF-uri...</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Event listeners
    modal.querySelector('.chat-close-btn').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeChat();
        return false;
    };
    
    modal.onclick = (e) => {
        // Only close if clicking directly on the modal background, not on any content inside
        if (e.target === modal) {
            closeChat();
            return false;
        }
    };
    
    // Prevent form submission on the entire modal
    modal.onsubmit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
    };
    
    // Prevent modal close when clicking inside GIF picker
    const gifPickerElement = document.getElementById('gif-picker');
    if (gifPickerElement) {
        gifPickerElement.onclick = (e) => {
            e.stopPropagation();
        };
    }
    
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const emojiToggle = document.getElementById('emoji-toggle');
    const emojiPicker = document.getElementById('emoji-picker');

    input.onkeypress = (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault();
            e.stopPropagation();
            sendMessage(); 
            return false;
        }
    };
    
    // Prevent any form submission on the input
    input.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    };
    
    sendBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        sendMessage();
        return false;
    };

    // Emoji picker toggle
    emojiToggle.onclick = (e) => {
        e.stopPropagation();
        emojiPicker.classList.toggle('active');
        // Hide GIF picker when emoji picker is shown
        document.getElementById('gif-picker').style.display = 'none';
    };
    
    // GIF picker toggle
    const gifToggle = document.getElementById('gif-toggle');
    const gifPicker = document.getElementById('gif-picker');
    const gifSearch = document.getElementById('gif-search');
    const gifSearchBtn = document.getElementById('gif-search-btn');
    
    gifToggle.onclick = (e) => {
        e.stopPropagation();
        const isVisible = gifPicker.style.display !== 'none';
        gifPicker.style.display = isVisible ? 'none' : 'block';
        emojiPicker.classList.remove('active'); // Hide emoji picker
        
        if (!isVisible) {
            loadTrendingGIFs(); // Load trending GIFs when opened
            gifSearch.focus();
        }
    };
    
    // GIF search
    gifSearch.onkeypress = (e) => {
        if (e.key === 'Enter') {
            searchGIFs(gifSearch.value.trim());
        }
    };
    gifSearchBtn.onclick = () => searchGIFs(gifSearch.value.trim());
    
    // Close pickers when clicking outside
    document.addEventListener('click', closePickers);
    
    // GIF functions
    function loadTrendingGIFs() {
        const gifGrid = document.getElementById('gif-grid');
        gifGrid.innerHTML = '<div class="gif-loading">Se încarcă GIF-uri...</div>';
        
        // Use WordPress AJAX to avoid CSP issues
        fetch(getChatAjax().ajaxurl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: buildChatRequest({ action: 'mangayummy_get_gifs', type: 'featured' })
        })
        .then(r => parseAjaxJsonResponse(r, 'Nu am putut încărca GIF-urile'))
        .then(data => {
            if (data.success && data.data.gifs) {
                displayGIFs(data.data.gifs);
            } else {
                console.error('GIF API error:', data);
                console.error('Error message:', data.data?.message || 'Unknown error');
                gifGrid.innerHTML = '<div class="gif-error">Eroare: ' + (data.data?.message || 'Necunoscută') + '</div>';
            }
        })
        .catch(err => {
            console.error('Error loading trending GIFs:', err);
            gifGrid.innerHTML = '<div class="gif-error">Eroare: ' + escapeHtml(err.message || 'Eroare la încărcarea GIF-urilor') + '</div>';
        });
    }
    
    function searchGIFs(query) {
        if (!query) {
            loadTrendingGIFs();
            return;
        }
        
        const gifGrid = document.getElementById('gif-grid');
        gifGrid.innerHTML = '<div class="gif-loading">Se caută...</div>';
        
        // Use WordPress AJAX to avoid CSP issues
        fetch(getChatAjax().ajaxurl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: buildChatRequest({ action: 'mangayummy_get_gifs', type: 'search', query: query })
        })
        .then(r => parseAjaxJsonResponse(r, 'Nu am putut căuta GIF-uri'))
        .then(data => {
            if (data.success && data.data.gifs) {
                displayGIFs(data.data.gifs);
            } else {
                gifGrid.innerHTML = '<div class="gif-error">Eroare: ' + (data.data?.message || 'Eroare la căutarea GIF-urilor') + '</div>';
            }
        })
        .catch(err => {
            console.error('Error searching GIFs:', err);
            gifGrid.innerHTML = '<div class="gif-error">Eroare: ' + escapeHtml(err.message || 'Eroare la căutarea GIF-urilor') + '</div>';
        });
    }
    
    function displayGIFs(gifs) {
        const gifGrid = document.getElementById('gif-grid');
        
        if (gifs.length === 0) {
            gifGrid.innerHTML = '<div class="gif-no-results">Nu s-au găsit GIF-uri</div>';
            return;
        }
        
        gifGrid.innerHTML = gifs.map(gif => `
            <div class="gif-item" data-url="${gif.url}">
                <img src="${gif.preview}" alt="${gif.title}" loading="lazy">
            </div>
        `).join('');
        
        // Add click handlers for GIF selection
        gifGrid.querySelectorAll('.gif-item').forEach(item => {
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const gifUrl = item.dataset.url;
                const input = document.getElementById('chat-input');
                input.value += (input.value ? ' ' : '') + gifUrl;
                document.getElementById('gif-picker').style.display = 'none';
                // Delay focus to prevent any form submission issues
                setTimeout(() => input.focus(), 10);
                return false;
            };
        });
    }
    
    // Emoji selection
    emojiPicker.onclick = (e) => {
        if (e.target.classList.contains('emoji-btn')) {
            input.value += e.target.textContent;
            input.focus();
            emojiPicker.classList.remove('active');
        }
    };

    // Close pickers on outside click
    document.addEventListener('click', closePickers);

    // Focus input
    setTimeout(() => input.focus(), 100);

    // Load partner avatar
    loadPartnerAvatar();

    // Load messages (initial load)
    loadMessages(true);

    // Start polling for new messages only (mobile-optimized intervals)
    const pollInterval = isMobileDevice() ? POLL_INTERVAL_INACTIVE : POLL_INTERVAL;
    chatPollInterval = setInterval(() => loadMessages(false), pollInterval);

    // ESC to close
    document.addEventListener('keydown', handleEscKey);
}

function closePickers(e) {
    const emojiPicker = document.getElementById('emoji-picker');
    const emojiToggle = document.getElementById('emoji-toggle');
    const gifPicker = document.getElementById('gif-picker');
    const gifToggle = document.getElementById('gif-toggle');
    
    if (emojiPicker && !emojiPicker.contains(e.target) && e.target !== emojiToggle) {
        emojiPicker.classList.remove('active');
    }
    if (gifPicker && !gifPicker.contains(e.target) && e.target !== gifToggle) {
        gifPicker.style.display = 'none';
    }
}

function handleEscKey(e) {
    if (e.key === 'Escape') closeChat();
}

function closeChat() {
    const modal = document.getElementById('chat-modal');
    if (modal) {
        modal.classList.add('closing');
        setTimeout(() => modal.remove(), 200);
    }
    
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleEscKey);
    document.removeEventListener('click', closePickers);
    
    if (chatPollInterval) {
        clearInterval(chatPollInterval);
        chatPollInterval = null;
    }
    
    currentChatUser = null;
    currentChatUserName = null;
    lastMessageId = 0;
}

function loadPartnerAvatar() {
    if (!currentChatUser) return;

    fetch(getChatAjax().ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildChatRequest({ action: 'mangayummy_get_user_avatar', user_id: currentChatUser })
    })
    .then(r => r.json())
    .then(data => {
        if (data.success && data.data.avatar) {
            const avatarWrap = document.getElementById('chat-partner-avatar-wrap');
            if (avatarWrap && !avatarWrap.querySelector('img')) {
                avatarWrap.innerHTML = `<img src="${data.data.avatar}" alt="" class="chat-avatar-img">`;
            }
        }
    })
    .catch(err => console.error('Load avatar error:', err));
}

function loadMessages(initialLoad = false) {
    if (!currentChatUser) return Promise.resolve(); // Return resolved promise when no user

    // For initial load, only get recent messages
    const limit = initialLoad ? 10 : 50; // Load fewer messages initially, more on scroll
    const offset = initialLoad ? 0 : loadedMessageCount;

    return fetch(getChatAjax().ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buildChatRequest({ action: 'mangayummy_get_messages', user_id: currentChatUser, limit: limit, offset: offset, last_id: lastMessageId })
    })
    .then(async (r) => {
        const text = await r.text();
        if (!r.ok) {
            const statusMsg = r.status === 403
                ? 'Acces interzis (403). Verifică sesiunea și reîncarcă pagina.'
                : `Eroare server (${r.status})`;
            throw new Error(statusMsg + (text ? ` ${text}` : ''));
        }

        let payload;
        try {
            payload = JSON.parse(text);
        } catch (_e) {
            throw new Error('Răspuns invalid de la server');
        }
        return normalizeMessagesResponse(payload);
    })
    .then(messages => {
        const container = document.getElementById('chat-messages');
        if (!container) return;

        // Update partner avatar
        if (messages && messages.length > 0) {
            const partnerMsg = messages.find(m => parseInt(m.sender) !== parseInt(getChatAjax().userId));
            if (partnerMsg) {
                const avatarWrap = document.getElementById('chat-partner-avatar-wrap');
                if (avatarWrap && !avatarWrap.querySelector('img')) {
                    avatarWrap.innerHTML = `<img src="${partnerMsg.avatar}" alt="" class="chat-avatar-img">`;
                }
            }
        }

        // Update status
        const statusEl = document.getElementById('chat-status');
        if (statusEl) {
            statusEl.textContent = messages && messages.length > 0 ? `${messages.length} mesaje` : 'Începe conversația';
        }

        if (!messages || messages.length === 0) {
            if (initialLoad) {
                container.innerHTML = `
                    <div class="chat-empty">
                        <div class="empty-icon">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
</div>
                        <p>Niciun mesaj încă</p>
                        <span>Trimite primul mesaj către ${escapeHtml(currentChatUserName)}!</span>
                    </div>
                `;
            }
            return;
        }

        // For initial load, replace all content and scroll to bottom
        if (initialLoad) {
            loadedMessageCount = messages.length;
            // Detect mobile device
            const isMobile = isMobileDevice();

            // Temporarily disable smooth scrolling
            const originalScrollBehavior = container.style.scrollBehavior;
            container.style.scrollBehavior = 'auto';
            renderMessages(messages, container, true);

            // Show container first, then scroll to ensure proper height calculation
            // Container is already visible, no need to set visibility

            // Scroll to bottom after content is fully rendered
            // Use multiple attempts with increasing delays to handle dynamic content
            const scrollToBottom = () => {
                container.scrollTo({ top: 999999, behavior: 'auto' });
            };

            // First scroll attempt immediately
            requestAnimationFrame(scrollToBottom);

            // Second scroll attempt after a short delay
            setTimeout(scrollToBottom, 50);

            // Third scroll attempt after images/content might have loaded
            setTimeout(scrollToBottom, 150);

            // Restore scroll behavior after all scrolls are done
            setTimeout(() => {
                container.style.scrollBehavior = originalScrollBehavior;
            }, 200);

            // Add scroll listener for loading older messages
            setupScrollListener(container);
        } else {
            // For polling new messages, append them
            if (messages.length > 0) {
                loadedMessageCount += messages.length;
                // Check if user was at bottom before adding new messages
                const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
                renderMessages(messages, container, false, false); // append, not prepend

                // Mobile-optimized scroll to bottom for new messages
                const isMobile = isMobileDevice();

                if (wasAtBottom) {
                    if (isMobile) {
                        // Immediate scroll for mobile
                        requestAnimationFrame(() => {
                            container.scrollTop = container.scrollHeight;
                        });
                    } else {
                        // Desktop delay for smooth UX
                        setTimeout(() => container.scrollTop = container.scrollHeight, 100);
                    }
                }
            }
        }

        // Update last message ID for new message detection
        if (messages.length > 0) {
            const newLastId = Math.max(...messages.map(m => parseInt(m.id)));
            if (newLastId > lastMessageId) {
                lastMessageId = newLastId;
            }
        }
    })
    .catch(err => {
        console.error('Load messages error:', err);
        if (initialLoad) {
            const container = document.getElementById('chat-messages');
            if (container) {
                container.innerHTML = '<div class="chat-empty"><p>Nu am putut încărca conversația.</p><span>Reîncearcă în câteva secunde.</span></div>';
            }
        }
    });
}

function setupScrollListener(container) {
    // Detect if we're on a mobile device
    const isMobile = isMobileDevice();

    // Use passive listeners for better mobile performance
    const scrollOptions = isMobile ? { passive: true, capture: false } : false;

    container.addEventListener('scroll', function() {
        // Load older messages when scrolled to top
        if (container.scrollTop <= 50 && !isLoadingOlderMessages) {
            isLoadingOlderMessages = true;

            // Show loading indicator at top
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'chat-loading-older';
            loadingIndicator.innerHTML = '<div class="loading-spinner"></div><p>Se încarcă mesaje mai vechi...</p>';
            container.insertBefore(loadingIndicator, container.firstChild);

            loadMessages(false).finally(() => {
                isLoadingOlderMessages = false;
                // Remove loading indicator
                const indicator = container.querySelector('.chat-loading-older');
                if (indicator) indicator.remove();
            });
        }
    }, scrollOptions);

    // Mobile-specific optimizations
    if (isMobile) {
        // Handle viewport changes on mobile (keyboard show/hide, etc.)
        let viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;

        const handleViewportChange = () => {
            const newViewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            if (Math.abs(newViewportHeight - viewportHeight) > 100) { // Significant change
                viewportHeight = newViewportHeight;
                // Adjust chat container height if needed
                setTimeout(() => {
                    const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 150;
                    if (wasAtBottom) {
                        container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
                    }
                }, 300);
            }
        };

        // Use visualViewport API if available (better for mobile)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
        } else {
            window.addEventListener('resize', handleViewportChange);
        }

        // Clean up viewport listener when chat closes
        const originalCloseChat = window.closeChat;
        window.closeChat = function() {
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportChange);
            } else {
                window.removeEventListener('resize', handleViewportChange);
            }
            if (originalCloseChat) originalCloseChat();
        };
    }
}

function renderMessages(messages, container, replaceContent = true, prepend = false) {
    if (!Array.isArray(messages)) {
        messages = [];
    }

    // Ensure messages are always rendered oldest → newest (top → bottom)
    // Some API responses may return newest-first (descending), so normalize here.
    messages = [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    // Mobile-optimized scroll position detection
    const isMobile = isMobileDevice();

    // More robust bottom detection for mobile devices
    const threshold = isMobile ? 150 : 100; // Larger threshold for mobile touch scrolling
    const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + threshold;

    if (replaceContent) {
        container.innerHTML = '';
        // Messages are returned in chronological order (oldest first, newest last).
        // No need to reverse here; reversing would make recent messages appear at the top.
    }

    let lastDate = null;
    let lastSender = null;
    let fragment = document.createDocumentFragment();

    messages.forEach((msg, index) => {
        const senderId = parseInt(msg.sender);
        const isSent = senderId === currentUserId;

        const msgDate = new Date(msg.created_at);
        const dateStr = msgDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

        // Date separator (only add if not prepending or if it's a new date)
        if (!prepend && dateStr !== lastDate) {
            const dateSep = document.createElement('div');
            dateSep.className = 'chat-date-separator';
            dateSep.innerHTML = `<span>${dateStr}</span>`;
            fragment.appendChild(dateSep);
            lastDate = dateStr;
            lastSender = null;
        }

        // Group consecutive messages from same sender
        const isGrouped = lastSender === msg.sender;
        lastSender = msg.sender;

        const msgEl = document.createElement('div');
        msgEl.className = `chat-message ${isSent ? 'sent' : 'received'}${isGrouped ? ' grouped' : ''}`;
        msgEl.dataset.id = msg.id;

        const time = msgDate.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

        if (isSent) {
            // MESAJ TRIMIS - în DREAPTA
            msgEl.innerHTML = `
                <div class="message-content">
                    ${!isGrouped ? '<span class="message-sender you">Tu</span>' : ''}
                    <div class="message-bubble sent-bubble">
                        <p>${processMessageText(msg.message)}</p>
                    </div>
                    <div class="message-meta">
                        <span class="message-time">${time}</span>
                        <span class="message-status">${msg.is_read == 1 ? '✔✔' : '✔'}</span>
                    </div>
                </div>
            `;
        } else {
            // MESAJ PRIMIT - în STÂNGA
            msgEl.innerHTML = `
                ${!isGrouped ? `<img src="${msg.avatar}" alt="" class="message-avatar">` : '<div class="avatar-spacer"></div>'}
                <div class="message-content">
                    ${!isGrouped ? `<span class="message-sender">${escapeHtml(msg.sender_name)}</span>` : ''}
                    <div class="message-bubble received-bubble">
                        <p>${processMessageText(msg.message)}</p>
                    </div>
                    <span class="message-time">${time}</span>
                </div>
            `;
        }

        fragment.appendChild(msgEl);
    });

    if (prepend) {
        // Prepend messages (add to top)
        const scrollOffset = container.scrollHeight - container.scrollTop;
        container.insertBefore(fragment, container.firstChild);
        container.scrollTop = container.scrollHeight - scrollOffset;
    } else {
        // Append messages (add to bottom)
        container.appendChild(fragment);

        // Mobile-optimized scroll to bottom
        // Only scroll if user was at bottom AND it's not initial load (replaceContent)
        // AND chat has been open for more than 3 seconds (prevent auto-scroll on open)
        const timeSinceOpen = Date.now() - chatOpenedTime;
        if (wasAtBottom && !replaceContent && timeSinceOpen > 3000) {
            if (isMobile) {
                // Use requestAnimationFrame for smoother mobile scrolling
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            } else {
                container.scrollTop = container.scrollHeight;
            }
        }
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();

    if (!message || !currentChatUser) {
        return;
    }

    const sendBtn = document.getElementById('chat-send');
    sendBtn.disabled = true;
    
    // On mobile, keep focus to prevent keyboard from hiding
    const isMobile = isMobileDevice();
    const hadFocus = document.activeElement === input;
    
    input.value = '';

    // Refocus immediately on mobile to keep keyboard open
    if (isMobile && hadFocus) {
        input.focus();
    }

    // Optimistic UI - add message immediately
    const container = document.getElementById('chat-messages');
    const tempId = 'temp-' + Date.now();
    const emptyState = container.querySelector('.chat-empty');
    if (emptyState) emptyState.remove();

    const processedMessage = processMessageText(message);

    const tempMsg = document.createElement('div');
    tempMsg.className = 'chat-message sent sending';
    tempMsg.id = tempId;
    tempMsg.innerHTML = `
        <div class="message-content">
            <div class="message-bubble sent-bubble">
                <p>${processedMessage}</p>
            </div>
            <div class="message-meta">
                <span class="message-time">Acum</span>
                <span class="message-status sending-icon">⏳</span>
            </div>
        </div>
    `;
    container.appendChild(tempMsg);
    // Always scroll to bottom when sending a message (including GIFs)
    container.scrollTop = container.scrollHeight;

    const requestBody = buildChatRequest({ action: 'mangayummy_send_message', to: currentChatUser, message: message });

    fetch(getChatAjax().ajaxurl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: requestBody
    })
    .then(r => {
        return r.text(); // Get text first to check for HTML redirects
    })
    .then(text => {
        try {
            const data = JSON.parse(text);
            
            sendBtn.disabled = false;
            
            if (data.success) {
                const temp = document.getElementById(tempId);
                if (temp) {
                    temp.classList.remove('sending');
                    const statusIcon = temp.querySelector('.message-status');
                    if (statusIcon) statusIcon.textContent = '✔';
                    // Update message ID from server response if available
                    if (data.data && data.data.id) {
                        temp.id = 'msg-' + data.data.id;
                        // Update lastMessageId to prevent polling from re-adding this message
                        lastMessageId = Math.max(lastMessageId, parseInt(data.data.id));
                    }
                }
                
                // Scroll to bottom again after successful send (important for GIFs that load asynchronously)
                setTimeout(() => container.scrollTop = container.scrollHeight, 200);
                
                // Keep keyboard open on mobile after successful send
                if (isMobile && hadFocus) {
                    setTimeout(() => input.focus(), 250);
                }
                
                // Temporarily pause polling to prevent any refresh feeling
                if (chatPollInterval) {
                    clearInterval(chatPollInterval);
                    setTimeout(() => {
                        if (currentChatUser) {
                            chatPollInterval = setInterval(() => loadMessages(false), POLL_INTERVAL);
                        }
                    }, 3000); // Resume polling after 3 seconds
                }
                
                // No need to reload messages - optimistic UI is sufficient
            } else {
                console.error('Message send failed:', data);
                const temp = document.getElementById(tempId);
                if (temp) {
                    temp.classList.add('failed');
                    const statusIcon = temp.querySelector('.message-status');
                    if (statusIcon) statusIcon.textContent = '⚠️';
                }
            }
        } catch (e) {
            console.error('JSON parse error:', e, 'Raw response:', text);
            sendBtn.disabled = false;
        }
    })
    .catch(err => {
        console.error('AJAX error:', err);
        sendBtn.disabled = false;
        input.value = message;
        const temp = document.getElementById(tempId);
        if (temp) temp.remove();
    });
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function createConfirmModal(title, message, confirmText, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'chat-confirm-overlay';
    modal.innerHTML = `
        <div class="chat-confirm-modal">
            <h3>${title}</h3>
            <p>${message}</p>
            <div class="modal-actions">
                <button class="btn-cancel">Anulare</button>
                <button class="btn-danger">${confirmText}</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    modal.querySelector('.btn-cancel').onclick = () => modal.remove();
    modal.querySelector('.btn-danger').onclick = () => { modal.remove(); onConfirm(); };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    return modal;
}

function getEmojiPicker() {
    const emojis = ['😀', '😂', '🥰', '😍', '🤩', '😎', '🥳', '😇', 
                    '🙂', '😉', '😋', '🤔', '🤗', '😮', '😢', '😡',
                    '👍', '👎', '❤️', '💔', '🔥', '✨', '💯', '🎉',
                    '👀', '🙈', '🙉', '🙊', '💪', '🤝', '🙏', '✌️'];
    return '<div class="emoji-grid">' + emojis.map(e => `<button type="button" class="emoji-btn">${e}</button>`).join('') + '</div>';
}

// Export for external use
window.MangaYummyChat = { open: openChat, close: closeChat };

