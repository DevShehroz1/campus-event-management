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
        const base = 'w-full sm:w-auto bg-white border border-stone-200 hover:border-stone-300 text-stone-900 px-7 py-3.5 rounded-full font-medium text-sm transition-colors text-center min-h-[48px] inline-flex items-center justify-center elevate-1';
        if (window.isAdmin()) {
            return `<a id="hero-secondary-btn" href="create-event.html" class="${base}">Host an event</a>`;
        }
        if (window.isLoggedIn()) {
            return `<a id="hero-secondary-btn" href="dashboard.html" class="${base}">My dashboard</a>`;
        }
        return `<a id="hero-secondary-btn" href="login.html?mode=register" class="${base}">Create account</a>`;
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
            <div class="bg-white border border-stone-200 rounded-3xl px-6 py-6 elevate-1 flex flex-col gap-1">
                <div class="text-4xl font-extrabold text-stone-900 tracking-tight">${it.value}</div>
                <p class="text-xs uppercase tracking-wider text-stone-500 font-semibold">${window.ui.escapeHtml(it.label)}</p>
            </div>
        `).join('');
    }

    function renderCategories() {
        const slot = document.getElementById('home-categories');
        if (!slot) return;
        slot.innerHTML = CATEGORIES.map((c) => `
            <a href="events.html?category=${encodeURIComponent(c.key)}"
               class="group bg-white hover:bg-stone-50 border border-stone-200 hover:border-stone-300 rounded-full px-5 py-3 text-sm font-medium text-stone-800 inline-flex items-center gap-2 min-h-[44px] elevate-1 transition-all">
                <span aria-hidden="true">${c.emoji}</span>${window.ui.escapeHtml(c.label)}
                <span class="text-stone-400 group-hover:text-orange-500 transition-colors" aria-hidden="true">&rarr;</span>
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
                actionHTML: `<a href="events.html" class="inline-flex items-center justify-center bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-2.5 text-sm elevate-1">Browse events</a>`
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
