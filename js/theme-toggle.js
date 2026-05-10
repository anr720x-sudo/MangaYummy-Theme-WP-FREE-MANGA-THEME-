document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.querySelector('.theme-toggle');
    if (!toggle) return; // NU crapă pe alte pagini

    const body = document.body;

    // load saved theme
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-mode');
    }

    toggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');

        localStorage.setItem(
            'theme',
            body.classList.contains('dark-mode') ? 'dark' : 'light'
        );
    });
});