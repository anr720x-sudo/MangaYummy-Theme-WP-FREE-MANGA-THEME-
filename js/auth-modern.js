/**
 * Modern Auth System
 * Login & Register with tabs, validation, and password strength
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        minPasswordLength: 8,
        apiUrl: typeof ya_ajax !== 'undefined' ? ya_ajax.ajax_url : '/wp-admin/admin-ajax.php',
        nonce: typeof ya_ajax !== 'undefined' ? ya_ajax.nonce : '',
    };

    // DOM Elements
    const elements = {
        tabButtons: document.querySelectorAll('.auth-tab'),
        formWrappers: document.querySelectorAll('.auth-form-wrapper'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        togglePasswordBtns: document.querySelectorAll('.toggle-password'),
        switchTabBtns: document.querySelectorAll('.link-switch'),
    };

    /**
     * Tab Switching
     */
    function initTabs() {
        elements.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        elements.switchTabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(btn.dataset.tab);
            });
        });
    }

    function switchTab(tabName) {
        // Deactivate all tabs and forms
        elements.tabButtons.forEach(btn => btn.classList.remove('active'));
        elements.formWrappers.forEach(wrapper => wrapper.classList.remove('active'));

        // Activate selected
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        // Scroll to top
        document.querySelector('.auth-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Toggle Password Visibility
     */
    function initPasswordToggle() {
        elements.togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                const isPassword = input.type === 'password';

                input.type = isPassword ? 'text' : 'password';
                btn.innerHTML = isPassword ? 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' : 
                    '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>';
            });
        });
    }

    /**
     * Login Form Submission
     */
    function initLoginForm() {
        elements.loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous errors
            clearErrors('login');

            // Validation
            const username = document.getElementById('login-username').value.trim();
            const password = document.getElementById('login-password').value;

            if (!username) {
                showError('login-username', 'Fill in username or email');
                return;
            }

            if (!password) {
                showError('login-password', 'Fill in password');
                return;
            }

            // Submit
            await submitLogin(username, password);
        });
    }

    async function submitLogin(username, password) {
        const form = elements.loginForm;
        const btn = form.querySelector('button[type="submit"]');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        btn.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');

        try {
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'ya_login',
                    nonce: config.nonce,
                    username: username,
                    password: password,
                    remember: document.getElementById('login-remember').checked ? '1' : '0',
                }),
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = data.data.redirect || '/';
                }, 500);
            } else {
                showNotification(data.data.message || 'Login error', 'error');
            }
        } catch (error) {
            showNotification('Connection error', 'error');
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    /**
     * Register Form Submission
     */
    function initRegisterForm() {
        const passwordInput = document.getElementById('register-password');
        const usernameInput = document.getElementById('register-username');

        // Username length checker - show red when exceeds 20 chars
        if (usernameInput) {
            usernameInput.setAttribute('maxlength', '20');
            usernameInput.addEventListener('input', function() {
                const len = this.value.length;
                if (len > 20) {
                    this.style.borderColor = '#13667a';
                    this.style.boxShadow = '0 0 0 2px rgba(255,77,79,0.3)';
                    showError('register-username', 'Maxim 20 caractere');
                } else if (len > 0 && len < 3) {
                    this.style.borderColor = '#faad14';
                    this.style.boxShadow = '0 0 0 2px rgba(250,173,20,0.3)';
                } else if (len >= 3) {
                    this.style.borderColor = '#52c41a';
                    this.style.boxShadow = '0 0 0 2px rgba(82,196,26,0.3)';
                    clearErrors('register');
                } else {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            });
        }

        // Email validation - only gmail.com allowed
        const emailInput = document.getElementById('register-email');
        if (emailInput) {
            emailInput.addEventListener('input', function() {
                const email = this.value.trim().toLowerCase();
                const isGmail = email.endsWith('@gmail.com');
                const hasAtSymbol = email.includes('@');
                
                if (email.length === 0) {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                } else if (hasAtSymbol && !isGmail) {
                    this.style.borderColor = '#13667a';
                    this.style.boxShadow = '0 0 0 2px rgba(255,77,79,0.3)';
                    showError('register-email', 'Doar adrese @gmail.com sunt acceptate');
                } else if (isGmail && /^[^\s@]+@gmail\.com$/.test(email)) {
                    this.style.borderColor = '#52c41a';
                    this.style.boxShadow = '0 0 0 2px rgba(82,196,26,0.3)';
                    clearErrors('register');
                } else {
                    this.style.borderColor = '#faad14';
                    this.style.boxShadow = '0 0 0 2px rgba(250,173,20,0.3)';
                }
            });
        }

        // Password strength checker
        passwordInput.addEventListener('input', checkPasswordStrength);

        elements.registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous errors
            clearErrors('register');

            // Validation
            const username = document.getElementById('register-username').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            const passwordConfirm = document.getElementById('register-password-confirm').value;
            const termsAccepted = document.getElementById('register-terms').checked;

            // Validate username
            if (username.length < 3 || username.length > 20) {
                showError('register-username', 'Utilizatorul trebuie să aibă 3-20 caractere');
                return;
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
                showError('register-username', 'Utilizatorul poate conține doar litere, cifre, _, -');
                return;
            }

            // Validate email
            if (!isValidEmail(email)) {
                showError('register-email', 'Email invalid');
                return;
            }

            // Validate password
            if (password.length < config.minPasswordLength) {
                showError('register-password', `Parola trebuie să aibă cel puțin ${config.minPasswordLength} caractere`);
                return;
            }

            // Validate password match
            if (password !== passwordConfirm) {
                showError('register-password-confirm', 'Parolele nu se potrivesc');
                return;
            }

            // Validate terms
            if (!termsAccepted) {
                showError('register-terms', 'Trebuie să accepți termenii de utilizare');
                return;
            }

            // Validate gender
            const genderSelected = form.querySelector('input[name="gender"]:checked');
            if (!genderSelected) {
                showNotification('Selectează genul (Băiat sau Fată)', 'error');
                return;
            }

            // Submit
            await submitRegister(username, email, password);
        });
    }

    function checkPasswordStrength() {
        const password = document.getElementById('register-password').value;
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.password-strength-text');

        if (!password) {
            strengthBar.className = 'strength-fill';
            strengthText.classList.remove('show');
            return;
        }

        strengthText.classList.add('show');

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        if (strength <= 2) {
            strengthBar.className = 'strength-fill weak';
            strengthText.textContent = '⚠️ Parolă slabă';
            strengthText.style.color = '#13667a';
        } else if (strength <= 3) {
            strengthBar.className = 'strength-fill medium';
            strengthText.textContent = '🔶 Parolă medie';
            strengthText.style.color = '#ffb800';
        } else {
            strengthBar.className = 'strength-fill strong';
            strengthText.textContent = '✓ Parolă puternică';
            strengthText.style.color = '#13667a';
        }
    }

    async function submitRegister(username, email, password) {
        const form = elements.registerForm;
        const btn = form.querySelector('button[type="submit"]');
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');

        btn.disabled = true;
        btnText.classList.add('hidden');
        btnLoader.classList.remove('hidden');

        try {
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    action: 'ya_register',
                    nonce: config.nonce,
                    username: username,
                    email: email,
                    password: password,
                    password_confirm: password,
                    agree_terms: '1',
                    gender: form.querySelector('input[name="gender"]:checked').value,
                }),
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Account created! Check your email.', 'success');
                setTimeout(() => {
                    switchTab('login');
                    form.reset();
                }, 500);
            } else {
                showNotification(data.data.message || 'Registration error', 'error');
            }
        } catch (error) {
            showNotification('Connection error', 'error');
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    /**
     * Validation Helpers
     */
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function showError(fieldId, message) {
        const errorEl = document.getElementById(`${fieldId}-error`);
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.add('show');
            document.getElementById(fieldId).focus();
        }
    }

    function clearErrors(prefix) {
        document.querySelectorAll(`#${prefix}-tab .form-error`).forEach(el => {
            el.textContent = '';
            el.classList.remove('show');
        });
    }

    /**
     * Notifications
     */
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `ya-toast ya-toast--${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutNotification 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Add notification animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInNotification {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOutNotification {
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

    /**
     * Initialize
     */
    function init() {
        initTabs();
        initPasswordToggle();
        initLoginForm();
        initRegisterForm();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
