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
            [events.length,   'events total'],
            [cats.size,       'categories'],
            [seats,           'seats still open']
        ];
        slot.innerHTML = items.map(([n, l]) =>
            `<div class="stat"><b>${n}</b><span>${window.ui.escapeHtml(l)}</span></div>`
        ).join('');
    }

    function renderCategories(events) {
        const slot = document.getElementById('home-categories');
        if (!slot) return;
        const counts = new Map();
        events.forEach((e) => {
            const k = (e.category || '').toLowerCase();
            if (!k) return;
            counts.set(k, (counts.get(k) || 0) + 1);
        });
        slot.innerHTML = window.ui.CATEGORY_KEYS.map((k) => {
            const n = counts.get(k) || 0;
            return `
                <a class="category-card" href="events.html?category=${encodeURIComponent(k)}">
                    <span class="cat-icon" aria-hidden="true">${window.ui.CATEGORY_ICONS[k] || '•'}</span>
                    <span class="cat-name">${window.ui.escapeHtml(window.ui.CATEGORY_LABELS[k])}</span>
                    <span class="cat-count">${n} ${n === 1 ? 'event' : 'events'}</span>
                </a>
            `;
        }).join('');
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
                actionHTML: '<a class="btn btn-primary" href="events.html">Browse all events</a>'
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
            renderCategories(events);
            renderFeatured(events);
        } catch (err) {
            renderStats([]);
            renderCategories([]);
            if (slot) {
                slot.innerHTML = window.ui.errorStateHTML(err.message);
                const retry = slot.querySelector('[data-retry]');
                if (retry) retry.addEventListener('click', load);
            }
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        heroSecondary();
        load();
    });
})();
