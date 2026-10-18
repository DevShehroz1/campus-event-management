(function (global) {
    'use strict';

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const URL_RE = /^(https?:)?\/\/\S+$/i;

    function required(label) {
        return (value) => (value && String(value).trim()) ? '' : `${label} is required`;
    }

    function email() {
        return (value) => (!value || EMAIL_RE.test(String(value).trim())) ? '' : 'Enter a valid email address';
    }

    function minLength(n, label) {
        return (value) => (!value || String(value).length >= n) ? '' : `${label} must be at least ${n} characters`;
    }

    function matches(otherInputId, message) {
        return (value) => {
            const other = document.getElementById(otherInputId);
            if (!other) return '';
            return (String(value) === String(other.value)) ? '' : (message || 'Values do not match');
        };
    }

    function positiveInteger(label) {
        return (value) => {
            if (value === '' || value === null || value === undefined) return '';
            const n = Number(value);
            if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return `${label} must be a positive whole number`;
            return '';
        };
    }

    function notPastDate() {
        return (value) => {
            if (!value) return '';
            const d = window.ui.formatDate ? null : null;
            const parts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (!parts) return 'Enter a valid date';
            const date = new Date(parseInt(parts[1], 10), parseInt(parts[2], 10) - 1, parseInt(parts[3], 10));
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return (date >= today) ? '' : 'Date cannot be in the past';
        };
    }

    function url() {
        return (value) => (!value || URL_RE.test(String(value).trim())) ? '' : 'Enter a valid URL';
    }

    function oneOf(values, label) {
        return (value) => (!value || values.includes(String(value))) ? '' : `${label} must be one of: ${values.join(', ')}`;
    }

    function fieldError(input, message) {
        const errorId = `${input.id}-error`;
        let errorEl = document.getElementById(errorId);
        if (message) {
            if (!errorEl) {
                errorEl = document.createElement('p');
                errorEl.id = errorId;
                errorEl.className = 'text-rose-400 text-xs mt-1.5';
                if (input.parentElement) input.parentElement.appendChild(errorEl);
            }
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            input.classList.add('border-rose-500');
            input.classList.remove('border-stone-200');
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', errorId);
        } else {
            if (errorEl) {
                errorEl.textContent = '';
                errorEl.classList.add('hidden');
            }
            input.classList.remove('border-rose-500');
            if (!input.classList.contains('border-stone-200')) input.classList.add('border-stone-200');
            input.removeAttribute('aria-invalid');
            input.removeAttribute('aria-describedby');
        }
    }

    function runRules(value, rules) {
        for (let i = 0; i < rules.length; i++) {
            const msg = rules[i](value);
            if (msg) return msg;
        }
        return '';
    }

    function validateForm(form, schema) {
        let firstInvalid = null;
        Object.keys(schema).forEach((inputId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            const value = input.type === 'checkbox' ? (input.checked ? 'on' : '') : input.value;
            const message = runRules(value, schema[inputId]);
            fieldError(input, message);
            if (message && !firstInvalid) firstInvalid = input;
        });
        if (firstInvalid && firstInvalid.focus) firstInvalid.focus();
        return !firstInvalid;
    }

    function attachLiveValidation(form, schema) {
        Object.keys(schema).forEach((inputId) => {
            const input = document.getElementById(inputId);
            if (!input) return;
            let touched = false;
            const check = () => {
                const value = input.type === 'checkbox' ? (input.checked ? 'on' : '') : input.value;
                fieldError(input, runRules(value, schema[inputId]));
            };
            input.addEventListener('blur', () => {
                touched = true;
                check();
            });
            input.addEventListener('input', () => {
                if (touched) check();
            });
        });
    }

    function showServerError(form, message) {
        if (!form) return;
        let box = form.querySelector('[data-server-error]');
        if (!box) {
            box = document.createElement('div');
            box.setAttribute('data-server-error', '');
            box.className = 'bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl px-4 py-3 mb-4';
            box.setAttribute('role', 'alert');
            form.insertBefore(box, form.firstChild);
        }
        if (message) {
            box.textContent = message;
            box.classList.remove('hidden');
        } else {
            box.textContent = '';
            box.classList.add('hidden');
        }
    }

    global.validation = {
        required, email, minLength, matches, positiveInteger, notPastDate, url, oneOf,
        validateForm, attachLiveValidation, showServerError, fieldError
    };
})(window);
