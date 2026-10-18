(function () {
    'use strict';

    const page = {};
    let events = [];
    let registrations = [];

    function tile(label, value, hint) {
        return `
            <div class="tile">
                <span class="tile-label">${window.ui.escapeHtml(label)}</span>
                <span class="tile-value">${value}</span>
                ${hint ? `<span class="tile-hint">${window.ui.escapeHtml(hint)}</span>` : ''}
            </div>
        `;
    }

    function roleBadge(role) {
        return role === 'admin'
            ? '<span class="badge" data-cat="workshop">Administrator</span>'
            : '<span class="badge plain">Student</span>';
    }

    function renderBanner(user) {
        page.banner.innerHTML = `
            <div class="profile-card">
                <div class="who">
                    <div class="avatar" aria-hidden="true">${window.ui.escapeHtml(window.ui.initials(user.name))}</div>
                    <div>
                        <div class="name">Welcome back, ${window.ui.escapeHtml((user.name || '').split(' ')[0] || 'friend')}</div>
                        <div class="meta">${window.ui.escapeHtml(user.email || '')}${user.studentId ? ' · ' + window.ui.escapeHtml(user.studentId) : ''}</div>
                        <div class="role">${roleBadge(user.role)}</div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <a class="btn btn-outline" href="events.html">Browse events</a>
                    ${user.role === 'admin' ? '<a class="btn btn-primary" href="create-event.html">Host new event</a>' : ''}
                </div>
            </div>
        `;
    }

    function regRow(reg) {
        const event = reg.event || {};
        const past = window.ui.isPastDate(event.date);
        return `
            <div class="list-row">
                <div class="main">
                    <div class="top">
                        ${window.ui.categoryBadge(event.category)}
                        <span class="sub">${window.ui.escapeHtml(window.ui.formatDate(event.date))}${event.time ? ' · ' + window.ui.escapeHtml(event.time) : ''}</span>
                    </div>
                    <a class="title" href="event-details.html?id=${encodeURIComponent(event.id)}">${window.ui.escapeHtml(event.title || 'Untitled event')}</a>
                    <div class="sub"><span class="meta">${window.ui.ICON.pin}<span>${window.ui.escapeHtml(event.location || '—')}</span></span></div>
                </div>
                <div class="actions">
                    ${past ? '<span class="badge plain">Ended</span>' : `<button type="button" class="btn btn-danger btn-sm" data-cancel="${encodeURIComponent(event.id)}">Cancel</button>`}
                </div>
            </div>
        `;
    }

    function wireCancel(container) {
        container.querySelectorAll('[data-cancel]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = decodeURIComponent(btn.getAttribute('data-cancel'));
                const title = btn.closest('.list-row')?.querySelector('.title')?.textContent || 'this event';
                const ok = await window.ui.showConfirm({
                    title: 'Cancel registration?',
                    message: `Your seat at "${title}" will be released for another student.`,
                    confirmText: 'Cancel registration',
                    cancelText: 'Keep my seat',
                    danger: true
                });
                if (!ok) return;
                try {
                    await window.api.cancelRegistration(id);
                    window.ui.showToast('Registration cancelled.', 'info');
                    await load();
                } catch (err) {
                    window.ui.showToast(err.message || 'Could not cancel registration', 'error');
                }
            });
        });
    }

    function renderStudent() {
        const mine = registrations.slice().sort((a, b) => (a.event?.date || '').localeCompare(b.event?.date || ''));
        const upcoming = mine.filter((r) => r.event && !window.ui.isPastDate(r.event.date));
        const past = mine.filter((r) => r.event && window.ui.isPastDate(r.event.date));
        const next = upcoming[0];
        page.stats.innerHTML = `
            ${tile('Registered events', mine.length, 'all time')}
            ${tile('Upcoming', upcoming.length, upcoming.length === 1 ? 'event ahead' : 'events ahead')}
            ${tile('Next event', next ? window.ui.formatDate(next.event.date) : '—', next ? next.event.title : 'nothing booked yet')}
            ${tile('Past events', past.length, past.length === 1 ? 'attended' : 'attended')}
        `;

        if (!mine.length) {
            page.body.innerHTML = window.ui.emptyStateHTML({
                icon: '📅',
                title: 'No registrations yet',
                text: 'Pick an event and save your seat. It will show up here.',
                actionHTML: '<a class="btn btn-primary" href="events.html">Browse events</a>'
            });
            return;
        }

        page.body.innerHTML = `
            ${upcoming.length ? `
                <div style="margin-bottom:28px">
                    <div class="section-head"><h2>Upcoming</h2></div>
                    <div class="list-card" id="student-upcoming"></div>
                </div>
            ` : ''}
            ${past.length ? `
                <div>
                    <div class="section-head"><h2>Past</h2></div>
                    <div class="list-card" id="student-past"></div>
                </div>
            ` : ''}
        `;

        const u = document.getElementById('student-upcoming');
        if (u) { u.innerHTML = upcoming.map(regRow).join(''); wireCancel(u); }
        const p = document.getElementById('student-past');
        if (p) p.innerHTML = past.map(regRow).join('');
    }

    function renderAdmin() {
        const upcoming = events.filter((e) => !window.ui.isPastDate(e.date));
        const totalRegs = registrations.length;
        const capSum = events.reduce((s, e) => s + (Number(e.capacity) || 0), 0);
        const leftSum = events.reduce((s, e) => s + (Number(e.seatsLeft) || 0), 0);
        const filled = capSum > 0 ? Math.round(((capSum - leftSum) / capSum) * 100) : 0;

        page.stats.innerHTML = `
            ${tile('Total events', events.length)}
            ${tile('Upcoming', upcoming.length)}
            ${tile('Registrations', totalRegs, 'across all events')}
            ${tile('Seats filled', filled + '%', `${capSum - leftSum} of ${capSum}`)}
        `;

        page.body.innerHTML = `
            <div style="margin-bottom:28px">
                <div class="section-head">
                    <h2>Manage events</h2>
                    <div class="right"><a class="btn btn-ghost btn-sm" href="create-event.html">New event →</a></div>
                </div>
                <div class="card flush" id="admin-events-wrap"></div>
            </div>
            <div>
                <div class="section-head"><h2>All registrations</h2></div>
                <div class="card flush" id="admin-regs-wrap"></div>
            </div>
        `;

        renderAdminEvents(document.getElementById('admin-events-wrap'));
        renderAdminRegs(document.getElementById('admin-regs-wrap'));
    }

    function renderAdminEvents(wrap) {
        if (!events.length) {
            wrap.innerHTML = `
                <div class="empty" style="border:0">
                    <div class="glyph">📅</div>
                    <h3>No events yet</h3>
                    <p>Create your first event to get started.</p>
                    <a class="btn btn-primary" href="create-event.html">Create event</a>
                </div>`;
            return;
        }
        const regByEvent = new Map();
        registrations.forEach((r) => {
            if (!r.event) return;
            const k = String(r.event.id);
            regByEvent.set(k, (regByEvent.get(k) || 0) + 1);
        });
        const rows = events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((e) => {
            const reg = regByEvent.get(String(e.id)) || 0;
            const cap = Number(e.capacity) || 0;
            return `
                <tr>
                    <td><a href="event-details.html?id=${encodeURIComponent(e.id)}">${window.ui.escapeHtml(e.title || '—')}</a></td>
                    <td>${window.ui.categoryBadge(e.category)}</td>
                    <td>${window.ui.escapeHtml(window.ui.formatDate(e.date))}</td>
                    <td>${reg} / ${cap || '—'}</td>
                    <td style="text-align:right">
                        <span class="row-actions">
                            <a class="btn btn-outline btn-sm" href="create-event.html?id=${encodeURIComponent(e.id)}">Edit</a>
                            <button type="button" class="btn btn-danger btn-sm" data-admin-del="${encodeURIComponent(e.id)}" data-title="${window.ui.escapeHtml(e.title || '')}">Delete</button>
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        wrap.innerHTML = `
            <div class="table-wrap">
                <table class="table">
                    <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Registered</th><th style="text-align:right">Actions</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
        wrap.querySelectorAll('[data-admin-del]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = decodeURIComponent(btn.getAttribute('data-admin-del'));
                const title = btn.getAttribute('data-title') || 'this event';
                await window.ui.confirmAndDeleteEvent({ id, title }, load);
            });
        });
    }

    function renderAdminRegs(wrap) {
        if (!registrations.length) {
            wrap.innerHTML = `
                <div class="empty" style="border:0">
                    <div class="glyph">🎟️</div>
                    <h3>No registrations yet</h3>
                    <p>Once students start registering, they'll show up here.</p>
                </div>`;
            return;
        }
        const sorted = registrations.slice().sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));
        const rows = sorted.map((r) => {
            const u = r.user || {};
            const e = r.event || {};
            return `
                <tr>
                    <td>${window.ui.escapeHtml(u.name || '—')}</td>
                    <td>${window.ui.escapeHtml(u.email || '—')}</td>
                    <td><a href="event-details.html?id=${encodeURIComponent(e.id)}">${window.ui.escapeHtml(e.title || '—')}</a></td>
                    <td>${window.ui.escapeHtml(window.ui.formatDate(r.registrationDate ? r.registrationDate.slice(0, 10) : ''))}</td>
                </tr>
            `;
        }).join('');
        wrap.innerHTML = `
            <div class="table-wrap">
                <table class="table">
                    <thead><tr><th>Student</th><th>Email</th><th>Event</th><th>Registered</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;
    }

    function showError(message) {
        page.body.innerHTML = window.ui.errorStateHTML(message);
        const retry = page.body.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', load);
    }

    async function load() {
        page.stats.innerHTML = window.ui.skeletonCards(3).replace(/skel-art/g, 'skel').replace(/aspect-ratio: 16 \/ 9/g, 'height:60px');
        page.body.innerHTML = '';
        try {
            const user = window.getCurrentUser();
            renderBanner(user);
            if (user.role === 'admin') {
                [events, registrations] = await Promise.all([window.api.getEvents(), window.api.getRegistrations()]);
                renderAdmin();
            } else {
                registrations = await window.api.getRegistrations();
                renderStudent(user);
            }
        } catch (err) {
            showError(err.message);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.ui.requireAuth()) return;
        window.ui.cleanupLegacyStorage();
        page.banner = document.getElementById('dashboard-banner');
        page.stats = document.getElementById('dashboard-stats');
        page.body = document.getElementById('dashboard-body');
        load();
    });
})();
