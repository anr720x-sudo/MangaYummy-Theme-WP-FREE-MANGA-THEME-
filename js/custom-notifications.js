// Custom Browser Notifications - No server required
// Uses browser Notification API for native OS notifications

class CustomNotifications {
  constructor() {
    this.permission = null;
    this.init();
  }

  async init() {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    // Request permission on first use
    this.permission = Notification.permission;

    if (this.permission === 'default') {
      try {
        this.permission = await Notification.requestPermission();
      } catch (error) {
      }
    }
  }

  // Show a browser notification
  show(title, options = {}) {
    if (this.permission !== 'granted') {
      return null;
    }

    const defaultOptions = {
      icon: '/wp-content/themes/mangayummy/assets/img/favicon.png',
      badge: '/wp-content/themes/mangayummy/assets/img/favicon.png',
      silent: false,
      requireInteraction: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);

      // Auto-close after 5 seconds unless requireInteraction is true
      if (!defaultOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }

      // Handle click
      notification.onclick = function() {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      return null;
    }
  }

  // Show success notification
  success(message, options = {}) {
    return this.show('âœ… Succes', {
      body: message,
      icon: '/wp-content/themes/mangayummy/assets/img/success-icon.png',
      ...options
    });
  }

  // Show error notification
  error(message, options = {}) {
    return this.show('âŒ Eroare', {
      body: message,
      icon: '/wp-content/themes/mangayummy/assets/img/error-icon.png',
      requireInteraction: true,
      ...options
    });
  }

  // Show info notification
  info(message, options = {}) {
    return this.show('â„¹ï¸ Info', {
      body: message,
      icon: '/wp-content/themes/mangayummy/assets/img/info-icon.png',
      ...options
    });
  }

  // Show rating submitted notification
  ratingSubmitted(mangaTitle, rating) {
    return this.show('â­ Rating Trimis', {
      body: `Ai evaluat "${mangaTitle}" cu ${rating} stele`,
      tag: 'rating', // Prevents duplicate notifications
      ...options
    });
  }

  // Show bookmark notification
  bookmarkToggled(mangaTitle, isBookmarked) {
    const action = isBookmarked ? 'adÄƒugat la favorite' : 'scos din favorite';
    return this.show('ðŸ“š Favorite', {
      body: `"${mangaTitle}" a fost ${action}`,
      tag: 'bookmark',
      ...options
    });
  }

  // Show comment notification
  commentPosted(chapterTitle) {
    return this.show('Comment posted', {
      body: `Your comment on "${chapterTitle}" has been published`,
      tag: 'comment',
      ...options
    });
  }

  // Show chapter read notification
  chapterRead(mangaTitle, chapterNumber) {
    return this.show('Chapter read', {
      body: `You finished chapter ${chapterNumber} of "${mangaTitle}"`,
      tag: 'chapter-read',
      ...options
    });
  }
}

// Global instance
const customNotifications = new CustomNotifications();

// Make it available globally
window.customNotifications = customNotifications;

// Helper functions for easy use
window.showNotification = {
  success: (msg, options) => customNotifications.success(msg, options),
  error: (msg, options) => customNotifications.error(msg, options),
  info: (msg, options) => customNotifications.info(msg, options),
  rating: (mangaTitle, rating) => customNotifications.ratingSubmitted(mangaTitle, rating),
  bookmark: (mangaTitle, isBookmarked) => customNotifications.bookmarkToggled(mangaTitle, isBookmarked),
  comment: (chapterTitle) => customNotifications.commentPosted(chapterTitle),
  chapter: (mangaTitle, chapterNumber) => customNotifications.chapterRead(mangaTitle, chapterNumber)
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Request permission on user interaction (better UX)
  document.addEventListener('click', function requestPermission() {
    if (customNotifications.permission === 'default') {
      customNotifications.init();
    }
    // Remove listener after first click
    document.removeEventListener('click', requestPermission);
  }, { once: true });
});
