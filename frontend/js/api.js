(function (global) {
    'use strict';

    const API_BASE = global.API_BASE_URL ||
        (['localhost', '127.0.0.1', ''].includes(location.hostname)
            ? 'http://localhost:5000/api'
            : 'https://REPLACE-WITH-DEPLOYED-BACKEND/api');

    const TOKEN_KEY = 'token';
    const USER_KEY = 'user';

    function getToken() {
        try { return localStorage.getItem(TOKEN_KEY) || null; }
        catch (_) { return null; }
    }

    function getCurrentUser() {
        try {
            const raw = localStorage.getItem(USER_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }

    function isLoggedIn() { return !!getToken(); }

    function isAdmin() {
        const u = getCurrentUser();
        return !!u && u.role === 'admin';
    }

    function saveSession(token, user) {
        try {
            localStorage.setItem(TOKEN_KEY, token);
            localStorage.setItem(USER_KEY, JSON.stringify(user));
        } catch (_) {}
    }

    function clearSession() {
        try {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        } catch (_) {}
    }

    async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
        const headers = { 'Accept': 'application/json' };
        if (body !== undefined) headers['Content-Type'] = 'application/json';
        const token = getToken();
        if (auth && token) headers['Authorization'] = `Bearer ${token}`;

        let response;
        try {
            response = await fetch(`${API_BASE}${path}`, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined
            });
        } catch (_) {
            throw new Error('Cannot reach the server. Please check your connection and try again.');
        }

        if (response.status === 204 || response.headers.get('content-length') === '0') {
            if (!response.ok) {
                const err = new Error('Something went wrong');
                err.status = response.status;
                throw err;
            }
            return null;
        }

        let data = null;
        try { data = await response.json(); } catch (_) { data = null; }

        if (!response.ok) {
            if (response.status === 401 && token) clearSession();
            const err = new Error((data && data.error) || 'Something went wrong');
            err.status = response.status;
            err.data = data;
            throw err;
        }

        return data;
    }

    const api = {
        signup(payload) {
            return apiRequest('/signup', { method: 'POST', body: payload });
        },
        login(payload) {
            return apiRequest('/login', { method: 'POST', body: payload });
        },
        getEvents(search = '', category = '') {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (category) params.set('category', category);
            const qs = params.toString();
            return apiRequest(`/events${qs ? `?${qs}` : ''}`);
        },
        getEvent(id) {
            return apiRequest(`/events/${encodeURIComponent(id)}`);
        },
        createEvent(payload) {
            return apiRequest('/events', { method: 'POST', body: payload, auth: true });
        },
        updateEvent(id, payload) {
            return apiRequest(`/events/${encodeURIComponent(id)}`, { method: 'PUT', body: payload, auth: true });
        },
        deleteEvent(id) {
            return apiRequest(`/events/${encodeURIComponent(id)}`, { method: 'DELETE', auth: true });
        },
        registerForEvent(eventId) {
            return apiRequest('/register', { method: 'POST', body: { eventId }, auth: true });
        },
        getRegistrations() {
            return apiRequest('/registrations', { auth: true });
        },
        cancelRegistration(eventId) {
            return apiRequest(`/registrations/${encodeURIComponent(eventId)}`, { method: 'DELETE', auth: true });
        }
    };

    global.API_BASE = API_BASE;
    global.api = api;
    global.getCurrentUser = getCurrentUser;
    global.isLoggedIn = isLoggedIn;
    global.isAdmin = isAdmin;
    global.saveSession = saveSession;
    global.clearSession = clearSession;
})(window);
