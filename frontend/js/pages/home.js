(function () {
    'use strict';

    function heroSecondary() {
        const btn = document.getElementById('hero-secondary-btn');
        if (!btn) return;
        if (window.isAdmin()) {
            btn.href = 'create-event.html';
            btn.textContent = 'Host an event';
        } else if (window.isLoggedIn()) {
            btn.href = 'dashboard.html';
            btn.textContent = 'My dashboard';
        }
    }

    function renderStats(events) {
        const slot = document.getElementById('home-stats');
        if (!slot) return;
        const upcoming = events.filter((e) => !window.ui.isPastDate(e.date));
        const cats = new Set(events.map((e) => (e.category || '').toLowerCase()).filter(Boolean));
        const seats = upcoming.reduce((s, e) => s + (Number(e.seatsLeft) || 0), 0);
        const items = [
            [upcoming.length, 'upcoming events'],
            [events.length, 'events total'],
            [cats.size, 'categories'],
            [seats, 'seats still open']
        ];
        slot.innerHTML = items.map(([n, l]) =>
            `<div class="stat"><b class="mono">${n}</b><span>${window.ui.escapeHtml(l)}</span></div>`
        ).join('');
    }

    function renderChips() {
        const slot = document.getElementById('home-chips');
        if (!slot) return;
        slot.innerHTML = window.ui.CATEGORY_KEYS.map((k) =>
            `<a class="chip" href="events.html?category=${encodeURIComponent(k)}"><i></i>${window.ui.escapeHtml(window.ui.CATEGORY_LABELS[k])}</a>`
        ).join('');
    }

    function renderFeatured(events) {
        const slot = document.getElementById('home-featured');
        if (!slot) return;
        const upcoming = events
            .filter((e) => !window.ui.isPastDate(e.date))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
            .slice(0, 3);
        if (!upcoming.length) {
            slot.innerHTML = window.ui.emptyStateHTML({
                icon: '📅',
                title: 'No upcoming events yet',
                text: 'Check back soon or browse the full directory.',
                actionHTML: `<a class="btn btn-primary" href="events.html">Browse events</a>`
            });
            return;
        }
        slot.innerHTML = upcoming.map((e) => window.ui.eventCardHTML(e)).join('');
        renderHeroStack(upcoming);
    }

    function renderHeroStack(upcoming) {
        const slot = document.getElementById('home-hero-stack');
        if (!slot) return;
        const picks = upcoming.slice(0, 2);
        slot.innerHTML = picks.map((e) => window.ui.eventCardHTML(e)).join('');
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
        heroSecondary();
        renderChips();
        load();
    });
})();
