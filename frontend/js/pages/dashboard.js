(function () {
    'use strict';

    const page = {};
    let events = [];
    let registrations = [];

    function roleBadge(role) {
        const admin = role === 'admin';
        const cls = admin
            ? 'bg-orange-50 text-orange-700 border-orange-100'
            : 'bg-stone-50 text-stone-700 border-stone-200';
        return `<span class="inline-flex items-center gap-1 ${cls} border text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">${admin ? 'Administrator' : 'Student'}</span>`;
    }

    function statCard(label, value, hint) {
        return `
            <div class="bg-white border border-stone-200 rounded-3xl px-6 py-6 elevate-1">
                <p class="text-[11px] uppercase tracking-wider text-stone-500 font-semibold">${window.ui.escapeHtml(label)}</p>
                <p class="text-3xl font-extrabold text-stone-900 tracking-tight mt-1">${value}</p>
                ${hint ? `<p class="text-xs text-stone-500 mt-1">${window.ui.escapeHtml(hint)}</p>` : ''}
            </div>
        `;
    }

    function renderBanner(user) {
        page.banner.innerHTML = `
            <div class="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 elevate-1 flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
                <div class="flex items-center gap-5">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-bold text-2xl elevate-1">${window.ui.escapeHtml(window.ui.initials(user.name))}</div>
                    <div>
                        <h1 class="text-2xl font-extrabold text-stone-900 tracking-tight">Welcome back, ${window.ui.escapeHtml((user.name || '').split(' ')[0] || 'friend')}</h1>
                        <p class="text-stone-500 text-sm mt-1">${window.ui.escapeHtml(user.email || '')}${user.studentId ? ' · ' + window.ui.escapeHtml(user.studentId) : ''}</p>
                        <div class="mt-2">${roleBadge(user.role)}</div>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <a href="events.html" class="bg-white border border-stone-200 hover:border-stone-300 text-stone-800 font-medium rounded-full px-5 py-2.5 text-sm min-h-[44px] inline-flex items-center justify-center">Browse events</a>
                    ${user.role === 'admin' ? '<a href="create-event.html" class="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-2.5 text-sm min-h-[44px] inline-flex items-center justify-center elevate-1">Host new event</a>' : ''}
                </div>
            </div>
        `;
    }

    function regCardHTML(reg) {
        const event = reg.event || {};
        const past = window.ui.isPastDate(event.date);
        const dateLine = `${window.ui.formatDate(event.date)}${event.time ? ' · ' + window.ui.escapeHtml(event.time) : ''}`;
        return `
            <article class="bg-white border border-stone-200 rounded-3xl p-6 elevate-1 flex flex-col">
                <div class="flex items-center justify-between gap-3 mb-3 flex-wrap">
                    ${window.ui.categoryBadge(event.category)}
                    ${past ? '<span class="inline-flex items-center bg-stone-50 text-stone-600 border border-stone-200 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">Ended</span>' : '<span class="inline-flex items-center bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full">Registered</span>'}
                </div>
                <h3 class="text-lg font-bold text-stone-900 leading-snug mb-1">
                    <a href="event-details.html?id=${encodeURIComponent(event.id)}" class="hover:text-orange-600 transition-colors">${window.ui.escapeHtml(event.title || 'Untitled event')}</a>
                </h3>
                <p class="text-sm text-stone-500 mb-5">${window.ui.escapeHtml(dateLine)}${event.location ? ' · 📍 ' + window.ui.escapeHtml(event.location) : ''}</p>
                <div class="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
                    <span class="text-xs text-stone-500 truncate">Organizer: ${window.ui.escapeHtml(event.organizer || '—')}</span>
                    ${past ? '' : `<button type="button" data-cancel="${encodeURIComponent(event.id)}" class="text-xs font-semibold text-rose-600 hover:text-rose-700">Cancel registration</button>`}
                </div>
            </article>
        `;
    }

    function wireCancelButtons(container) {
        container.querySelectorAll('[data-cancel]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = decodeURIComponent(btn.getAttribute('data-cancel'));
                const title = btn.closest('article')?.querySelector('h3 a')?.textContent || 'this event';
                const ok = await window.ui.showConfirm({
                    title: 'Cancel registration?',
                    message: `You'll lose your seat for "${title}".`,
                    confirmText: 'Cancel registration',
                    danger: true
                });
                if (!ok) return;
                try {
                    await window.api.cancelRegistration(id);
                    window.ui.showToast('Registration cancelled', 'info');
                    await load();
                } catch (err) {
                    window.ui.showToast(err.message || 'Could not cancel registration', 'error');
                }
            });
        });
    }

    function renderStudent(user) {
        const upcoming = registrations.filter((r) => r.event && !window.ui.isPastDate(r.event.date))
            .sort((a, b) => (a.event.date || '').localeCompare(b.event.date || ''));
        const past = registrations.filter((r) => r.event && window.ui.isPastDate(r.event.date))
            .sort((a, b) => (b.event.date || '').localeCompare(a.event.date || ''));

        page.stats.innerHTML = `
            ${statCard('Registered events', registrations.length)}
            ${statCard('Upcoming', upcoming.length)}
        `;

        if (registrations.length === 0) {
            page.body.innerHTML = window.ui.emptyStateHTML({
                icon: '🎟️',
                title: "You haven't registered for any events yet",
                text: 'Browse the directory and reserve your seat in seconds.',
                actionHTML: `<a href="events.html" class="inline-flex items-center justify-center bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-2.5 text-sm elevate-1">Browse events</a>`
            });
            return;
        }

        page.body.innerHTML = `
            ${upcoming.length ? `
                <section class="mb-10">
                    <h2 class="text-xl font-bold text-stone-900 tracking-tight mb-4">Upcoming</h2>
                    <div id="student-upcoming" class="grid grid-cols-1 md:grid-cols-2 gap-5"></div>
                </section>
            ` : ''}
            ${past.length ? `
                <section>
                    <h2 class="text-xl font-bold text-stone-900 tracking-tight mb-4">Past</h2>
                    <div id="student-past" class="grid grid-cols-1 md:grid-cols-2 gap-5"></div>
                </section>
            ` : ''}
        `;

        const upcomingSlot = document.getElementById('student-upcoming');
        if (upcomingSlot) {
            upcomingSlot.innerHTML = upcoming.map(regCardHTML).join('');
            wireCancelButtons(upcomingSlot);
        }
        const pastSlot = document.getElementById('student-past');
        if (pastSlot) {
            pastSlot.innerHTML = past.map(regCardHTML).join('');
        }
    }

    function renderAdmin() {
        const upcoming = events.filter((e) => !window.ui.isPastDate(e.date));
        const totalRegs = registrations.length;
        const capacitySum = events.reduce((sum, e) => sum + (Number(e.capacity) || 0), 0);
        const seatsLeftSum = events.reduce((sum, e) => sum + (Number(e.seatsLeft) || 0), 0);
        const filled = capacitySum > 0 ? Math.round(((capacitySum - seatsLeftSum) / capacitySum) * 100) : 0;

        page.stats.innerHTML = `
            ${statCard('Total events', events.length)}
            ${statCard('Upcoming', upcoming.length)}
            ${statCard('Total registrations', totalRegs)}
            ${statCard('Seats filled', filled + '%', `${capacitySum - seatsLeftSum} of ${capacitySum}`)}
        `;

        page.body.innerHTML = `
            <section class="mb-10">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-stone-900 tracking-tight">Manage events</h2>
                    <a href="create-event.html" class="text-sm font-medium text-stone-700 hover:text-orange-600 inline-flex items-center gap-1">
                        New event <span aria-hidden="true">&rarr;</span>
                    </a>
                </div>
                <div class="bg-white border border-stone-200 rounded-3xl overflow-hidden elevate-1" id="admin-events-wrap"></div>
            </section>

            <section>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-xl font-bold text-stone-900 tracking-tight">All registrations</h2>
                </div>
                <div class="bg-white border border-stone-200 rounded-3xl overflow-hidden elevate-1" id="admin-regs-wrap"></div>
            </section>
        `;

        renderAdminEvents(document.getElementById('admin-events-wrap'));
        renderAdminRegs(document.getElementById('admin-regs-wrap'));
    }

    function renderAdminEvents(wrap) {
        if (events.length === 0) {
            wrap.innerHTML = `<div class="p-10 text-center text-sm text-stone-500">No events yet. <a href="create-event.html" class="text-orange-600 font-medium">Create the first one</a>.</div>`;
            return;
        }
        const regByEvent = new Map();
        registrations.forEach((r) => {
            if (!r.event) return;
            const key = String(r.event.id);
            regByEvent.set(key, (regByEvent.get(key) || 0) + 1);
        });

        wrap.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="bg-stone-50 text-stone-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            <th class="text-left font-semibold px-5 py-3">Title</th>
                            <th class="text-left font-semibold px-5 py-3">Category</th>
                            <th class="text-left font-semibold px-5 py-3">Date</th>
                            <th class="text-left font-semibold px-5 py-3">Registered</th>
                            <th class="text-right font-semibold px-5 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-stone-100">
                        ${events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || '')).map((e) => {
                            const reg = regByEvent.get(String(e.id)) || 0;
                            const cap = Number(e.capacity) || 0;
                            return `
                                <tr>
                                    <td class="px-5 py-3 font-medium text-stone-900">
                                        <a href="event-details.html?id=${encodeURIComponent(e.id)}" class="hover:text-orange-600">${window.ui.escapeHtml(e.title || '—')}</a>
                                    </td>
                                    <td class="px-5 py-3">${window.ui.categoryBadge(e.category)}</td>
                                    <td class="px-5 py-3 text-stone-600">${window.ui.escapeHtml(window.ui.formatDate(e.date))}</td>
                                    <td class="px-5 py-3 text-stone-700">${reg} / ${cap || '—'}</td>
                                    <td class="px-5 py-3 text-right">
                                        <div class="inline-flex items-center gap-2">
                                            <a href="create-event.html?id=${encodeURIComponent(e.id)}" class="bg-white border border-stone-200 hover:border-stone-300 text-stone-800 text-xs font-semibold rounded-full px-3 py-1.5 min-h-[36px] inline-flex items-center">Edit</a>
                                            <button type="button" data-admin-del="${encodeURIComponent(e.id)}" data-title="${window.ui.escapeHtml(e.title || '')}" class="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-full px-3 py-1.5 min-h-[36px]">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        wrap.querySelectorAll('[data-admin-del]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = decodeURIComponent(btn.getAttribute('data-admin-del'));
                const title = btn.getAttribute('data-title') || 'this event';
                await window.ui.confirmAndDeleteEvent({ id, title }, async () => {
                    await load();
                });
            });
        });
    }

    function renderAdminRegs(wrap) {
        if (registrations.length === 0) {
            wrap.innerHTML = `<div class="p-10 text-center text-sm text-stone-500">No registrations yet.</div>`;
            return;
        }
        const sorted = registrations.slice().sort((a, b) => (b.registrationDate || '').localeCompare(a.registrationDate || ''));
        wrap.innerHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="bg-stone-50 text-stone-500 text-[11px] uppercase tracking-wider">
                        <tr>
                            <th class="text-left font-semibold px-5 py-3">Student</th>
                            <th class="text-left font-semibold px-5 py-3">Email</th>
                            <th class="text-left font-semibold px-5 py-3">Event</th>
                            <th class="text-left font-semibold px-5 py-3">Registered on</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-stone-100">
                        ${sorted.map((r) => {
                            const u = r.user || {};
                            const e = r.event || {};
                            return `
                                <tr>
                                    <td class="px-5 py-3 font-medium text-stone-900">${window.ui.escapeHtml(u.name || '—')}</td>
                                    <td class="px-5 py-3 text-stone-600">${window.ui.escapeHtml(u.email || '—')}</td>
                                    <td class="px-5 py-3 text-stone-700">
                                        <a href="event-details.html?id=${encodeURIComponent(e.id)}" class="hover:text-orange-600">${window.ui.escapeHtml(e.title || '—')}</a>
                                    </td>
                                    <td class="px-5 py-3 text-stone-500">${window.ui.escapeHtml(window.ui.formatDate(r.registrationDate ? r.registrationDate.slice(0, 10) : '') || '—')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
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
        page.stats.innerHTML = window.ui.skeletonCards(2).replace(/h-48/g, 'h-20');
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
