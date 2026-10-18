(function () {
    'use strict';

    const els = {};

    function activateTab(name) {
        const isRegister = name === 'register';
        els.tabLogin.setAttribute('aria-selected', isRegister ? 'false' : 'true');
        els.tabRegister.setAttribute('aria-selected', isRegister ? 'true' : 'false');
        els.tabLogin.tabIndex = isRegister ? -1 : 0;
        els.tabRegister.tabIndex = isRegister ? 0 : -1;
        els.tabLogin.className = tabClass(!isRegister);
        els.tabRegister.className = tabClass(isRegister);
        els.formLogin.classList.toggle('hidden', isRegister);
        els.formRegister.classList.toggle('hidden', !isRegister);
        if (isRegister) {
            document.getElementById('reg-name').focus();
        } else {
            document.getElementById('login-email').focus();
        }
    }

    function tabClass(active) {
        const base = 'flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all min-h-[44px]';
        return active
            ? `${base} text-white bg-orange-600 shadow-lg shadow-orange-600/20`
            : `${base} text-slate-400 hover:text-white`;
    }

    function safeRedirect() {
        const target = window.ui.getParam('redirect') || '';
        if (!target) return 'dashboard.html';
        if (target.includes('//') || target.includes(':')) return 'dashboard.html';
        if (target.startsWith('/')) return 'dashboard.html';
        return target;
    }

    function togglePassword(button) {
        const targetId = button.getAttribute('data-toggle-password');
        const input = document.getElementById(targetId);
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

    function firstName(name) {
        return (name || '').trim().split(/\s+/)[0] || '';
    }

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
            window.ui.setButtonLoading(btn, true, 'Signing in...');
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
            window.ui.setButtonLoading(btn, true, 'Creating account...');
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

    document.addEventListener('DOMContentLoaded', () => {
        if (window.isLoggedIn()) {
            location.replace('dashboard.html');
            return;
        }
        window.ui.cleanupLegacyStorage();

        els.tabLogin = document.getElementById('tab-login');
        els.tabRegister = document.getElementById('tab-register');
        els.formLogin = document.getElementById('login-form');
        els.formRegister = document.getElementById('register-form');

        els.tabLogin.addEventListener('click', () => activateTab('login'));
        els.tabRegister.addEventListener('click', () => activateTab('register'));

        document.querySelectorAll('[data-toggle-password]').forEach((btn) => {
            btn.addEventListener('click', () => togglePassword(btn));
        });

        const initialTab = window.ui.getParam('mode') === 'register' ? 'register' : 'login';
        activateTab(initialTab);

        wireLogin();
        wireRegister();
    });
})();
