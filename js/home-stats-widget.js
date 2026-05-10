(function () {
  const roots = document.querySelectorAll('.homepage-live-stats-root');
  if (!roots.length || typeof ya_ajax === 'undefined') {
    return;
  }

  const statNodes = Array.from(roots).flatMap((root) =>
    Array.from(root.querySelectorAll('[data-stat-key]'))
  );
  if (!statNodes.length) {
    return;
  }

  const updateStats = (payload) => {
    statNodes.forEach((node) => {
      const key = node.getAttribute('data-stat-key');
      if (key && Object.prototype.hasOwnProperty.call(payload, key)) {
        node.textContent = payload[key];
      }
    });
  };

  const fetchStats = () => {
    const formData = new FormData();
    formData.append('action', 'mangayummy_homepage_live_stats');
    formData.append('nonce', ya_ajax.nonce);

    fetch(ya_ajax.ajax_url, {
      method: 'POST',
      body: formData,
      credentials: 'same-origin',
    })
      .then((response) => response.json())
      .then((result) => {
        if (result && result.success && result.data) {
          updateStats(result.data);
        }
      })
      .catch(() => {
        // Keep current values if request fails.
      });
  };

  // Refresh once shortly after load, then continuously.
  setTimeout(fetchStats, 2500);
  setInterval(fetchStats, 30000);
})();
