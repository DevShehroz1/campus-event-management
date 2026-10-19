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

    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    // Placeholder ticket (loading, server unreachable, or nothing upcoming): no invented event data.
    function heroTicketPlaceholder(kicker) {
        return `
            <div class="art"><div class="stub"><b>··</b><span>SOON</span></div></div>
            <div class="info">
                <div class="row"><span class="kicker">${window.ui.escapeHtml(kicker)}</span></div>
                <div class="skel" style="height:18px;width:85%"></div>
                <div class="skel" style="height:12px;width:60%"></div>
                <div class="skel" style="height:6px;width:100%;margin-top:6px"></div>
            </div>`;
    }

    function renderHeroTicket(events) {
        const slot = document.getElementById('hero-ticket');
        if (!slot) return;
        const next = (events || [])
            .filter((e) => !window.ui.isPastDate(e.date))
            .sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];

        if (!next) {
            slot.innerHTML = heroTicketPlaceholder(events ? 'New events coming soon' : 'Upcoming events');
            return;
        }

        const esc = window.ui.escapeHtml;
        const d = window.ui.parseLocalDate(next.date);
        const day = d ? String(d.getDate()).padStart(2, '0') : '··';
        const month = d ? MONTHS[d.getMonth()] : '';
        const art = next.image
            ? `<img src="${esc(next.image)}" alt="" loading="lazy" onerror="this.remove()">`
            : '';
        const left = Number(next.seatsLeft);
        const seats = Number.isFinite(left) ? `${left} of ${esc(next.capacity)} seats left` : '';

        // The ticket becomes a link to the event, so it is clickable but stays out of the
        // accessibility tree like the rest of the decorative hero visual.
        const link = document.createElement('a');
        link.className = slot.className;
        link.id = slot.id;
        link.href = `event-details.html?id=${encodeURIComponent(next.id)}`;
        link.tabIndex = -1;
        link.innerHTML = `
            <div class="art">${art}<div class="stub"><b>${day}</b><span>${month}</span></div></div>
            <div class="info">
                <div class="row">${window.ui.categoryBadge(next.category)}<span>Next up</span></div>
                <h3>${esc(next.title)}</h3>
                <span class="meta">${window.ui.ICON.pin}<span>${esc(next.location || '')}</span></span>
                <span class="kicker">${seats}</span>
                ${window.ui.seatsBar(next)}
            </div>`;
        slot.replaceWith(link);
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
        renderHeroTicket(null);
        try {
            const events = await window.api.getEvents();
            renderHeroTicket(events);
            renderStats(events);
            renderCategories(events);
            renderFeatured(events);
        } catch (err) {
            renderHeroTicket(null);
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
