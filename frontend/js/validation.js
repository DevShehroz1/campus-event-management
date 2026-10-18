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

    function fieldOf(input) {
        return input.closest('.field') || input.parentElement;
    }

    function fieldError(input, message) {
        const field = fieldOf(input);
        const errorId = `${input.id}-error`;
        let err = document.getElementById(errorId);
        if (message) {
            if (!err) {
                err = document.createElement('span');
                err.id = errorId;
                err.className = 'error';
                field.appendChild(err);
            }
            err.textContent = message;
            err.hidden = false;
            if (field) field.classList.add('invalid');
            input.setAttribute('aria-invalid', 'true');
            input.setAttribute('aria-describedby', errorId);
        } else {
            if (err) { err.textContent = ''; err.hidden = true; }
            if (field) field.classList.remove('invalid');
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
            input.addEventListener('blur', () => { touched = true; check(); });
            input.addEventListener('input', () => { if (touched) check(); });
        });
    }

    function showServerError(form, message) {
        if (!form) return;
        let box = form.querySelector('[data-server-error]');
        if (!box) {
            box = document.createElement('div');
            box.setAttribute('data-server-error', '');
            box.setAttribute('role', 'alert');
            box.className = 'server-error';
            form.insertBefore(box, form.firstChild);
        }
        if (message) {
            box.textContent = message;
            box.hidden = false;
        } else {
            box.textContent = '';
            box.hidden = true;
        }
    }

    global.validation = {
        required, email, minLength, matches, positiveInteger, notPastDate, url, oneOf,
        validateForm, attachLiveValidation, showServerError, fieldError
    };
})(window);
