(function () {
    'use strict';

    const els = {};

    function activateTab(name) {
        const isRegister = name === 'register';
        els.tabLogin.setAttribute('aria-selected', isRegister ? 'false' : 'true');
        els.tabRegister.setAttribute('aria-selected', isRegister ? 'true' : 'false');
        els.tabLogin.tabIndex = isRegister ? -1 : 0;
        els.tabRegister.tabIndex = isRegister ? 0 : -1;
        els.formLogin.hidden = isRegister;
        els.formRegister.hidden = !isRegister;
        if (isRegister) document.getElementById('reg-name').focus();
        else document.getElementById('login-email').focus();
    }

    function safeRedirect() {
        const target = window.ui.getParam('redirect') || '';
        if (!target) return 'dashboard.html';
        if (target.includes('//') || target.includes(':')) return 'dashboard.html';
        if (target.startsWith('/')) return 'dashboard.html';
        return target;
    }

    function togglePassword(button) {
        const id = button.getAttribute('data-toggle-password');
        const input = document.getElementById(id);
        if (!input) return;
        if (input.type === 'password') {
            input.type = 'text';
            button.textContent = 'Hide';
            button.setAttribute('aria-label', 'Hide password');
        } else {
            input.type = 'password';
            button.textContent = 'Show';
            button.setAttribute('aria-label', 'Show password');
        }
    }

    function firstName(name) { return (name || '').trim().split(/\s+/)[0] || ''; }

    function wireLogin() {
        const schema = {
            'login-email': [window.validation.required('Email'), window.validation.email()],
            'login-password': [window.validation.required('Password')]
        };
        window.validation.attachLiveValidation(els.formLogin, schema);
        els.formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            window.validation.showServerError(els.formLogin, '');
            if (!window.validation.validateForm(els.formLogin, schema)) return;
            const btn = document.getElementById('login-submit');
            window.ui.setButtonLoading(btn, true, 'Signing in…');
            try {
                const payload = {
                    email: document.getElementById('login-email').value.trim(),
                    password: document.getElementById('login-password').value
                };
                const { token, user } = await window.api.login(payload);
                window.saveSession(token, user);
                window.ui.setFlash(`Welcome back, ${firstName(user.name)}!`, 'success');
                location.href = safeRedirect();
            } catch (err) {
                const msg = err.status === 401 ? 'Incorrect email or password' : (err.message || 'Could not sign in');
                window.validation.showServerError(els.formLogin, msg);
                window.ui.setButtonLoading(btn, false);
            }
        });
    }

    function wireRegister() {
        const schema = {
            'reg-name': [window.validation.required('Full name'), window.validation.minLength(3, 'Full name')],
            'reg-studentid': [window.validation.required('Student ID')],
            'reg-email': [window.validation.required('Email'), window.validation.email()],
            'reg-password': [window.validation.required('Password'), window.validation.minLength(6, 'Password')],
            'reg-password-confirm': [
                window.validation.required('Confirm password'),
                window.validation.matches('reg-password', 'Passwords do not match')
            ]
        };
        window.validation.attachLiveValidation(els.formRegister, schema);
        els.formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            window.validation.showServerError(els.formRegister, '');
            if (!window.validation.validateForm(els.formRegister, schema)) return;
            const btn = document.getElementById('reg-submit');
            window.ui.setButtonLoading(btn, true, 'Creating account…');
            try {
                const payload = {
                    name: document.getElementById('reg-name').value.trim(),
                    studentId: document.getElementById('reg-studentid').value.trim(),
                    email: document.getElementById('reg-email').value.trim(),
                    password: document.getElementById('reg-password').value
                };
                const { token, user } = await window.api.signup(payload);
                window.saveSession(token, user);
                window.ui.setFlash(`Welcome, ${firstName(user.name)}!`, 'success');
                location.href = safeRedirect();
            } catch (err) {
                if (err.status === 409) {
                    const emailInput = document.getElementById('reg-email');
                    window.validation.fieldError(emailInput, 'An account with this email already exists');
                    emailInput.focus();
                } else {
                    window.validation.showServerError(els.formRegister, err.message || 'Could not create account');
                }
                window.ui.setButtonLoading(btn, false);
            }
        });
    }

    async function renderAuthStack() {
        const slot = document.getElementById('auth-stack');
        if (!slot) return;
        try {
            const events = await window.api.getEvents();
            const picks = events
                .filter((e) => !window.ui.isPastDate(e.date))
                .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
                .slice(0, 2);
            if (!picks.length) return;
            slot.innerHTML = picks.map((e) => window.ui.eventCardHTML(e)).join('');
        } catch (_) {}
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (window.isLoggedIn()) { location.replace('dashboard.html'); return; }
        window.ui.cleanupLegacyStorage();

        els.tabLogin     = document.getElementById('tab-login');
        els.tabRegister  = document.getElementById('tab-register');
        els.formLogin    = document.getElementById('login-form');
        els.formRegister = document.getElementById('register-form');

        els.tabLogin.addEventListener('click', () => activateTab('login'));
        els.tabRegister.addEventListener('click', () => activateTab('register'));

        document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
            btn.addEventListener('click', () => togglePassword(btn));
        });

        activateTab(window.ui.getParam('mode') === 'register' ? 'register' : 'login');

        wireLogin();
        wireRegister();
        renderAuthStack();
    });
})();
