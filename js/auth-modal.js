/**
 * Auth Modal Popup System
 * Login & Register modal overlay triggered from header
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        minPasswordLength: 8,
        apiUrl: typeof ya_ajax !== 'undefined' ? ya_ajax.ajax_url : '/wp-admin/admin-ajax.php',
        nonce: typeof ya_ajax !== 'undefined' ? ya_ajax.nonce : '',
    };

    // Create modal HTML
    function createAuthModal() {
        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'auth-modal';
        modal.innerHTML = `
            <div class="auth-modal-overlay"></div>
            <div class="auth-modal-content">
                <button class="auth-modal-close" aria-label="Close">&times;</button>
                
                <div class="auth-modal-header">
                    <span class="auth-modal-title">MangaYummy</span>
                </div>

                <div class="auth-modal-tabs">
                    <button class="auth-modal-tab active" data-tab="login"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg> Login</button>
                    <button class="auth-modal-tab" data-tab="register"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Register</button>
                </div>

                <!-- Login Form -->
                <div class="auth-modal-form-wrapper active" id="modal-login-tab">
                    <form class="auth-modal-form" id="modal-login-form">
                        <div class="form-group">
                            <input 
                                type="text" 
                                name="username" 
                                class="form-input"
                                placeholder="Username or email",
                                required
                            >
                            <span class="form-error"></span>
                        </div>

                        <div class="form-group">
                            <div class="password-wrapper">
                                <input 
                                    type="password" 
                                    name="password" 
                                    class="form-input"
                                    placeholder="Password",
                                    required
                                >
                                <button type="button" class="toggle-password" data-target="modal-login-password">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                            <span class="form-error"></span>
                        </div>

                        <div class="form-group checkbox-group">
                            <input type="checkbox" name="remember" id="modal-remember">
                            <label for="modal-remember">Keep me logged in</label>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">
                            <span class="btn-text">Log in</span>
                            <span class="btn-loader hidden">⏳</span>
                        </button>

                        <div class="auth-social-divider"><span>or</span></div>

                        <button type="button" class="btn btn-discord btn-block discord-auth-btn">
                            <svg width="18" height="14" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
                            Continue with Discord
                        </button>

                        <div class="form-links">
                            <a href="#" class="link-forgot">Forgot password?</a>
                        </div>

                        <div class="form-footer">
                            <p>Not logged in? <a href="#" onclick="event.preventDefault(); document.querySelector('.auth-modal-tab[data-tab=register]').click();">Sign up now</a></p>
                        </div>
                    </form>
                </div>

                <!-- Forgot Password Form -->
                <div class="auth-modal-form-wrapper" id="modal-forgot-tab">
                    <form class="auth-modal-form" id="modal-forgot-form">
                        <div class="form-group">
                            <input 
                                type="email" 
                                name="email" 
                                class="form-input"
                                autocomplete="off"
                                placeholder="Your email",
                                required
                            >
                            <span class="form-error"></span>
                            <div class="modal-info-message"></div>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">
                            <span class="btn-text">Send reset link</span>
                            <span class="btn-loader hidden">⏳</span>
                        </button>

                        <div class="form-links">
                            <a href="#" class="link-back-login"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg> Back to login</a>
                        </div>
                    </form>
                </div>

                <!-- Register Form -->
                <div class="auth-modal-form-wrapper" id="modal-register-tab">
                    <form class="auth-modal-form" id="modal-register-form">
                        <div class="form-group">
                            <input 
                                type="text" 
                                name="username" 
                                class="form-input"
                                placeholder="Username (3-20 characters)",
                                maxlength="20"
                                required
                            >
                            <span class="form-error"></span>
                        </div>

                        <div class="form-group">
                            <input 
                                type="email" 
                                name="email" 
                                class="form-input"
                                placeholder="Email"
                                required
                            >
                            <span class="form-error"></span>
                        </div>

                        <div class="form-group">
                            <div class="password-wrapper">
                                <input 
                                    type="password" 
                                    name="password" 
                                    class="form-input password-strength"
                                    placeholder="Strong password",
                                    required
                                >
                                <button type="button" class="toggle-password" data-target="modal-register-password">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                            <div class="password-strength-bar">
                                <div class="strength-fill"></div>
                            </div>
                            <span class="password-strength-text"></span>
                            <span class="form-error"></span>
                        </div>

                        <div class="form-group">
                            <div class="password-wrapper">
                                <input 
                                    type="password" 
                                    name="password_confirm" 
                                    class="form-input"
                                    placeholder="Confirm password",
                                    required
                                >
                                <button type="button" class="toggle-password" data-target="modal-register-password-confirm">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                </button>
                            </div>
                            <span class="form-error"></span>
                        </div>

                        <div class="form-group">
                            <label class="form-label" style="margin-bottom:8px;color:#aaa;font-size:13px;">Gender</label>
                            <div class="gender-select" style="display:flex;justify-content:space-between;gap:0;">
                                <label class="gender-option" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 16px;background:#252525;border-radius:8px;border:1px solid #333;">
                                    <input type="radio" name="gender" value="masculin" style="accent-color:#13667a;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#13667a" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0114 0v2"/></svg>
                                    <span style="color:#fff;">Male</span>
                                </label>
                                <label class="gender-option" style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 16px;background:#252525;border-radius:8px;border:1px solid #333;">
                                    <input type="radio" name="gender" value="feminin" style="accent-color:#13667a;">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff69b4" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0114 0v2"/><path d="M12 11v4m-2-2h4"/></svg>
                                    <span style="color:#fff;">Female</span>
                                </label>
                            </div>
                        </div>

                        <div class="form-group checkbox-group">
                            <input type="checkbox" name="terms" id="modal-terms" required>
                            <label for="modal-terms">Accept terms of service</label>
                            <span class="form-error"></span>
                        </div>

                        <div class="form-group">
                            <div class="cf-turnstile" data-sitekey="0x4AAAAAACO39Dk4O9-gDusT" data-theme="dark"></div>
                            <span class="form-error"></span>
                        </div>

                        <button type="submit" class="btn btn-primary btn-block">
                            <span class="btn-text">Register</span>
                            <span class="btn-loader hidden">⏳</span>
                        </button>

                        <div class="auth-social-divider"><span>or</span></div>

                        <button type="button" class="btn btn-discord btn-block discord-auth-btn">
                            <svg width="18" height="14" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/></svg>
                            Sign up with Discord
                        </button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Load Cloudflare Turnstile script
        if (!document.querySelector('script[src*="challenges.cloudflare.com"]')) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        }
    }

    /**
     * Initialize Modal
     */
    function initAuthModal() {
        const modal = document.getElementById('auth-modal');
        if (!modal) createAuthModal();

        const authModal = document.getElementById('auth-modal');
        const overlay = authModal.querySelector('.auth-modal-overlay');
        const closeBtn = authModal.querySelector('.auth-modal-close');
        const tabs = authModal.querySelectorAll('.auth-modal-tab');
        const wrappers = authModal.querySelectorAll('.auth-modal-form-wrapper');
        const togglePasswordBtns = authModal.querySelectorAll('.toggle-password');

        // Close modal
        function closeModal() {
            authModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }

        overlay.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);

        // Tab switching
        function activateWrapper(id) {
            wrappers.forEach(w => w.classList.remove('active'));
            const target = document.getElementById(id);
            if (target) target.classList.add('active');
        }

        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                activateWrapper(`modal-${tabName}-tab`);
                btn.classList.add('active');
            });
        });

        // Forgot password toggle
        authModal.querySelectorAll('.link-forgot').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                activateWrapper('modal-forgot-tab');
            });
        });

        authModal.querySelectorAll('.link-back-login').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                tabs.forEach(t => t.classList.remove('active'));
                tabs[0]?.classList.add('active');
                activateWrapper('modal-login-tab');
            });
        });

        // Password toggle
        togglePasswordBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = btn.dataset.target;
                const input = authModal.querySelector(`input[name="${targetId.split('-')[2]}"], input[data-field="${targetId}"]`) || 
                              authModal.querySelector(`[data-field-id="${targetId}"]`);
                
                // Find input by looking for the correct field
                let inputField;
                if (targetId === 'modal-login-password') {
                    inputField = document.querySelector('#modal-login-tab input[name="password"]');
                } else if (targetId === 'modal-register-password') {
                    inputField = document.querySelector('#modal-register-tab input[name="password"]');
                } else if (targetId === 'modal-register-password-confirm') {
                    inputField = document.querySelector('#modal-register-tab input[name="password_confirm"]');
                }

                if (inputField) {
                    inputField.type = inputField.type === 'password' ? 'text' : 'password';
                    btn.innerHTML = inputField.type === 'password' ? 
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>' : 
                        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
                }
            });
        });

        // Forms
        initLoginForm(authModal);
        initRegisterForm(authModal);
        initForgotForm(authModal);
        initDiscordButtons(authModal);
    }

    /**
     * Login Form
     */
    function initLoginForm(modal) {
        const form = modal.querySelector('#modal-login-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(form);

            const username = form.querySelector('input[name="username"]').value.trim();
            const password = form.querySelector('input[name="password"]').value;

            if (!username || !password) {
                showModalError(form, 'Fill in all fields');
                return;
            }

            await submitLogin(form, username, password);
        });
    }

    async function submitLogin(form, username, password) {
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
                    remember: form.querySelector('input[name="remember"]').checked ? '1' : '0',
                }),
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Login successful!', 'success');
                setTimeout(() => {
                    window.location.href = data.data.redirect || '/';
                }, 500);
            } else {
                showModalError(form, data.data.message || 'Login error');
            }
        } catch (error) {
            showModalError(form, 'Connection error');
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    /**
     * Register Form
     */
    function initRegisterForm(modal) {
        const form = modal.querySelector('#modal-register-form');
        if (!form) return;

        const passwordInput = form.querySelector('input[name="password"]');
        const usernameInput = form.querySelector('input[name="username"]');
        
        // Username length checker - show red when exceeds 20 chars
        if (usernameInput) {
            usernameInput.setAttribute('maxlength', '20');
            usernameInput.addEventListener('input', function() {
                const len = this.value.length;
                if (len > 20) {
                    this.style.borderColor = '#13667a';
                    this.style.boxShadow = '0 0 0 2px rgba(255,77,79,0.3)';
                    showFieldError(form, 'username', 'Maximum 20 characters');
                } else if (len > 0 && len < 3) {
                    this.style.borderColor = '#faad14';
                    this.style.boxShadow = '0 0 0 2px rgba(250,173,20,0.3)';
                } else if (len >= 3) {
                    this.style.borderColor = '#52c41a';
                    this.style.boxShadow = '0 0 0 2px rgba(82,196,26,0.3)';
                    clearFieldError(form, 'username');
                } else {
                    this.style.borderColor = '';
                    this.style.boxShadow = '';
                }
            });
        }

        // Email validation - only gmail.com allowed
        const emailInput = form.querySelector('input[name="email"]');
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
                    showFieldError(form, 'email', 'Only @gmail.com addresses are accepted');
                } else if (isGmail && /^[^\s@]+@gmail\.com$/.test(email)) {
                    this.style.borderColor = '#52c41a';
                    this.style.boxShadow = '0 0 0 2px rgba(82,196,26,0.3)';
                    clearFieldError(form, 'email');
                } else {
                    this.style.borderColor = '#faad14';
                    this.style.boxShadow = '0 0 0 2px rgba(250,173,20,0.3)';
                }
            });
        }
        
        passwordInput.addEventListener('input', () => checkPasswordStrength(form));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(form);

            const username = form.querySelector('input[name="username"]').value.trim();
            const email = form.querySelector('input[name="email"]').value.trim();
            const password = form.querySelector('input[name="password"]').value;
            const passwordConfirm = form.querySelector('input[name="password_confirm"]').value;
            const termsAccepted = form.querySelector('input[name="terms"]').checked;
            
            // Get Cloudflare Turnstile token (Cloudflare creates a hidden textarea)
            const turnstileWidget = form.querySelector('.cf-turnstile');
            const turnstileToken = turnstileWidget?.querySelector('input[name="cf-turnstile-response"]')?.value || 
                                   turnstileWidget?.querySelector('textarea[name="cf-turnstile-response"]')?.value || '';

            let hasError = false;

            if (username.length < 3 || username.length > 20) {
                showFieldError(form, 'username', 'Username 3-20 characters');
                hasError = true;
            }

            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showFieldError(form, 'email', 'Invalid email');
                hasError = true;
            }

            if (password.length < config.minPasswordLength) {
                showFieldError(form, 'password', `Min ${config.minPasswordLength} characters`);
                hasError = true;
            }

            if (password !== passwordConfirm) {
                showFieldError(form, 'password_confirm', 'Passwords don\'t match');
                hasError = true;
            }

            if (!termsAccepted) {
                showFieldError(form, 'terms', 'Accept terms');
                hasError = true;
            }

            if (!turnstileToken) {
                showModalError(form, 'Verify you\'re not a robot (Cloudflare)');
                hasError = true;
            }

            const genderSelected = form.querySelector('input[name="gender"]:checked');
            if (!genderSelected) {
                showModalError(form, 'Select gender (Boy or Girl)');
                hasError = true;
            }

            if (hasError) return;

            await submitRegister(form, username, email, password, passwordConfirm, termsAccepted, turnstileToken);
        });
    }

    /**
     * Forgot Password Form
     */
    function initForgotForm(modal) {
        const form = modal.querySelector('#modal-forgot-form');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearErrors(form);
            const email = form.querySelector('input[name="email"]').value.trim();
            const infoBox = form.querySelector('.modal-info-message');
            infoBox.textContent = '';

            if (!email) {
                showModalError(form, 'Enter your email');
                return;
            }

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
                        action: 'ya_forgot_password',
                        nonce: config.nonce,
                        email: email,
                    }),
                });

                const data = await response.json();
                if (data.success) {
                    infoBox.textContent = data.data.message || 'If the email exists, you\'ll receive a reset link (1h).';
                    infoBox.style.color = '#13667a';
                    form.reset();
                } else {
                    showModalError(form, data.data.message || 'Error sending.');
                }
            } catch (error) {
                showModalError(form, 'Connection error');
            } finally {
                btn.disabled = false;
                btnText.classList.remove('hidden');
                btnLoader.classList.add('hidden');
            }
        });
    }

    function checkPasswordStrength(form) {
        const password = form.querySelector('input[name="password"]').value;
        const strengthBar = form.querySelector('.password-strength-bar');
        const strengthFill = form.querySelector('.strength-fill');
        const strengthText = form.querySelector('.password-strength-text');

        if (!password) {
            strengthBar.classList.remove('show');
            strengthFill.className = 'strength-fill';
            strengthText.classList.remove('show');
            return;
        }

        // Show bar and text when user starts typing
        strengthBar.classList.add('show');
        strengthText.classList.add('show');

        let strength = 0;
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        if (strength <= 2) {
            strengthFill.className = 'strength-fill weak';
            strengthText.textContent = '⚠️ Weak';
            strengthText.style.color = '#13667a';
        } else if (strength <= 3) {
            strengthFill.className = 'strength-fill medium';
            strengthText.textContent = '🔶 Medium';
            strengthText.style.color = '#ffb800';
        } else {
            strengthFill.className = 'strength-fill strong';
            strengthText.textContent = '✓ Strong';
            strengthText.style.color = '#13667a';
        }
    }

    async function submitRegister(form, username, email, password, passwordConfirm, termsAccepted, turnstileToken) {
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
                    password_confirm: passwordConfirm,
                    agree_terms: termsAccepted ? '1' : '0',
                    gender: form.querySelector('input[name="gender"]:checked').value,
                    cf_turnstile_response: turnstileToken,
                }),
            });

            const data = await response.json();

            if (data.success) {
                showNotification('Account created! Check your email.', 'success');
                setTimeout(() => {
                    form.reset();
                    document.querySelector('.auth-modal-tab').click();
                }, 500);
            } else {
                showModalError(form, data.data.message || 'Registration error');
            }
        } catch (error) {
            showModalError(form, 'Connection error');
        } finally {
            btn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoader.classList.add('hidden');
        }
    }

    /**
     * Discord OAuth
     */
    function initDiscordButtons(modal) {
        modal.querySelectorAll('.discord-auth-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const originalHTML = btn.innerHTML;
                btn.disabled = true;
                btn.textContent = 'Redirecționare...';

                try {
                    const response = await fetch(config.apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            action: 'ya_discord_auth_url',
                            nonce: config.nonce,
                        }),
                    });

                    const data = await response.json();

                    if (data.success && data.data.url) {
                        window.location.href = data.data.url;
                    } else {
                        btn.disabled = false;
                        btn.innerHTML = originalHTML;
                        const wrapper = btn.closest('.auth-modal-form-wrapper');
                        showModalError(wrapper.querySelector('form') || wrapper, data.data?.message || 'Discord error.');
                    }
                } catch (e) {
                    btn.disabled = false;
                    btn.innerHTML = originalHTML;
                }
            });
        });
    }

    /**
     * Helpers
     */
    function clearErrors(form) {
        form.querySelectorAll('.form-error').forEach(el => {
            el.textContent = '';
        });
    }

    function showFieldError(form, fieldName, message) {
        const field = form.querySelector(`input[name="${fieldName}"]`);
        if (field && field.nextElementSibling && field.nextElementSibling.classList.contains('form-error')) {
            field.nextElementSibling.textContent = message;
        }
    }

    function clearFieldError(form, fieldName) {
        const field = form.querySelector(`input[name="${fieldName}"]`);
        if (field && field.nextElementSibling && field.nextElementSibling.classList.contains('form-error')) {
            field.nextElementSibling.textContent = '';
        }
    }

    function showModalError(form, message) {
        const modal = form.closest('.auth-modal-form-wrapper');
        const errorEl = document.createElement('div');
        errorEl.className = 'modal-error-message';
        errorEl.textContent = message;
        modal.insertBefore(errorEl, form);
        setTimeout(() => errorEl.remove(), 4000);
    }

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

    /**
     * Public: Open Modal
     */
    window.openAuthModal = function(tab = 'login') {
        const modal = document.getElementById('auth-modal');
        if (!modal) {
            createAuthModal();
        }
        const authModal = document.getElementById('auth-modal');
        authModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        if (tab === 'register') {
            authModal.querySelectorAll('.auth-modal-tab')[1].click();
        }
    };

    window.closeAuthModal = function() {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    };

    /**
     * Initialize
     */
    function init() {
        initAuthModal();

        // Find and hook login/register buttons in header
        const loginBtn = document.querySelector('a[href*="auth"], a[href*="login"], .login-link, [data-auth="login"]');
        const registerBtn = document.querySelector('[data-auth="register"]');

        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.openAuthModal('login');
            });
        }

        if (registerBtn) {
            registerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.openAuthModal('register');
            });
        }

        // Listen for custom events
        document.addEventListener('open-auth-modal', (e) => {
            window.openAuthModal(e.detail?.tab || 'login');
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
