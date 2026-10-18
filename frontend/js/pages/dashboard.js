(function () {
    'use strict';

    const page = {};
    let events = [];
    let registrations = [];

    function roleEyebrow(role) {
        return role === 'admin' ? 'Administrator' : 'Student';
    }

    function tile(label, value, hint) {
        return `
            <div class="tile glass">
                <span class="faint">${window.ui.escapeHtml(label)}</span>
                <b class="mono">${value}</b>
                ${hint ? `<span class="faint" style="font-size:.82rem">${window.ui.escapeHtml(hint)}</span>` : ''}
            </div>
        `;
    }

    function renderBanner(user) {
        page.banner.innerHTML = `
            <div class="profile glass">
                <div class="who">
                    <div class="avatar">${window.ui.escapeHtml(window.ui.initials(user.name) || '🙂')}</div>
                    <div>
                        <span class="eyebrow">${roleEyebrow(user.role)}</span>
                        <h2 style="margin-top:4px">Welcome back, ${window.ui.escapeHtml((user.name || '').split(' ')[0] || 'friend')}</h2>
                        <p class="faint mono" style="font-size:.82rem;margin-top:4px">${window.ui.escapeHtml(user.email || '')}${user.studentId ? ' · ' + window.ui.escapeHtml(user.studentId) : ''}</p>
                    </div>
                </div>
                <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                    <a class="btn btn-glass" href="events.html">Browse events</a>
                    ${user.role === 'admin' ? '<a class="btn btn-primary" href="create-event.html">Host new event</a>' : ''}
                </div>
            </div>
        `;
    }

    function regRow(reg) {
        const event = reg.event || {};
        const past = window.ui.isPastDate(event.date);
        return `
            <div class="reg-row glass" data-cat="${window.ui.escapeHtml((event.category || '').toLowerCase())}">
                ${window.ui.stubHTML(event)}
                <div style="min-width:0;display:grid;gap:4px">
                    <div style="display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
                        ${window.ui.categoryBadge(event.category)}
                        ${event.time ? `<span class="mono faint" style="font-size:.78rem">${window.ui.escapeHtml(event.time)}</span>` : ''}
                    </div>
                    <h3><a href="event-details.html?id=${encodeURIComponent(event.id)}">${window.ui.escapeHtml(event.title || 'Untitled event')}</a></h3>
                    <div class="meta"><span>${window.ui.ICON.pin}${window.ui.escapeHtml(event.location || '—')}</span></div>
                </div>
                ${past ? '<span class="badge ended">Ended</span>' : `<button type="button" class="btn btn-danger" data-cancel="${encodeURIComponent(event.id)}">Cancel</button>`}
            </div>
        `;
    }

    function wireCancel(container) {
        container.querySelectorAll('[data-cancel]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = decodeURIComponent(btn.getAttribute('data-cancel'));
                const title = btn.closest('.reg-row')?.querySelector('h3 a')?.textContent || 'this event';
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

    function renderStudent(user) {
        const mine = registrations.slice().sort((a, b) => (a.event?.date || '').localeCompare(b.event?.date || ''));
        const upcoming = mine.filter((r) => r.event && !window.ui.isPastDate(r.event.date));
        const past = mine.filter((r) => r.event && window.ui.isPastDate(r.event.date));
        const next = upcoming[0];
        page.stats.innerHTML = `
            ${tile('Registered', mine.length, 'events this semester')}
            ${tile('Upcoming', upcoming.length, upcoming.length === 1 ? 'event ahead' : 'events ahead')}
            ${tile('Next up', next ? '→' : '—', next ? next.event.title : 'nothing booked yet')}
        `;

        if (!mine.length) {
            page.body.innerHTML = window.ui.emptyStateHTML({
                icon: '✦',
                title: 'No registrations yet',
                text: 'Pick an event and save your seat. It will show up here.',
                actionHTML: `<a class="btn btn-primary" href="events.html">Browse events</a>`
            });
            return;
        }

        const sections = [];
        if (upcoming.length) sections.push(`
            <div>
                <div class="section-head"><div><span class="eyebrow">My registrations</span><h2>Upcoming</h2></div></div>
                <div class="list" id="student-upcoming"></div>
            </div>
        `);
        if (past.length) sections.push(`
            <div>
                <div class="section-head"><div><span class="eyebrow">Archive</span><h2>Past</h2></div></div>
                <div class="list" id="student-past"></div>
            </div>
        `);
        page.body.innerHTML = sections.join('');

        const upcomingSlot = document.getElementById('student-upcoming');
        if (upcomingSlot) { upcomingSlot.innerHTML = upcoming.map(regRow).join(''); wireCancel(upcomingSlot); }
        const pastSlot = document.getElementById('student-past');
        if (pastSlot) { pastSlot.innerHTML = past.map(regRow).join(''); }
    }

    function renderAdmin() {
        const upcoming = events.filter((e) => !window.ui.isPastDate(e.date));
        const totalRegs = registrations.length;
        const capacitySum = events.reduce((s, e) => s + (Number(e.capacity) || 0), 0);
        const seatsLeftSum = events.reduce((s, e) => s + (Number(e.seatsLeft) || 0), 0);
        const filled = capacitySum > 0 ? Math.round(((capacitySum - seatsLeftSum) / capacitySum) * 100) : 0;

        page.stats.innerHTML = `
            ${tile('Total events', events.length)}
            ${tile('Upcoming', upcoming.length)}
            ${tile('Total registrations', totalRegs)}
            ${tile('Seats filled', filled + '%', `${capacitySum - seatsLeftSum} of ${capacitySum}`)}
        `;

        page.body.innerHTML = `
            <div>
                <div class="section-head"><div><span class="eyebrow">Admin</span><h2>Manage events</h2></div><a class="btn btn-ghost" href="create-event.html">New event →</a></div>
                <div class="glass" style="padding:6px"><div class="table-wrap" id="admin-events-wrap"></div></div>
            </div>
            <div style="margin-top:40px">
                <div class="section-head"><div><span class="eyebrow">Admin</span><h2>All registrations</h2></div></div>
                <div class="glass" style="padding:6px"><div class="table-wrap" id="admin-regs-wrap"></div></div>
            </div>
        `;

        renderAdminEvents(document.getElementById('admin-events-wrap'));
        renderAdminRegs(document.getElementById('admin-regs-wrap'));
    }

    function renderAdminEvents(wrap) {
        if (!events.length) {
            wrap.innerHTML = `<div class="empty"><p class="muted">No events yet.</p><a class="btn btn-primary" href="create-event.html">Create the first event</a></div>`;
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
                    <td class="mono">${window.ui.escapeHtml(window.ui.formatDate(e.date))}</td>
                    <td class="mono">${reg} / ${cap || '—'}</td>
                    <td style="text-align:right">
                        <span class="row-actions">
                            <a class="btn btn-glass" href="create-event.html?id=${encodeURIComponent(e.id)}" style="min-height:36px;padding:0 .8rem;font-size:.78rem">Edit</a>
                            <button type="button" class="btn btn-danger" data-admin-del="${encodeURIComponent(e.id)}" data-title="${window.ui.escapeHtml(e.title || '')}" style="min-height:36px;padding:0 .8rem;font-size:.78rem">Delete</button>
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        wrap.innerHTML = `
            <table class="table">
                <thead><tr><th>Title</th><th>Category</th><th>Date</th><th>Registered</th><th style="text-align:right">Actions</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
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
            wrap.innerHTML = `<div class="empty"><p class="muted">No registrations yet.</p></div>`;
            return;
        }
        const sorted = registrations.slice().sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));
        const rows = sorted.map((r) => {
            const u = r.user || {};
            const e = r.event || {};
            return `
                <tr>
                    <td>${window.ui.escapeHtml(u.name || '—')}</td>
                    <td class="mono">${window.ui.escapeHtml(u.email || '—')}</td>
                    <td><a href="event-details.html?id=${encodeURIComponent(e.id)}">${window.ui.escapeHtml(e.title || '—')}</a></td>
                    <td class="mono">${window.ui.escapeHtml(window.ui.formatDate(r.registrationDate ? r.registrationDate.slice(0, 10) : ''))}</td>
                </tr>
            `;
        }).join('');
        wrap.innerHTML = `
            <table class="table">
                <thead><tr><th>Student</th><th>Email</th><th>Event</th><th>Registered</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    }

    function showError(message) {
        page.body.innerHTML = window.ui.errorStateHTML(message);
        const retry = page.body.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', load);
    }

    async function load() {
        page.stats.innerHTML = window.ui.skeletonCards(3);
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
