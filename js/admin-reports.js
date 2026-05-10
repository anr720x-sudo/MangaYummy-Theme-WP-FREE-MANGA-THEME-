/**
 * Admin Reports Management JavaScript
 * Handles report actions and messaging
 */


jQuery(document).ready(function($) {

    // Quick actions from the reports list
    $('.quick-resolve-report, .quick-reject-report').on('click', function(e) {
        e.preventDefault();

        const $link = $(this);
        const reportId = $link.data('id');
        const action = $link.data('action');
        const nonce = $link.data('nonce');

        if (!confirm(mangayummy_admin_reports.strings.confirm_resolve)) {
            return;
        }

        $link.text(mangayummy_admin_reports.strings.processing);

        $.ajax({
            url: mangayummy_admin_reports.ajax_url,
            type: 'POST',
            data: {
                action: 'mangayummy_process_report_action',
                nonce: mangayummy_admin_reports.nonce,
                report_id: reportId,
                report_action: action,
                response_message: action === 'resolved'
                    ? 'Raportul tău a fost rezolvat. Mulțumim pentru feedback-ul tău!'
                    : 'Raportul tău a fost revizuit și nu necesită modificări. Mulțumim pentru feedback-ul tău!'
            },
            success: function(response) {
                if (response.success) {
                    location.reload();
                } else {
                    alert('Eroare: ' + (response.data?.message || mangayummy_admin_reports.strings.error_unknown));
                    $link.text(action === 'resolved' ? 'Rezolvat' : 'Refuzat');
                }
            },
            error: function() {
                alert(mangayummy_admin_reports.strings.error_connection);
                $link.text(action === 'resolved' ? 'Rezolvat' : 'Refuzat');
            }
        });
    });

    // Individual report page actions
    const $resolveBtn = $('#resolve-report-btn');
    const $rejectBtn = $('#reject-report-btn');
    const $responseForm = $('#report-response-form');
    const $responseMessage = $('#report-response-message');
    const $sendResponseBtn = $('#send-response-btn');
    const $cancelResponseBtn = $('#cancel-response-btn');

    let currentAction = '';

    $resolveBtn.add($rejectBtn).on('click', function() {
        currentAction = $(this).is($resolveBtn) ? 'resolved' : 'rejected';
        $responseForm.show();
        $responseMessage.focus();
    });

    $cancelResponseBtn.on('click', function() {
        $responseForm.hide();
        $responseMessage.val('');
        currentAction = '';
    });

    $sendResponseBtn.on('click', function() {
        const message = $responseMessage.val().trim();
        if (!message) {
            alert('Te rugăm să introduci un mesaj.');
            return;
        }

        $sendResponseBtn.prop('disabled', true).text('Se trimite...');

        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'mangayummy_process_report_action',
                nonce: $('#mangayummy_report_actions_nonce').val(),
                report_id: $('#post_ID').val(),
                report_action: currentAction,
                response_message: message
            },
            success: function(response) {
                if (response.success) {
                    // Show success message and reload
                    showAdminNotification('Raport procesat cu succes! Mesaj trimis reporter-ului.', 'success');
                    setTimeout(() => location.reload(), 1500);
                } else {
                    showAdminNotification('Eroare: ' + (response.data?.message || 'Necunoscută'), 'error');
                    $sendResponseBtn.prop('disabled', false).text('Trimite mesaj');
                }
            },
            error: function() {
                showAdminNotification('Eroare de conexiune. Încearcă din nou.', 'error');
                $sendResponseBtn.prop('disabled', false).text('Trimite mesaj');
            }
        });
    });

    // Admin notification system
    function showAdminNotification(message, type = 'info') {
        // Remove existing notifications
        $('.admin-custom-notification').remove();

        const $notification = $('<div class="admin-custom-notification" style="position: fixed; top: 40px; right: 20px; padding: 15px 20px; border-radius: 6px; color: white; font-weight: 500; z-index: 99999; box-shadow: 0 4px 12px rgba(0,0,0,0.3); animation: slideInRight 0.3s ease;"></div>');

        const colors = {
            success: '#13667a',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        $notification.css('background-color', colors[type] || colors.info);
        $notification.text(message);

        $('body').append($notification);

        // Auto-hide after 4 seconds
        setTimeout(() => {
            $notification.css('animation', 'slideOutRight 0.3s ease');
            setTimeout(() => $notification.remove(), 300);
        }, 4000);
    }
});

// Add CSS animations for admin notifications
const adminNotificationStyles = `
<style>
@keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}
</style>
`;

// Inject styles if not already present
if (!$('#admin-notification-styles').length) {
    $('head').append(adminNotificationStyles);
}
