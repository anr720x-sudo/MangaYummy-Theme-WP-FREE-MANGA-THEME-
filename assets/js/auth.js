/**
 * Authentication JS - Login/Register Forms
 */

document.addEventListener('DOMContentLoaded', function() {
  // ===== LOGIN FORM =====
  const loginForm = document.getElementById('ya-login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleLogin(this);
    });
  }

  // ===== REGISTER FORM =====
  const registerForm = document.getElementById('ya-register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
      e.preventDefault();
      handleRegister(this);
    });
  }

  // Show/hide password toggle
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
      const input = this.previousElementSibling;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      this.innerHTML = isPassword ? 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>' : 
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    });
  });
});

/**
 * Handle Login
 */
function handleLogin(form) {
  const username = form.querySelector('input[name="username"]').value.trim();
  const password = form.querySelector('input[name="password"]').value;
  const remember = form.querySelector('input[name="remember"]')?.checked || false;
  const messageBox = form.querySelector('.ya-message');

  if (!username || !password) {
    showMessage(messageBox, 'Fill in all fields.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('action', 'ya_login');
  formData.append('nonce', ya_auth_vars.nonce);
  formData.append('username', username);
  formData.append('password', password);
  formData.append('remember', remember);

  fetch(ya_auth_vars.ajax_url, {
    method: 'POST',
    body: formData,
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        showMessage(messageBox, data.data.message, 'success');
        form.reset();
        if (data.data.redirect) {
          setTimeout(() => {
            window.location.href = data.data.redirect;
          }, 800);
        }
      } else {
        showMessage(messageBox, data.data.message, 'error');
      }
    })
    .catch(err => {
      showMessage(messageBox, 'Connection error.', 'error');
    });
}

/**
 * Handle Register
 */
function handleRegister(form) {
  const email = form.querySelector('input[name="email"]').value.trim();
  const username = form.querySelector('input[name="username"]').value.trim();
  const password = form.querySelector('input[name="password"]').value;
  const passwordConfirm = form.querySelector('input[name="password_confirm"]').value;
  const agreeTerms = form.querySelector('input[name="agree_terms"]')?.checked || false;
  const turnstileToken = form.querySelector('input[name="cf-turnstile-response"]')?.value 
    || form.querySelector('textarea[name="cf-turnstile-response"]')?.value 
    || '';
  const messageBox = form.querySelector('.ya-message');

  if (!email || !username || !password || !passwordConfirm) {
    showMessage(messageBox, 'Fill in all fields.', 'error');
    return;
  }

  if (!turnstileToken) {
    showMessage(messageBox, 'Complete the Cloudflare verification.', 'error');
    return;
  }

  const formData = new FormData();
  formData.append('action', 'ya_register');
  formData.append('nonce', ya_auth_vars.nonce);
  formData.append('email', email);
  formData.append('username', username);
  formData.append('password', password);
  formData.append('password_confirm', passwordConfirm);
  formData.append('cf_turnstile_response', turnstileToken);
  if (agreeTerms) formData.append('agree_terms', '1');

  fetch(ya_auth_vars.ajax_url, {
    method: 'POST',
    body: formData,
  })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        showMessage(messageBox, data.data.message, 'success');
        form.reset();
        setTimeout(() => {
          window.location.reload();
        }, 800);
      } else {
        showMessage(messageBox, data.data.message, 'error');
      }
    })
    .catch(err => {
      showMessage(messageBox, 'Connection error.', 'error');
    });
}

// ===== FORGOT PASSWORD =====
document.addEventListener('DOMContentLoaded', function() {
  const forgotForm = document.getElementById('ya-forgot-form');
  if (!forgotForm) return;

  forgotForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = forgotForm.querySelector('input[name="email"]')?.value.trim() || '';
    const messageBox = forgotForm.querySelector('.ya-message');

    if (!email) {
      showMessage(messageBox, 'Enter your email.', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('action', 'ya_forgot_password');
    formData.append('nonce', ya_auth_vars.nonce);
    formData.append('email', email);

    fetch(ya_auth_vars.ajax_url, {
      method: 'POST',
      body: formData,
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          showMessage(messageBox, data.data.message, 'success');
          forgotForm.reset();
        } else {
          showMessage(messageBox, data.data.message, 'error');
        }
      })
      .catch(() => {
        showMessage(messageBox, 'Connection error.', 'error');
      });
  });
});

/**
 * Show message
 */
function showMessage(element, message, type) {
  if (!element) return;
  element.textContent = message;
  element.className = 'ya-message ya-' + type;
  element.style.display = 'block';
}
