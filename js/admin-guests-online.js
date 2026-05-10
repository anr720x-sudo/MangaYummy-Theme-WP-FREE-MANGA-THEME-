// Admin Guests Online (separate section)
jQuery(document).ready(function($) {
    if (!$('#mangayummy-guests-online').length) return;
    function fetchGuests() {
        $.post(ajaxurl, {action: 'mangayummy_get_guests_online'}, function(resp) {
            if (!resp.success) return $('#mangayummy-guests-online').html('<em>Eroare sau fără vizitatori.</em>');
            let html = '<table><thead><tr><th>IP</th><th>User Agent</th><th>Ultima pagină</th><th>Ultima activitate</th></tr></thead><tbody>';
            resp.data.forEach(g => {
                html += `<tr><td>${g.ip}</td><td>${g.ua.substr(0,32)}...</td><td>${g.url}</td><td>${timeAgo(g.last)}</td></tr>`;
            });
            html += '</tbody></table>';
            $('#mangayummy-guests-online').html(html);
        });
    }
    function timeAgo(ts) {
        const now = Math.floor(Date.now()/1000);
        const diff = now - ts;
        if (diff < 60) return diff+' sec';
        if (diff < 3600) return Math.floor(diff/60)+' min';
        return Math.floor(diff/3600)+' h';
    }
    fetchGuests();
    setInterval(fetchGuests, 15000);
});
