(function () {
    'use strict';

    let currentEvent = null;
    let registered = false;
    let adminRegCount = 0;

    const page = {};

    function categoryColor(cat) {
        return window.ui.CATEGORY_COLORS[(cat || '').toLowerCase()] || 'slate';
    }

    function timeRange(event) {
        return event.time || '';
    }

    function showNotFound() {
        page.content.innerHTML = `
            <div class="max-w-xl mx-auto text-center py-20">
                <div class="text-5xl mb-4" aria-hidden="true">🧭</div>
                <h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">Event not found</h1>
                <p class="text-slate-400 mb-8">We couldn't find the event you're looking for. It may have been removed.</p>
                <a href="events.html" class="inline-flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 px-5 py-2.5 text-sm min-h-[44px]">Back to events</a>
            </div>
        `;
    }

    function showError(message) {
        page.content.innerHTML = window.ui.errorStateHTML(message);
        const retry = page.content.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', load);
    }

    function renderEvent(event) {
        document.title = `${event.title} — CampusHub`;
        const color = categoryColor(event.category);
        const img = event.image
            ? `<img src="${window.ui.escapeHtml(event.image)}" alt="${window.ui.escapeHtml(event.title)}" class="w-full h-full object-cover" onerror="this.outerHTML='<div class=\\'w-full h-full bg-gradient-to-br from-${color}-500/30 via-slate-800 to-slate-900\\'></div>'">`
            : `<div class="w-full h-full bg-gradient-to-br from-${color}-500/30 via-slate-800 to-slate-900"></div>`;

        const capacity = Number(event.capacity);
        const seatsLeft = Number(event.seatsLeft);
        const seatsText = Number.isFinite(seatsLeft) && Number.isFinite(capacity)
            ? `${seatsLeft} of ${capacity} seats left`
            : (Number.isFinite(seatsLeft) ? `${seatsLeft} seats left` : '—');
        const seatsPct = (Number.isFinite(seatsLeft) && Number.isFinite(capacity) && capacity > 0)
            ? Math.round(((capacity - seatsLeft) / capacity) * 100)
            : 0;

        page.content.innerHTML = `
            <div class="mb-6">
                <a href="events.html" class="text-sm font-semibold text-slate-400 hover:text-orange-400 inline-flex items-center gap-1">
                    <span aria-hidden="true">&larr;</span> Back to events
                </a>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div class="lg:col-span-2 space-y-8">
                    <div class="rounded-2xl overflow-hidden border border-slate-800 h-64 sm:h-80 relative">
                        ${img}
                        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent pointer-events-none"></div>
                    </div>

                    <div>
                        <div class="flex items-center flex-wrap gap-3 mb-4">
                            ${window.ui.categoryBadge(event.category)}
                            <span class="text-xs text-slate-400">${window.ui.escapeHtml(window.ui.formatDate(event.date))}${event.time ? ' · ' + window.ui.escapeHtml(event.time) : ''}</span>
                        </div>
                        <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">${window.ui.escapeHtml(event.title)}</h1>
                        <p class="text-slate-300 leading-relaxed text-base mb-6 whitespace-pre-line">${window.ui.escapeHtml(event.description || '')}</p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                            ${infoRow('Location', event.location)}
                            ${infoRow('Date', window.ui.formatDate(event.date))}
                            ${infoRow('Time', timeRange(event))}
                            ${seatsBlock(seatsText, seatsPct)}
                            ${infoRow('Organizer', event.organizer)}
                            ${infoRow('Prerequisites', event.prerequisites || 'None')}
                        </div>
                    </div>
                </div>

                <aside class="lg:col-span-1">
                    <div id="registration-card" class="lg:sticky lg:top-24"></div>
                </aside>
            </div>
        `;
    }

    function infoRow(label, value) {
        return `
            <div>
                <span class="text-xs text-slate-400 block mb-1 font-medium uppercase tracking-wider">${window.ui.escapeHtml(label)}</span>
                <span class="text-white font-semibold text-sm block">${window.ui.escapeHtml(value || '—')}</span>
            </div>
        `;
    }

    function seatsBlock(text, pct) {
        return `
            <div class="sm:col-span-2">
                <span class="text-xs text-slate-400 block mb-1 font-medium uppercase tracking-wider">Available seats</span>
                <span class="text-white font-semibold text-sm block mb-2">${window.ui.escapeHtml(text)}</span>
                <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div class="h-full bg-orange-500 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }

    function registrationCard() {
        const slot = document.getElementById('registration-card');
        if (!slot) return;
        const event = currentEvent;
        const past = window.ui.isPastDate(event.date);
        const full = Number(event.seatsLeft) === 0;

        if (!window.isLoggedIn()) {
            slot.innerHTML = `
                <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h2 class="text-lg font-bold text-white mb-1">Sign in to register</h2>
                    <p class="text-sm text-slate-400 mb-5">Students need to be signed in to reserve a seat.</p>
                    <a href="login.html?redirect=${encodeURIComponent('event-details.html?id=' + event.id)}"
                       class="w-full inline-flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 px-5 py-3 text-sm min-h-[44px] focus-visible:ring-2 focus-visible:ring-orange-400">Sign in to register</a>
                </div>
            `;
            return;
        }

        if (window.isAdmin()) {
            slot.innerHTML = `
                <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <div>
                        <h2 class="text-lg font-bold text-white mb-1">Admin panel</h2>
                        <p class="text-sm text-slate-400">Manage this event.</p>
                    </div>
                    <div class="bg-slate-950 border border-slate-800 rounded-xl p-4">
                        <p class="text-xs uppercase tracking-wider text-slate-400 mb-1">Registered students</p>
                        <p class="text-3xl font-extrabold text-white">${adminRegCount}</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <a href="create-event.html?id=${encodeURIComponent(event.id)}"
                           class="w-full inline-flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 px-5 py-3 text-sm min-h-[44px]">Edit event</a>
                        <button type="button" data-admin-delete
                                class="w-full inline-flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-600/30 px-5 py-3 text-sm min-h-[44px]">Delete event</button>
                    </div>
                </div>
            `;
            const del = slot.querySelector('[data-admin-delete]');
            if (del) del.addEventListener('click', () => {
                window.ui.confirmAndDeleteEvent(event, () => {
                    window.ui.setFlash(`Deleted "${event.title}"`, 'success');
                    location.href = 'events.html';
                });
            });
            return;
        }

        if (past) {
            slot.innerHTML = `
                <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl text-center">
                    <div class="text-3xl mb-2" aria-hidden="true">🏁</div>
                    <h2 class="text-lg font-bold text-white mb-1">This event has ended</h2>
                    <p class="text-sm text-slate-400 mb-5">Registrations are closed.</p>
                    <button type="button" disabled class="w-full inline-flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-500 font-semibold rounded-xl px-5 py-3 text-sm min-h-[44px] cursor-not-allowed">Registration closed</button>
                </div>
            `;
            return;
        }

        if (registered) {
            slot.innerHTML = `
                <div class="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-6 shadow-xl">
                    <div class="flex items-start gap-3 mb-4">
                        <span class="inline-flex w-8 h-8 rounded-full bg-emerald-500 text-white items-center justify-center font-bold" aria-hidden="true">&check;</span>
                        <div>
                            <h2 class="text-lg font-bold text-white">You're registered</h2>
                            <p class="text-sm text-emerald-100">We've saved your spot for ${window.ui.escapeHtml(event.title)}.</p>
                        </div>
                    </div>
                    <button type="button" data-cancel-reg class="w-full inline-flex items-center justify-center bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-600/30 px-5 py-3 text-sm min-h-[44px]">Cancel registration</button>
                </div>
            `;
            const cancel = slot.querySelector('[data-cancel-reg]');
            if (cancel) cancel.addEventListener('click', onCancel);
            return;
        }

        if (full) {
            slot.innerHTML = `
                <div class="bg-slate-900/80 border border-rose-500/40 rounded-2xl p-6 shadow-xl text-center">
                    <div class="text-3xl mb-2" aria-hidden="true">🚫</div>
                    <h2 class="text-lg font-bold text-white mb-1">Event is full</h2>
                    <p class="text-sm text-rose-100 mb-5">All seats have been taken. Check back later in case someone cancels.</p>
                    <button type="button" disabled class="w-full inline-flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-500 font-semibold rounded-xl px-5 py-3 text-sm min-h-[44px] cursor-not-allowed">Full</button>
                </div>
            `;
            return;
        }

        const user = window.getCurrentUser() || {};
        slot.innerHTML = `
            <form id="registration-form" class="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4" novalidate>
                <div>
                    <h2 class="text-lg font-bold text-white">Reserve your seat</h2>
                    <p class="text-sm text-slate-400">Confirm your details below.</p>
                </div>
                <div id="form-server-error" class="hidden bg-rose-500/10 border border-rose-500/40 text-rose-100 text-sm rounded-xl px-4 py-3"></div>
                <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider" for="reg-name">Full name</label>
                    <input id="reg-name" type="text" readonly value="${window.ui.escapeHtml(user.name || '')}"
                           class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider" for="reg-email">University email</label>
                    <input id="reg-email" type="email" readonly value="${window.ui.escapeHtml(user.email || '')}"
                           class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider" for="reg-studentid">Student ID</label>
                    <input id="reg-studentid" type="text" readonly value="${window.ui.escapeHtml(user.studentId || '')}"
                           class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 cursor-not-allowed">
                </div>
                <label class="flex items-start gap-3 text-sm text-slate-300">
                    <input id="reg-agree" type="checkbox" required class="mt-0.5 w-5 h-5 accent-orange-500">
                    <span>I will attend and agree to the event rules.</span>
                </label>
                <p id="reg-agree-error" class="hidden text-rose-400 text-xs"></p>
                <button id="reg-submit" type="submit"
                        class="w-full inline-flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 px-5 py-3 text-sm min-h-[44px] focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-60 disabled:cursor-not-allowed">Confirm Registration</button>
            </form>
        `;

        document.getElementById('registration-form').addEventListener('submit', onSubmit);
    }

    async function onSubmit(e) {
        e.preventDefault();
        const agree = document.getElementById('reg-agree');
        const agreeError = document.getElementById('reg-agree-error');
        const serverError = document.getElementById('form-server-error');
        serverError.classList.add('hidden');
        if (!agree.checked) {
            agreeError.textContent = 'Please confirm you will attend before registering.';
            agreeError.classList.remove('hidden');
            agree.focus();
            return;
        }
        agreeError.classList.add('hidden');
        const btn = document.getElementById('reg-submit');
        window.ui.setButtonLoading(btn, true, 'Registering...');
        try {
            await window.api.registerForEvent(currentEvent.id);
            window.ui.showToast(`You're registered for ${currentEvent.title}!`, 'success');
            await reloadEvent();
        } catch (err) {
            serverError.textContent = err.message || 'Could not register for this event.';
            serverError.classList.remove('hidden');
            window.ui.setButtonLoading(btn, false);
        }
    }

    async function onCancel() {
        const ok = await window.ui.showConfirm({
            title: 'Cancel registration?',
            message: `You'll lose your seat for "${currentEvent.title}".`,
            confirmText: 'Cancel registration',
            danger: true
        });
        if (!ok) return;
        try {
            await window.api.cancelRegistration(currentEvent.id);
            window.ui.showToast('Registration cancelled', 'info');
            await reloadEvent();
        } catch (err) {
            window.ui.showToast(err.message || 'Could not cancel registration', 'error');
        }
    }

    async function detectRegistrationState(event) {
        if (!window.isLoggedIn()) {
            registered = false;
            adminRegCount = 0;
            return;
        }
        try {
            const regs = await window.api.getRegistrations();
            const matches = (regs || []).filter((r) => r && r.event && String(r.event.id) === String(event.id));
            if (window.isAdmin()) {
                adminRegCount = matches.length;
                registered = false;
            } else {
                registered = matches.length > 0;
                adminRegCount = 0;
            }
        } catch (_) {
            registered = false;
            adminRegCount = 0;
        }
    }

    async function reloadEvent() {
        const event = await window.api.getEvent(currentEvent.id);
        currentEvent = event;
        await detectRegistrationState(event);
        renderEvent(event);
        registrationCard();
    }

    async function load() {
        const id = window.ui.getParam('id');
        if (!id || /^\s*$/.test(id)) {
            showNotFound();
            return;
        }
        page.content.innerHTML = window.ui.skeletonCards(1);
        try {
            const event = await window.api.getEvent(id);
            currentEvent = event;
            await detectRegistrationState(event);
            renderEvent(event);
            registrationCard();
        } catch (err) {
            if (err.status === 404 || err.status === 400) {
                showNotFound();
                return;
            }
            showError(err.message);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        page.content = document.getElementById('event-details-content');
        load();
    });
})();
