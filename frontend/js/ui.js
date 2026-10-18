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

    const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const MONTH_LONG = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const WEEKDAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    const ICON = {
        pin:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
        clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
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
        return `${WEEKDAY[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
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
        if (!name) return '';
        return name.trim().split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
    }

    function categoryLabel(cat) { return CATEGORY_LABELS[(cat || '').toLowerCase()] || cat || ''; }

    function categoryBadge(category) {
        const key = (category || '').toLowerCase();
        return `<span class="badge" data-cat="${escapeHtml(key)}">${escapeHtml(categoryLabel(key))}</span>`;
    }

    function stubHTML(event) {
        const d = parseLocalDate(event.date);
        if (!d) return '';
        return `<div class="stub"><b class="mono">${String(d.getDate()).padStart(2, '0')}</b><span>${MONTHS[d.getMonth()]}</span></div>`;
    }

    function seatsSection(event) {
        const capacity = Number(event.capacity);
        const left = Number(event.seatsLeft);
        if (!Number.isFinite(capacity) || !Number.isFinite(left) || capacity <= 0) return '';
        const taken = Math.max(0, capacity - left);
        const pct = Math.min(100, Math.round((taken / capacity) * 100));
        const low = left > 0 && left < 5;
        const label = left === 0
            ? '<b>Full</b>'
            : (low ? `<b>Only ${left} left</b>` : `<b>${left}</b> of ${capacity} left`);
        return `
            <div class="seats${low ? ' low' : ''}">
                <div class="seats-label"><span>${label}</span><span>${pct}%</span></div>
                <div class="bar"><i style="width:${pct}%"></i></div>
            </div>
        `;
    }

    function metaRow(event) {
        return `<div class="meta"><span>${ICON.pin}${escapeHtml(event.location || '—')}</span>${event.time ? `<span>${ICON.clock}${escapeHtml(event.time)}</span>` : ''}</div>`;
    }

    function eventCardHTML(event, { showAdminActions = false } = {}) {
        const past = isPastDate(event.date);
        const key = (event.category || '').toLowerCase();
        const title = escapeHtml(event.title || 'Untitled event');
        const description = escapeHtml(event.description || '');
        const art = event.image
            ? `<img src="${escapeHtml(event.image)}" alt="${title}" loading="lazy" onerror="this.remove()">`
            : '';
        const adminActions = showAdminActions
            ? `<div class="admin-actions">
                   <a class="btn btn-glass" href="create-event.html?id=${encodeURIComponent(event.id)}" style="min-height:36px;padding:0 .8rem;font-size:.78rem">Edit</a>
                   <button type="button" class="btn btn-danger" data-delete-event="${encodeURIComponent(event.id)}" style="min-height:36px;padding:0 .8rem;font-size:.78rem">Delete</button>
               </div>`
            : '';
        return `
            <article class="ticket glass${past ? ' ended' : ''}" data-cat="${escapeHtml(key)}">
                <div class="ticket-art">${art}${stubHTML(event)}</div>
                <div class="perf"></div>
                <div class="ticket-body">
                    <div class="ticket-top">
                        ${categoryBadge(key)}
                        ${past ? '<span class="badge ended">Ended</span>' : (event.time ? `<span class="mono faint" style="font-size:.74rem">${escapeHtml(event.time.split('–')[0].split('-')[0].trim())}</span>` : '')}
                    </div>
                    <h3><a href="event-details.html?id=${encodeURIComponent(event.id)}">${title}</a></h3>
                    <p class="desc">${description}</p>
                    ${metaRow(event)}
                    <div class="ticket-foot">
                        ${seatsSection(event) || '<span class="faint" style="font-size:.84rem">Seats TBA</span>'}
                        ${adminActions || '<span class="go">Details →</span>'}
                    </div>
                </div>
            </article>
        `;
    }

    function skeletonCards(n = 3) {
        return Array.from({ length: n }).map(() => `
            <article class="ticket glass skel-card">
                <div class="ticket-art skel skel-art"></div>
                <div class="perf"></div>
                <div class="ticket-body skel-body">
                    <div class="skel" style="height:14px;width:40%"></div>
                    <div class="skel" style="height:20px;width:85%"></div>
                    <div class="skel" style="height:12px;width:100%"></div>
                    <div class="skel" style="height:12px;width:70%"></div>
                </div>
            </article>
        `).join('');
    }

    function emptyStateHTML({ icon = '✦', title, text, actionHTML = '' }) {
        return `
            <div class="empty glass" style="grid-column:1/-1">
                <div class="ring" aria-hidden="true">${escapeHtml(icon)}</div>
                <h3>${escapeHtml(title)}</h3>
                <p class="muted">${escapeHtml(text)}</p>
                ${actionHTML}
            </div>
        `;
    }

    function errorStateHTML(message) {
        return `
            <div class="empty glass" style="grid-column:1/-1">
                <div class="ring" aria-hidden="true">!</div>
                <h3>Something went wrong</h3>
                <p class="muted">${escapeHtml(message || 'Please try again.')}</p>
                <button type="button" class="btn btn-glass" data-retry>Try again</button>
            </div>
        `;
    }

    function headerNavLinks(activePage) {
        const links = [
            { href: 'index.html',   label: 'Home',     key: 'home' },
            { href: 'events.html',  label: 'Events',   key: 'events' }
        ];
        if (global.isLoggedIn()) links.push({ href: 'dashboard.html', label: 'Dashboard', key: 'dashboard' });
        if (global.isAdmin())    links.push({ href: 'create-event.html', label: 'Create Event', key: 'create' });
        return links.map((l) => {
            const curr = l.key === activePage ? ' aria-current="page"' : '';
            return `<a class="nav-link" href="${l.href}"${curr}>${escapeHtml(l.label)}</a>`;
        }).join('');
    }

    function headerAuth(user) {
        if (user) {
            return `
                <div class="nav-user">
                    <span class="avatar-sm">${escapeHtml(initials(user.name))}</span>
                    <span>${escapeHtml((user.name || '').split(' ')[0] || 'Account')}</span>
                </div>
                <button type="button" class="btn btn-glass" data-signout>Sign out</button>
            `;
        }
        return `
            <a class="btn btn-ghost" href="login.html">Sign in</a>
            <a class="btn btn-primary" href="login.html?mode=register">Get started</a>
        `;
    }

    function mobileLinks(activePage) {
        const links = [
            { href: 'index.html',   label: 'Home',     key: 'home' },
            { href: 'events.html',  label: 'Events',   key: 'events' }
        ];
        if (global.isLoggedIn()) links.push({ href: 'dashboard.html', label: 'Dashboard', key: 'dashboard' });
        if (global.isAdmin())    links.push({ href: 'create-event.html', label: 'Create Event', key: 'create' });
        return links.map((l) => {
            const curr = l.key === activePage ? ' aria-current="page"' : '';
            return `<a class="nav-link" href="${l.href}"${curr} data-nav-link>${escapeHtml(l.label)}</a>`;
        }).join('');
    }

    function mobileAuth(user) {
        if (user) {
            return `<div class="row"><button type="button" class="btn btn-glass btn-block" data-signout>Sign out</button></div>`;
        }
        return `
            <div class="row">
                <a class="btn btn-glass" href="login.html">Sign in</a>
                <a class="btn btn-primary" href="login.html?mode=register">Get started</a>
            </div>
        `;
    }

    function renderHeader(activePage) {
        const slot = document.getElementById('site-header');
        if (!slot) return;
        const user = global.getCurrentUser();
        slot.innerHTML = `
            <div class="nav-shell">
                <div class="wrap">
                    <div class="nav glass" role="navigation" aria-label="Main">
                        <a class="brand" href="index.html" aria-label="CampusHub home">
                            <span class="brand-mark" aria-hidden="true">C</span>
                            <span>CampusHub<small>${escapeHtml(UNIVERSITY_NAME)}</small></span>
                        </a>
                        <nav class="nav-links" aria-label="Primary">
                            ${headerNavLinks(activePage)}
                        </nav>
                        <div class="nav-actions">
                            ${headerAuth(user)}
                            <button class="menu-btn" id="mobile-nav-toggle" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-nav" type="button"><span></span><span></span><span></span></button>
                        </div>
                    </div>
                    <div class="mobile-menu glass" id="mobile-nav">
                        ${mobileLinks(activePage)}
                        ${mobileAuth(user)}
                    </div>
                </div>
            </div>
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
            <footer>
                <div class="wrap">
                    <div class="foot glass">
                        <span>© ${year} CampusHub · ${escapeHtml(UNIVERSITY_NAME)} Campus Event Management System</span>
                        <nav aria-label="Footer">
                            <a href="events.html">Events</a>
                            ${loggedIn ? '<a href="dashboard.html">Dashboard</a>' : '<a href="login.html">Sign in</a>'}
                        </nav>
                    </div>
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
        el.className = `toast glass ${type}`;
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
                <div class="modal glass" tabindex="-1">
                    <h2>${escapeHtml(title)}</h2>
                    <p class="muted">${escapeHtml(message)}</p>
                    <div class="actions">
                        <button type="button" class="btn btn-ghost" data-cancel>${escapeHtml(cancelText)}</button>
                        <button type="button" class="${danger ? 'btn btn-danger' : 'btn btn-primary'}" data-confirm>${escapeHtml(confirmText)}</button>
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
            btn.innerHTML = `<span class="dot" style="width:10px;height:10px;border-radius:50%;background:currentColor;opacity:.6;animation:toastIn .6s infinite alternate"></span>${escapeHtml(loadingText || 'Working…')}`;
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

    function ensureGlows() {
        if (document.querySelector('.glow.a')) return;
        const a = document.createElement('div'); a.className = 'glow a'; a.setAttribute('aria-hidden', 'true');
        const b = document.createElement('div'); b.className = 'glow b'; b.setAttribute('aria-hidden', 'true');
        document.body.prepend(b);
        document.body.prepend(a);
    }

    function onReady() {
        ensureGlows();
        renderHeader(activePageFromPath());
        renderFooter();
        consumeFlash();
    }

    global.ui = {
        UNIVERSITY_NAME,
        CATEGORY_LABELS,
        CATEGORY_KEYS,
        ICON,
        escapeHtml,
        formatDate,
        todayISO,
        isPastDate,
        parseLocalDate,
        getParam,
        debounce,
        initials,
        categoryLabel,
        categoryBadge,
        stubHTML,
        seatsSection,
        metaRow,
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
