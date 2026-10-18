(function (global) {
    'use strict';

    const UNIVERSITY_NAME = 'University Events Portal';

    const CATEGORY_COLORS = {
        workshop: 'orange',
        seminar: 'violet',
        competition: 'emerald',
        sports: 'sky',
        conference: 'rose',
        society: 'fuchsia'
    };

    const LEGACY_KEYS = [
        'isLoggedIn', 'currentUserEmail', 'userName', 'userDept',
        'campusEvents', 'campusAccounts'
    ];

    function cleanupLegacyStorage() {
        try {
            LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('myRegistrations_')) {
                    localStorage.removeItem(key);
                }
            }
        } catch (_) {}
    }

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    function parseLocalDate(iso) {
        if (!iso || typeof iso !== 'string') return null;
        const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
    }

    function formatDate(iso) {
        const d = parseLocalDate(iso);
        if (!d) return '';
        return `${d.getDate().toString().padStart(2, '0')} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    }

    function todayISO() {
        const d = new Date();
        const m = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${d.getFullYear()}-${m}-${day}`;
    }

    function isPastDate(iso) {
        const d = parseLocalDate(iso);
        if (!d) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d < today;
    }

    function getParam(name) {
        return new URLSearchParams(location.search).get(name);
    }

    function debounce(fn, ms) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), ms);
        };
    }

    function initials(name) {
        if (!name) return '';
        return name.trim().split(/\s+/).map((p) => p[0] || '').join('').slice(0, 2).toUpperCase();
    }

    function categoryBadge(category) {
        const c = (category || '').toLowerCase();
        const color = CATEGORY_COLORS[c] || 'stone';
        return `<span class="inline-flex items-center gap-1 bg-${color}-50 text-${color}-700 border border-${color}-100 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">
            <span class="w-1.5 h-1.5 rounded-full bg-${color}-500" aria-hidden="true"></span>${escapeHtml(c)}
        </span>`;
    }

    function seatsBadge(event) {
        const left = typeof event.seatsLeft === 'number' ? event.seatsLeft : parseInt(event.seatsLeft, 10);
        if (!Number.isFinite(left)) return '';
        if (left === 0) {
            return `<span class="inline-flex items-center bg-rose-50 text-rose-700 border border-rose-100 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">Full</span>`;
        }
        if (left < 5) {
            return `<span class="inline-flex items-center bg-rose-50 text-rose-700 border border-rose-100 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">Only ${left} left</span>`;
        }
        return `<span class="inline-flex items-center bg-stone-50 text-stone-700 border border-stone-200 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">${left} seats left</span>`;
    }

    function headerLinkHTML(href, label, active) {
        const base = 'relative px-3 py-2 text-sm font-medium transition-colors rounded-full';
        const activeCls = active ? 'text-orange-600 bg-orange-50' : 'text-stone-600 hover:text-stone-900';
        return `<a href="${href}" class="${base} ${activeCls}">${escapeHtml(label)}</a>`;
    }

    function renderHeader(activePage) {
        const slot = document.getElementById('site-header');
        if (!slot) return;
        const loggedIn = global.isLoggedIn();
        const user = global.getCurrentUser();
        const admin = global.isAdmin();

        const navLinks = [
            { href: 'index.html', label: 'Home', key: 'home' },
            { href: 'events.html', label: 'Events', key: 'events' }
        ];
        if (loggedIn) navLinks.push({ href: 'dashboard.html', label: 'Dashboard', key: 'dashboard' });
        if (admin) navLinks.push({ href: 'create-event.html', label: 'Create Event', key: 'create' });

        const desktopLinks = navLinks
            .map((l) => headerLinkHTML(l.href, l.label, l.key === activePage))
            .join('');

        const mobileLinks = navLinks
            .map((l) => `<a href="${l.href}" class="block px-4 py-3 rounded-xl text-sm font-medium ${l.key === activePage ? 'text-orange-600 bg-orange-50' : 'text-stone-800 hover:bg-stone-100'}" data-nav-link>${escapeHtml(l.label)}</a>`)
            .join('');

        const authDesktop = loggedIn
            ? `<div class="flex items-center gap-3">
                   <span class="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-sm" aria-hidden="true">${escapeHtml(initials(user && user.name))}</span>
                   <span class="text-sm font-medium text-stone-800 hidden lg:inline">${escapeHtml((user && user.name || '').split(' ')[0])}</span>
                   <button type="button" data-signout class="bg-white border border-stone-200 hover:border-stone-300 text-stone-700 hover:text-stone-900 font-medium rounded-full px-4 py-2 text-sm transition-colors focus-ring">Sign out</button>
               </div>`
            : `<div class="flex items-center gap-2">
                   <a href="login.html" class="text-stone-700 hover:text-stone-900 px-4 py-2 text-sm font-medium transition-colors rounded-full">Sign in</a>
                   <a href="login.html?mode=register" class="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-2.5 text-sm transition-colors elevate-1 focus-ring">Get started</a>
               </div>`;

        const authMobile = loggedIn
            ? `<div class="pt-3 mt-3 border-t border-stone-200 flex items-center justify-between gap-3">
                   <div class="flex items-center gap-3">
                       <span class="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-sm font-bold">${escapeHtml(initials(user && user.name))}</span>
                       <span class="text-sm font-medium text-stone-900">${escapeHtml((user && user.name) || 'Account')}</span>
                   </div>
                   <button type="button" data-signout class="bg-white border border-stone-200 text-stone-700 font-medium rounded-full px-4 py-2.5 text-sm min-h-[44px]">Sign out</button>
               </div>`
            : `<div class="pt-3 mt-3 border-t border-stone-200 grid grid-cols-2 gap-3">
                   <a href="login.html" class="text-center bg-white border border-stone-200 text-stone-800 font-medium rounded-full px-4 py-3 text-sm min-h-[44px] inline-flex items-center justify-center">Sign in</a>
                   <a href="login.html?mode=register" class="text-center bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-4 py-3 text-sm min-h-[44px] inline-flex items-center justify-center elevate-1">Get started</a>
               </div>`;

        slot.innerHTML = `
            <header class="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-stone-200">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
                    <a href="index.html" class="flex items-center gap-2.5 min-h-[44px]">
                        <span class="w-9 h-9 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center text-white font-bold text-base elevate-1">C</span>
                        <span class="text-lg sm:text-xl font-bold tracking-tight text-stone-900">CampusHub</span>
                    </a>
                    <nav class="hidden md:flex items-center gap-1" aria-label="Primary">
                        ${desktopLinks}
                    </nav>
                    <div class="hidden md:flex">${authDesktop}</div>
                    <button type="button" id="mobile-nav-toggle" class="md:hidden w-11 h-11 inline-flex items-center justify-center rounded-full border border-stone-200 text-stone-700" aria-controls="mobile-nav" aria-expanded="false" aria-label="Open navigation menu">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>
                    </button>
                </div>
                <div id="mobile-nav" class="md:hidden hidden border-t border-stone-200 bg-white">
                    <div class="px-4 py-4 space-y-1">
                        ${mobileLinks}
                        ${authMobile}
                    </div>
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

        function close() {
            panel.classList.add('hidden');
            btn.setAttribute('aria-expanded', 'false');
            btn.setAttribute('aria-label', 'Open navigation menu');
        }
        function open() {
            panel.classList.remove('hidden');
            btn.setAttribute('aria-expanded', 'true');
            btn.setAttribute('aria-label', 'Close navigation menu');
        }

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (panel.classList.contains('hidden')) open(); else close();
        });
        panel.addEventListener('click', (e) => {
            if (e.target.closest('[data-nav-link]')) close();
        });
        document.addEventListener('click', (e) => {
            if (panel.classList.contains('hidden')) return;
            if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !panel.classList.contains('hidden')) close();
        });
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
            <footer class="bg-white border-t border-stone-200 mt-20">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
                    <div>
                        <a href="index.html" class="flex items-center gap-2.5 mb-3">
                            <span class="w-8 h-8 rounded-xl bg-gradient-to-br from-stone-900 to-stone-700 flex items-center justify-center text-white font-bold text-sm">C</span>
                            <span class="text-base font-bold tracking-tight text-stone-900">CampusHub</span>
                        </a>
                        <p class="text-sm text-stone-500 max-w-xs leading-relaxed">Campus Event Management System for ${escapeHtml(UNIVERSITY_NAME)}.</p>
                    </div>
                    <nav class="flex flex-col sm:items-end gap-2 text-sm text-stone-600" aria-label="Footer">
                        <a href="events.html" class="hover:text-stone-900">Events</a>
                        ${loggedIn ? '<a href="dashboard.html" class="hover:text-stone-900">Dashboard</a>' : '<a href="login.html" class="hover:text-stone-900">Sign in</a>'}
                    </nav>
                </div>
                <div class="border-t border-stone-200">
                    <p class="max-w-7xl mx-auto px-4 sm:px-6 py-5 text-xs text-stone-500">&copy; ${year} CampusHub &middot; Campus Event Management System</p>
                </div>
            </footer>
        `;
    }

    function getToastContainer() {
        let c = document.getElementById('toast-container');
        if (!c) {
            c = document.createElement('div');
            c.id = 'toast-container';
            c.className = 'fixed top-0 inset-x-0 sm:top-4 sm:right-4 sm:left-auto sm:inset-x-auto z-50 flex flex-col gap-2 p-3 sm:p-0 sm:max-w-sm pointer-events-none';
            document.body.appendChild(c);
        }
        return c;
    }

    function showToast(message, type = 'success') {
        const container = getToastContainer();
        const stripe = {
            success: 'border-l-emerald-500',
            error:   'border-l-rose-500',
            info:    'border-l-sky-500'
        }[type] || 'border-l-stone-400';
        const iconMap = { success: '✓', error: '!', info: 'i' };
        const iconColor = {
            success: 'bg-emerald-50 text-emerald-600',
            error:   'bg-rose-50 text-rose-600',
            info:    'bg-sky-50 text-sky-600'
        }[type] || 'bg-stone-100 text-stone-700';
        const el = document.createElement('div');
        el.className = `pointer-events-auto flex items-start gap-3 bg-white border border-stone-200 border-l-4 ${stripe} rounded-2xl px-4 py-3 elevate-2 toast-enter`;
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML = `
            <span class="mt-0.5 inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-bold ${iconColor}" aria-hidden="true">${iconMap[type] || 'i'}</span>
            <p class="flex-1 text-sm leading-snug text-stone-800">${escapeHtml(message)}</p>
            <button type="button" class="text-stone-400 hover:text-stone-700 text-base min-w-[24px]" aria-label="Dismiss notification">&times;</button>
        `;
        const close = () => {
            el.classList.add('toast-leave');
            setTimeout(() => el.remove(), 180);
        };
        el.querySelector('button').addEventListener('click', close);
        container.appendChild(el);
        setTimeout(close, 3500);
    }

    function setFlash(message, type = 'success') {
        try { sessionStorage.setItem('flash', JSON.stringify({ message, type })); }
        catch (_) {}
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

    function showConfirm({ title, message, confirmText = 'Confirm', danger = false }) {
        return new Promise((resolve) => {
            const previouslyFocused = document.activeElement;
            const backdrop = document.createElement('div');
            backdrop.className = 'fixed inset-0 z-50 flex items-center justify-center px-4 bg-stone-900/40 backdrop-blur-sm modal-enter';
            backdrop.setAttribute('role', 'dialog');
            backdrop.setAttribute('aria-modal', 'true');

            const confirmCls = danger
                ? 'bg-rose-500 hover:bg-rose-600'
                : 'bg-stone-900 hover:bg-stone-800';

            backdrop.innerHTML = `
                <div class="w-full max-w-md bg-white border border-stone-200 rounded-3xl p-6 elevate-3" tabindex="-1">
                    <h2 class="text-lg font-bold text-stone-900 mb-1">${escapeHtml(title)}</h2>
                    <p class="text-sm text-stone-600 mb-6 leading-relaxed">${escapeHtml(message)}</p>
                    <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
                        <button type="button" data-cancel class="bg-white border border-stone-200 hover:border-stone-300 text-stone-700 font-medium rounded-full px-5 py-2.5 text-sm min-h-[44px]">Cancel</button>
                        <button type="button" data-confirm class="${confirmCls} text-white font-medium rounded-full px-5 py-2.5 text-sm min-h-[44px] elevate-1 focus-ring">${escapeHtml(confirmText)}</button>
                    </div>
                </div>
            `;

            const close = (result) => {
                document.removeEventListener('keydown', onKey);
                backdrop.classList.add('modal-leave');
                setTimeout(() => {
                    backdrop.remove();
                    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
                    resolve(result);
                }, 150);
            };
            const onKey = (e) => { if (e.key === 'Escape') close(false); };

            backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
            backdrop.querySelector('[data-cancel]').addEventListener('click', () => close(false));
            backdrop.querySelector('[data-confirm]').addEventListener('click', () => close(true));
            document.addEventListener('keydown', onKey);

            document.body.appendChild(backdrop);
            const confirmBtn = backdrop.querySelector('[data-confirm]');
            if (confirmBtn && confirmBtn.focus) confirmBtn.focus();
        });
    }

    function setButtonLoading(btn, isLoading, loadingText) {
        if (!btn) return;
        if (isLoading) {
            if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
            btn.disabled = true;
            btn.setAttribute('aria-busy', 'true');
            btn.innerHTML = `<span class="inline-flex items-center gap-2 justify-center"><span class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>${escapeHtml(loadingText || 'Working...')}</span>`;
        } else {
            btn.disabled = false;
            btn.removeAttribute('aria-busy');
            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }
        }
    }

    function categoryFallbackHTML(category) {
        const c = (category || 'event').toLowerCase();
        const color = CATEGORY_COLORS[c] || 'stone';
        return `<div class="w-full h-full bg-gradient-to-br from-${color}-100 via-stone-50 to-white flex items-center justify-center text-${color}-700 text-xs font-semibold uppercase tracking-wider">${escapeHtml(c)}</div>`;
    }

    function eventCardHTML(event, { showAdminActions = false } = {}) {
        const title = escapeHtml(event.title || 'Untitled event');
        const description = escapeHtml(event.description || '');
        const location = escapeHtml(event.location || '');
        const dateLabel = formatDate(event.date) || escapeHtml(event.date || '');
        const past = isPastDate(event.date);
        const image = event.image
            ? `<img src="${escapeHtml(event.image)}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.outerHTML=this.getAttribute('data-fallback')" data-fallback='${categoryFallbackHTML(event.category).replace(/'/g, "&apos;")}'>`
            : categoryFallbackHTML(event.category);

        const adminActions = showAdminActions
            ? `<div class="absolute top-3 right-3 z-10 flex gap-2">
                   <a href="create-event.html?id=${encodeURIComponent(event.id)}" class="bg-white/95 backdrop-blur border border-stone-200 text-stone-800 text-xs font-semibold rounded-full px-3 py-1.5 hover:bg-white min-h-[36px] inline-flex items-center elevate-1">Edit</a>
                   <button type="button" data-delete-event="${encodeURIComponent(event.id)}" class="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-full px-3 py-1.5 min-h-[36px] elevate-1">Delete</button>
               </div>`
            : '';

        const endedBadge = past
            ? `<span class="absolute top-3 left-3 z-10 bg-white/95 backdrop-blur border border-stone-200 text-stone-700 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">Ended</span>`
            : '';

        return `
            <article class="group relative bg-white rounded-3xl border border-stone-200 overflow-hidden elevate-1 hover:elevate-2 hover:-translate-y-0.5 transition-all flex flex-col">
                ${adminActions}
                ${endedBadge}
                <div class="h-48 relative overflow-hidden bg-stone-100">
                    ${image}
                </div>
                <div class="p-6 flex-grow flex flex-col">
                    <div class="flex items-center justify-between mb-3 gap-3">
                        ${categoryBadge(event.category)}
                        <span class="text-xs text-stone-500">${escapeHtml(dateLabel)}</span>
                    </div>
                    <h3 class="text-lg font-bold text-stone-900 leading-snug mb-2">
                        <a href="event-details.html?id=${encodeURIComponent(event.id)}" class="hover:text-orange-600 transition-colors after:content-[''] after:absolute after:inset-0">${title}</a>
                    </h3>
                    <p class="text-stone-600 text-sm line-clamp-2 mb-5 leading-relaxed">${description}</p>
                    <div class="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                        <span class="text-xs text-stone-500 truncate">📍 ${location}</span>
                        ${seatsBadge(event)}
                    </div>
                </div>
            </article>
        `;
    }

    function skeletonCards(n = 3) {
        return Array.from({ length: n }).map(() => `
            <div class="bg-white rounded-3xl border border-stone-200 overflow-hidden elevate-1">
                <div class="h-48 skeleton"></div>
                <div class="p-6 space-y-3">
                    <div class="h-4 w-20 rounded-full skeleton"></div>
                    <div class="h-5 w-3/4 rounded skeleton"></div>
                    <div class="h-4 w-full rounded skeleton"></div>
                    <div class="h-4 w-2/3 rounded skeleton"></div>
                </div>
            </div>
        `).join('');
    }

    function emptyStateHTML({ icon = '✨', title, text, actionHTML = '' }) {
        return `
            <div class="col-span-full text-center py-16 bg-white rounded-3xl border border-dashed border-stone-200">
                <div class="text-4xl mb-3" aria-hidden="true">${escapeHtml(icon)}</div>
                <h3 class="text-lg font-semibold text-stone-900 mb-1">${escapeHtml(title)}</h3>
                <p class="text-sm text-stone-500 mb-5 max-w-md mx-auto">${escapeHtml(text)}</p>
                ${actionHTML}
            </div>
        `;
    }

    function errorStateHTML(message) {
        return `
            <div class="col-span-full text-center py-16 bg-rose-50 rounded-3xl border border-rose-100">
                <div class="text-4xl mb-3" aria-hidden="true">⚠️</div>
                <h3 class="text-lg font-semibold text-stone-900 mb-1">Something went wrong</h3>
                <p class="text-sm text-rose-700 mb-5 max-w-md mx-auto">${escapeHtml(message || 'Please try again.')}</p>
                <button type="button" data-retry class="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-2.5 text-sm min-h-[44px] elevate-1 focus-ring">Try again</button>
            </div>
        `;
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

    global.ui = {
        UNIVERSITY_NAME,
        CATEGORY_COLORS,
        escapeHtml,
        formatDate,
        todayISO,
        isPastDate,
        getParam,
        debounce,
        initials,
        categoryBadge,
        seatsBadge,
        renderHeader,
        renderFooter,
        showToast,
        setFlash,
        showConfirm,
        setButtonLoading,
        eventCardHTML,
        skeletonCards,
        emptyStateHTML,
        errorStateHTML,
        requireAuth,
        requireAdmin,
        confirmAndDeleteEvent,
        cleanupLegacyStorage
    };

    function activePageFromPath() {
        const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (path === '' || path === 'index.html') return 'home';
        if (path === 'events.html') return 'events';
        if (path === 'event-details.html') return 'events';
        if (path === 'dashboard.html') return 'dashboard';
        if (path === 'create-event.html') return 'create';
        return '';
    }

    function onReady() {
        renderHeader(activePageFromPath());
        renderFooter();
        consumeFlash();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onReady);
    } else {
        onReady();
    }
})(window);
