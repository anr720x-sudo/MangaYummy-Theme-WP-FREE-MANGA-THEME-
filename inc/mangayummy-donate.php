<?php
/**
 * MangaYummy Donation Notice
 * Displays a friendly admin notice every 30 days encouraging donations
 */

// Hook into admin_notices to display the donation banner
add_action('admin_notices', 'mangayummy_show_donation_notice');

function mangayummy_show_donation_notice() {
    // Only show to logged-in users with edit capabilities
    if (!current_user_can('edit_posts')) {
        return;
    }

    $user_id = get_current_user_id();
    $notice_key = 'mangayummy_donation_notice_dismissed';
    $notice_timestamp_key = 'mangayummy_donation_notice_timestamp';
    
    // Check if notice has been permanently dismissed
    $permanently_dismissed = get_user_meta($user_id, $notice_key, true);
    if ($permanently_dismissed === 'permanent') {
        return;
    }
    
    // Check if notice was dismissed recently (within 30 days)
    $last_dismissed = get_user_meta($user_id, $notice_timestamp_key, true);
    $current_time = time();
    $thirty_days_in_seconds = 30 * DAY_IN_SECONDS;
    
    if ($last_dismissed && ($current_time - $last_dismissed) < $thirty_days_in_seconds) {
        return;
    }
    
    // Display the notice
    ?>
    <div id="mangayummy-donation-notice" class="notice notice-info mangayummy-donation-notice is-dismissible" style="border-left: 4px solid #13667a; padding: 20px; background: linear-gradient(135deg, #f5f9fb 0%, #e8f4f8 100%);">
        <div style="display: flex; align-items: center; gap: 20px; max-width: 1200px;">
            <!-- Left: Coffee icon -->
            <div style="flex-shrink: 0; font-size: 48px; line-height: 1;">☕</div>
            
            <!-- Center: Message -->
            <div style="flex-grow: 1;">
                <h3 style="margin: 0 0 8px 0; color: #13667a; font-size: 16px; font-weight: 600;">
                    Enjoying MangaYummy?
                </h3>
                <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.6;">
                    If this free theme helps your site, consider supporting the developer with a small donation. 
                    It helps keep MangaYummy free, updated, and continuously improved.
                </p>
            </div>
            
            <!-- Right: Buttons -->
            <div style="flex-shrink: 0; display: flex; flex-direction: column; gap: 8px;">
                <a href="https://buymeacoffee.com/mangayummy9" target="_blank" rel="noopener noreferrer" class="button button-primary mangayummy-donate-btn" style="background: #13667a; border-color: #13667a; color: white; text-decoration: none; white-space: nowrap; text-align: center;">
                    ☕ Buy me a coffee
                </a>
                <button type="button" class="button mangayummy-donate-later-btn" onclick="mangayummy_dismiss_notice('later')" style="white-space: nowrap;">
                    Maybe later
                </button>
                <button type="button" class="button mangayummy-donate-permanent-btn" onclick="mangayummy_dismiss_notice('permanent')" style="white-space: nowrap;">
                    I already donated ❤️
                </button>
            </div>
        </div>
    </div>

    <script type="text/javascript">
    (function() {
        function mangayummy_dismiss_notice(action) {
            const notice = document.getElementById('mangayummy-donation-notice');
            if (!notice) return;
            
            // Send AJAX request to update user meta
            const formData = new FormData();
            formData.append('action', 'mangayummy_dismiss_donation_notice');
            formData.append('nonce', '<?php echo wp_create_nonce('mangayummy_donation_nonce'); ?>');
            formData.append('dismiss_action', action);
            
            fetch('<?php echo admin_url('admin-ajax.php'); ?>', {
                method: 'POST',
                body: formData
            }).then(r => r.json()).catch(e => console.log('Notice dismissed locally'));
            
            // Hide notice immediately
            notice.style.display = 'none';
        }
        
        // Make function global
        window.mangayummy_dismiss_notice = mangayummy_dismiss_notice;
        
        // Also handle native close button
        const notice = document.getElementById('mangayummy-donation-notice');
        if (notice) {
            const closeBtn = notice.querySelector('.notice-dismiss');
            if (closeBtn) {
                closeBtn.addEventListener('click', function() {
                    mangayummy_dismiss_notice('later');
                });
            }
        }
    })();
    </script>

    <style type="text/css">
        .mangayummy-donation-notice {
            box-shadow: 0 2px 8px rgba(19, 102, 122, 0.15);
            border-radius: 4px;
        }
        
        .mangayummy-donation-notice .button {
            font-size: 13px;
            padding: 6px 14px;
            height: auto;
            line-height: 1.5;
        }
        
        .mangayummy-donation-notice .button-primary {
            font-weight: 600;
        }
        
        @media screen and (max-width: 768px) {
            .mangayummy-donation-notice {
                flex-direction: column !important;
            }
            
            .mangayummy-donation-notice > div {
                flex-direction: column !important;
            }
            
            .mangayummy-donation-notice > div > div:last-child {
                width: 100%;
            }
            
            .mangayummy-donation-notice > div > div:last-child .button {
                width: 100%;
            }
        }
    </style>
    <?php
}

// AJAX handler for dismissing the notice
add_action('wp_ajax_mangayummy_dismiss_donation_notice', 'mangayummy_handle_dismiss_donation_notice');

function mangayummy_handle_dismiss_donation_notice() {
    // Verify nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'mangayummy_donation_nonce')) {
        wp_send_json_error(['message' => 'Security check failed']);
    }
    
    $user_id = get_current_user_id();
    if (!$user_id || !current_user_can('edit_posts')) {
        wp_send_json_error(['message' => 'Permission denied']);
    }
    
    $dismiss_action = sanitize_text_field($_POST['dismiss_action'] ?? 'later');
    
    if ($dismiss_action === 'permanent') {
        // Mark as permanently dismissed
        update_user_meta($user_id, 'mangayummy_donation_notice_dismissed', 'permanent');
    } else {
        // Update the timestamp so notice won't show for 30 days
        update_user_meta($user_id, 'mangayummy_donation_notice_timestamp', time());
    }
    
    wp_send_json_success(['message' => 'Notice dismissed']);
}
