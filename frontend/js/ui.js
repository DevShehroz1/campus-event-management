(function (global) {
    'use strict';

    const UNIVERSITY_NAME = 'Riverside University';

    const CATEGORY_LABELS = {
        workshop: 'Workshop',
        seminar: 'Seminar',
        competition: 'Competition',
        sports: 'Sports',
        conference: 'Conference',
        society: 'Society'
    };
    const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);
    const CATEGORY_ICONS = {
        workshop: '🛠',
        seminar: '🎤',
        competition: '🏆',
        sports: '⚽',
        conference: '🏛',
        society: '🎨'
    };

    const MONTH_LONG = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const WEEKDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const ICON = {
        pin:    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
        clock:  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
        calendar:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="16" y1="3" x2="16" y2="7"/></svg>'
    };

    const LEGACY_KEYS = ['isLoggedIn','currentUserEmail','userName','userDept','campusEvents','campusAccounts'];
    function cleanupLegacyStorage() {
        try {
            LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('myRegistrations_')) localStorage.removeItem(key);
            }
        } catch (_) {}
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function parseLocalDate(iso) {
        if (!iso || typeof iso !== 'string') return null;
        const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    }

    function formatDate(iso) {
        const d = parseLocalDate(iso);
        if (!d) return '';
        return `${MONTH_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    function formatDateLong(iso) {
        const d = parseLocalDate(iso);
        if (!d) return '';
        return `${WEEKDAY[d.getDay()]}, ${MONTH_LONG[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    function todayISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function isPastDate(iso) {
        const d = parseLocalDate(iso);
        if (!d) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
    }

    function getParam(name) { return new URLSearchParams(location.search).get(name); }

    function debounce(fn, ms) {
        let t;
        return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms); };
    }

    function initials(name) {
        if (!name) return '?';
        return name.trim().split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
    }

    function categoryLabel(cat) { return CATEGORY_LABELS[(cat || '').toLowerCase()] || (cat || ''); }

    function categoryBadge(category) {
        const key = (category || '').toLowerCase();
        return `<span class="badge" data-cat="${escapeHtml(key)}">${escapeHtml(categoryLabel(key))}</span>`;
    }

    function seatsBadge(event) {
        const left = Number(event.seatsLeft);
        if (!Number.isFinite(left)) return '<span class="badge plain">Seats TBA</span>';
        if (left === 0) return '<span class="badge danger">Full</span>';
        if (left < 5) return `<span class="badge warn">${left} left</span>`;
        return `<span class="badge plain">${left} seats</span>`;
    }

    function seatsBar(event) {
        const left = Number(event.seatsLeft);
        const cap = Number(event.capacity);
        if (!Number.isFinite(left) || !Number.isFinite(cap) || cap <= 0) return '';
        const taken = Math.max(0, cap - left);
        const pct = Math.min(100, Math.round((taken / cap) * 100));
        return `<div class="bar${left > 0 && left < 5 ? ' low' : ''}"><i style="width:${pct}%"></i></div>`;
    }

    function eventCardHTML(event, { showAdminActions = false } = {}) {
        const past = isPastDate(event.date);
        const key = (event.category || '').toLowerCase();
        const title = escapeHtml(event.title || 'Untitled event');
        const description = escapeHtml(event.description || '');
        const location = escapeHtml(event.location || '—');
        const dateLabel = formatDate(event.date);
        const image = event.image
            ? `<img src="${escapeHtml(event.image)}" alt="${title}" loading="lazy" onerror="this.outerHTML='<div class=\\'placeholder\\'>${escapeHtml(categoryLabel(key)) || 'event'}</div>'">`
            : `<div class="placeholder">${escapeHtml(categoryLabel(key)) || 'event'}</div>`;

        const topBadges = past
            ? `<div class="top-badges"><span class="badge plain">Ended</span></div>`
            : '';

        const adminActions = showAdminActions
            ? `<div class="admin-actions">
                   <a class="btn btn-outline btn-sm" href="create-event.html?id=${encodeURIComponent(event.id)}">Edit</a>
                   <button type="button" class="btn btn-danger-solid btn-sm" data-delete-event="${encodeURIComponent(event.id)}">Delete</button>
               </div>`
            : '';

        return `
            <article class="event-card${past ? ' ended' : ''}">
                <div class="image">
                    ${image}
                    ${topBadges}
                    ${adminActions}
                </div>
                <div class="body">
                    <div class="top-row">
                        ${categoryBadge(key)}
                        <span>${escapeHtml(dateLabel)}</span>
                    </div>
                    <h3 class="title"><a href="event-details.html?id=${encodeURIComponent(event.id)}">${title}</a></h3>
                    <p class="desc">${description}</p>
                    <div class="foot">
                        <span class="meta">${ICON.pin}<span>${location}</span></span>
                        ${seatsBadge(event)}
                    </div>
                </div>
            </article>
        `;
    }

    function skeletonCards(n = 3) {
        return Array.from({ length: n }).map(() => `
            <div class="skel-card">
                <div class="skel skel-art"></div>
                <div class="skel-body">
                    <div class="skel" style="height:12px;width:35%"></div>
                    <div class="skel" style="height:18px;width:80%"></div>
                    <div class="skel" style="height:12px;width:100%"></div>
                    <div class="skel" style="height:12px;width:60%"></div>
                </div>
            </div>
        `).join('');
    }

    function emptyStateHTML({ icon = '✦', title, text, actionHTML = '' }) {
        return `
            <div class="empty">
                <div class="glyph" aria-hidden="true">${escapeHtml(icon)}</div>
                <h3>${escapeHtml(title)}</h3>
                <p>${escapeHtml(text)}</p>
                ${actionHTML}
            </div>
        `;
    }

    function errorStateHTML(message) {
        return `
            <div class="error-state">
                <div class="glyph" aria-hidden="true">!</div>
                <h3>Something went wrong</h3>
                <p>${escapeHtml(message || 'Please try again.')}</p>
                <button type="button" class="btn btn-outline" data-retry>Try again</button>
            </div>
        `;
    }

    function navLinkHTML(href, label, active, data) {
        const curr = active ? ' aria-current="page"' : '';
        const attrs = data ? ' data-nav-link' : '';
        return `<a class="nav-link" href="${href}"${curr}${attrs}>${escapeHtml(label)}</a>`;
    }

    function headerAuth(user) {
        if (user) {
            const first = (user.name || '').split(' ')[0] || 'Account';
            return `
                <span class="header-user">
                    <span class="avatar-sm" aria-hidden="true">${escapeHtml(initials(user.name))}</span>
                    <span class="header-user-name">${escapeHtml(first)}</span>
                </span>
                <button type="button" class="btn btn-outline btn-sm" data-signout>Sign out</button>
            `;
        }
        return `
            <a class="btn btn-ghost btn-sm" href="login.html">Sign in</a>
            <a class="btn btn-primary btn-sm" href="login.html?mode=register">Create account</a>
        `;
    }

    function mobileAuth(user) {
        if (user) {
            return `<div class="mobile-auth"><button type="button" class="btn btn-outline btn-block" data-signout>Sign out</button></div>`;
        }
        return `
            <div class="mobile-auth">
                <a class="btn btn-outline btn-block" href="login.html">Sign in</a>
                <a class="btn btn-primary btn-block" href="login.html?mode=register">Create account</a>
            </div>
        `;
    }

    function renderHeader(activePage) {
        const slot = document.getElementById('site-header');
        if (!slot) return;
        const user = global.getCurrentUser();
        const links = [
            { href: 'index.html',  label: 'Home',   key: 'home' },
            { href: 'events.html', label: 'Events', key: 'events' }
        ];
        if (global.isLoggedIn()) links.push({ href: 'dashboard.html', label: 'Dashboard', key: 'dashboard' });
        if (global.isAdmin())    links.push({ href: 'create-event.html', label: 'Create event', key: 'create' });

        slot.innerHTML = `
            <header class="site-header">
                <div class="wrap header-row">
                    <a class="brand" href="index.html" aria-label="CampusHub home">
                        <span class="brand-mark" aria-hidden="true">C</span>
                        <span class="brand-name">CampusHub</span>
                    </a>
                    <nav class="primary-nav" aria-label="Primary">
                        ${links.map((l) => navLinkHTML(l.href, l.label, l.key === activePage)).join('')}
                    </nav>
                    <div class="header-actions">
                        ${headerAuth(user)}
                        <button class="menu-btn" id="mobile-nav-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav" type="button"><span></span><span></span><span></span></button>
                    </div>
                </div>
                <div class="mobile-nav" id="mobile-nav">
                    ${links.map((l) => navLinkHTML(l.href, l.label, l.key === activePage, true)).join('')}
                    ${mobileAuth(user)}
                </div>
            </header>
        `;
        wireMobileNav();
        wireSignOut();
    }

    function wireMobileNav() {
        const btn = document.getElementById('mobile-nav-toggle');
        const panel = document.getElementById('mobile-nav');
        if (!btn || !panel) return;
        const close = () => { panel.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
        const open  = () => { panel.classList.add('open');    btn.setAttribute('aria-expanded', 'true');  };
        btn.addEventListener('click', (e) => { e.stopPropagation(); panel.classList.contains('open') ? close() : open(); });
        panel.addEventListener('click', (e) => { if (e.target.closest('[data-nav-link]')) close(); });
        document.addEventListener('click', (e) => {
            if (!panel.classList.contains('open')) return;
            if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close();
        });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });
    }

    function wireSignOut() {
        document.querySelectorAll('[data-signout]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                global.clearSession();
                setFlash('You have been signed out', 'info');
                location.href = 'index.html';
            });
        });
    }

    function renderFooter() {
        const slot = document.getElementById('site-footer');
        if (!slot) return;
        const loggedIn = global.isLoggedIn();
        const year = new Date().getFullYear();
        slot.innerHTML = `
            <footer class="site-footer">
                <div class="wrap">
                    <span>© ${year} CampusHub · ${escapeHtml(UNIVERSITY_NAME)}</span>
                    <nav aria-label="Footer">
                        <a href="events.html">Events</a>
                        ${loggedIn ? '<a href="dashboard.html">Dashboard</a>' : '<a href="login.html">Sign in</a>'}
                    </nav>
                </div>
            </footer>
        `;
    }

    function getToastRoot() {
        let c = document.getElementById('toasts');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toasts';
            c.className = 'toasts';
            c.setAttribute('role', 'status');
            c.setAttribute('aria-live', 'polite');
            document.body.appendChild(c);
        }
        return c;
    }

    function showToast(message, type = 'success') {
        const root = getToastRoot();
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.innerHTML = `<span class="dot" aria-hidden="true"></span><p>${escapeHtml(message)}</p><button type="button" class="close" aria-label="Dismiss">×</button>`;
        const close = () => el.remove();
        el.querySelector('.close').addEventListener('click', close);
        root.appendChild(el);
        setTimeout(close, 3500);
    }

    function setFlash(message, type = 'success') {
        try { sessionStorage.setItem('flash', JSON.stringify({ message, type })); } catch (_) {}
    }
    function consumeFlash() {
        try {
            const raw = sessionStorage.getItem('flash');
            if (!raw) return;
            sessionStorage.removeItem('flash');
            const { message, type } = JSON.parse(raw);
            if (message) showToast(message, type || 'info');
        } catch (_) {}
    }

    function showConfirm({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
        return new Promise((resolve) => {
            const previouslyFocused = document.activeElement;
            const root = document.createElement('div');
            root.className = 'scrim';
            root.setAttribute('role', 'dialog');
            root.setAttribute('aria-modal', 'true');
            root.innerHTML = `
                <div class="modal" tabindex="-1">
                    <h2>${escapeHtml(title)}</h2>
                    <p>${escapeHtml(message)}</p>
                    <div class="actions">
                        <button type="button" class="btn btn-outline" data-cancel>${escapeHtml(cancelText)}</button>
                        <button type="button" class="${danger ? 'btn btn-danger-solid' : 'btn btn-primary'}" data-confirm>${escapeHtml(confirmText)}</button>
                    </div>
                </div>
            `;
            const close = (result) => {
                document.removeEventListener('keydown', onKey);
                root.remove();
                if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
                resolve(result);
            };
            const onKey = (e) => { if (e.key === 'Escape') close(false); };
            root.addEventListener('click', (e) => { if (e.target === root) close(false); });
            root.querySelector('[data-cancel]').addEventListener('click', () => close(false));
            root.querySelector('[data-confirm]').addEventListener('click', () => close(true));
            document.addEventListener('keydown', onKey);
            document.body.appendChild(root);
            root.querySelector('[data-confirm]').focus();
        });
    }

    function setButtonLoading(btn, isLoading, loadingText) {
        if (!btn) return;
        if (isLoading) {
            if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.setAttribute('aria-busy', 'true');
            btn.textContent = loadingText || 'Working…';
        } else {
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }
        }
    }

    function requireAuth() {
        if (global.isLoggedIn()) return true;
        const target = location.pathname.split('/').pop() + location.search;
        location.replace(`login.html?redirect=${encodeURIComponent(target)}`);
        return false;
    }
    function requireAdmin() {
        if (!requireAuth()) return false;
        if (!global.isAdmin()) {
            setFlash('Only administrators can access that page', 'error');
            location.replace('dashboard.html');
            return false;
        }
        return true;
    }

    async function confirmAndDeleteEvent(event, onDone) {
        const ok = await showConfirm({
            title: `Delete "${event.title}"?`,
            message: 'This also removes all its registrations.',
            confirmText: 'Delete',
            cancelText: 'Keep event',
            danger: true
        });
        if (!ok) return;
        try {
            await global.api.deleteEvent(event.id);
            showToast(`Deleted "${event.title}"`, 'success');
            if (typeof onDone === 'function') onDone();
        } catch (err) {
            showToast(err.message || 'Could not delete event', 'error');
        }
    }

    function activePageFromPath() {
        const p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (p === '' || p === 'index.html') return 'home';
        if (p === 'events.html') return 'events';
        if (p === 'event-details.html') return 'events';
        if (p === 'dashboard.html') return 'dashboard';
        if (p === 'create-event.html') return 'create';
        if (p === 'login.html') return 'auth';
        return '';
    }

    function onReady() {
        renderHeader(activePageFromPath());
        renderFooter();
        consumeFlash();
    }

    global.ui = {
        UNIVERSITY_NAME,
        CATEGORY_LABELS,
        CATEGORY_KEYS,
        CATEGORY_ICONS,
        ICON,
        escapeHtml,
        formatDate,
        formatDateLong,
        todayISO,
        isPastDate,
        parseLocalDate,
        getParam,
        debounce,
        initials,
        categoryLabel,
        categoryBadge,
        seatsBadge,
        seatsBar,
        eventCardHTML,
        skeletonCards,
        emptyStateHTML,
        errorStateHTML,
        renderHeader,
        renderFooter,
        showToast,
        setFlash,
        showConfirm,
        setButtonLoading,
        requireAuth,
        requireAdmin,
        confirmAndDeleteEvent,
        cleanupLegacyStorage
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})(window);
