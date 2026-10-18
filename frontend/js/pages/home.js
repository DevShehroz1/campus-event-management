(function () {
    'use strict';

    const CATEGORIES = [
        { key: 'workshop',    label: 'Workshops',    emoji: '🧪' },
        { key: 'seminar',     label: 'Seminars',     emoji: '🎤' },
        { key: 'competition', label: 'Competitions', emoji: '🏆' },
        { key: 'sports',      label: 'Sports',       emoji: '⚽' },
        { key: 'conference',  label: 'Conferences',  emoji: '🏛️' },
        { key: 'society',     label: 'Societies',    emoji: '🎨' }
    ];

    function heroSecondaryButton() {
        if (window.isAdmin()) {
            return `<a href="create-event.html" class="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-7 py-3.5 rounded-xl font-semibold transition-all text-center min-h-[44px] inline-flex items-center justify-center">Host an Event</a>`;
        }
        if (window.isLoggedIn()) {
            return `<a href="dashboard.html" class="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-7 py-3.5 rounded-xl font-semibold transition-all text-center min-h-[44px] inline-flex items-center justify-center">My Dashboard</a>`;
        }
        return `<a href="login.html?mode=register" class="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-7 py-3.5 rounded-xl font-semibold transition-all text-center min-h-[44px] inline-flex items-center justify-center">Create Account</a>`;
    }

    function renderHero() {
        const slot = document.getElementById('hero-university');
        if (slot) slot.textContent = window.ui.UNIVERSITY_NAME;
        const btnSlot = document.getElementById('hero-secondary-btn');
        if (btnSlot) btnSlot.outerHTML = heroSecondaryButton();
    }

    function renderStats(events) {
        const slot = document.getElementById('home-stats');
        if (!slot) return;
        const upcoming = events.filter((e) => !window.ui.isPastDate(e.date));
        const categories = new Set(events.map((e) => (e.category || '').toLowerCase()).filter(Boolean));
        const seats = upcoming.reduce((sum, e) => {
            const left = Number(e.seatsLeft);
            return sum + (Number.isFinite(left) ? left : 0);
        }, 0);
        const items = [
            { label: 'Upcoming events', value: upcoming.length },
            { label: 'Categories',      value: categories.size },
            { label: 'Seats available', value: seats }
        ];
        slot.innerHTML = items.map((it) => `
            <div class="bg-slate-900/60 border border-slate-800 rounded-2xl px-6 py-5 text-center">
                <div class="text-3xl font-extrabold text-white tracking-tight">${it.value}</div>
                <p class="text-xs uppercase tracking-wider text-slate-400 mt-1">${window.ui.escapeHtml(it.label)}</p>
            </div>
        `).join('');
    }

    function renderCategories() {
        const slot = document.getElementById('home-categories');
        if (!slot) return;
        slot.innerHTML = CATEGORIES.map((c) => `
            <a href="events.html?category=${encodeURIComponent(c.key)}"
               class="group bg-slate-900/60 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-200 inline-flex items-center gap-2 min-h-[44px]">
                <span aria-hidden="true">${c.emoji}</span>${window.ui.escapeHtml(c.label)}
            </a>
        `).join('');
    }

    function renderFeatured(events) {
        const slot = document.getElementById('home-featured');
        if (!slot) return;
        const upcoming = events
            .filter((e) => !window.ui.isPastDate(e.date))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .slice(0, 3);
        if (upcoming.length === 0) {
            slot.innerHTML = window.ui.emptyStateHTML({
                icon: '📅',
                title: 'No upcoming events yet',
                text: 'Check back soon or browse the full directory.',
                actionHTML: `<a href="events.html" class="inline-flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 px-5 py-2.5 text-sm">Browse Events</a>`
            });
            return;
        }
        slot.innerHTML = upcoming.map((e) => window.ui.eventCardHTML(e)).join('');
    }

    async function load() {
        const slot = document.getElementById('home-featured');
        if (slot) slot.innerHTML = window.ui.skeletonCards(3);
        try {
            const events = await window.api.getEvents();
            renderStats(events);
            renderFeatured(events);
        } catch (err) {
            if (slot) {
                slot.innerHTML = window.ui.errorStateHTML(err.message);
                const retry = slot.querySelector('[data-retry]');
                if (retry) retry.addEventListener('click', load);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        renderHero();
        renderCategories();
        load();
    });
})();
