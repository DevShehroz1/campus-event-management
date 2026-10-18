(function () {
    'use strict';

    let currentEvent = null;
    let registered = false;
    let adminRegCount = 0;

    const page = {};

    function categoryColor(cat) {
        return window.ui.CATEGORY_COLORS[(cat || '').toLowerCase()] || 'stone';
    }

    function showNotFound() {
        page.content.innerHTML = `
            <div class="max-w-xl mx-auto text-center py-20">
                <div class="text-5xl mb-4" aria-hidden="true">🧭</div>
                <h1 class="text-3xl font-extrabold text-stone-900 tracking-tight mb-2">Event not found</h1>
                <p class="text-stone-500 mb-8">We couldn't find the event you're looking for. It may have been removed.</p>
                <a href="events.html" class="inline-flex items-center justify-center bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-2.5 text-sm min-h-[44px] elevate-1">Back to events</a>
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
            ? `<img src="${window.ui.escapeHtml(event.image)}" alt="${window.ui.escapeHtml(event.title)}" class="w-full h-full object-cover" onerror="this.outerHTML='<div class=\\'w-full h-full bg-gradient-to-br from-${color}-100 via-stone-50 to-white\\'></div>'">`
            : `<div class="w-full h-full bg-gradient-to-br from-${color}-100 via-stone-50 to-white"></div>`;

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
                <a href="events.html" class="text-sm font-medium text-stone-600 hover:text-stone-900 inline-flex items-center gap-1">
                    <span aria-hidden="true">&larr;</span> Back to events
                </a>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
                <div class="lg:col-span-2 space-y-8">
                    <div class="rounded-3xl overflow-hidden border border-stone-200 bg-white h-64 sm:h-80 relative elevate-1">
                        ${img}
                    </div>

                    <div>
                        <div class="flex items-center flex-wrap gap-3 mb-4">
                            ${window.ui.categoryBadge(event.category)}
                            <span class="text-xs text-stone-500">${window.ui.escapeHtml(window.ui.formatDate(event.date))}${event.time ? ' · ' + window.ui.escapeHtml(event.time) : ''}</span>
                        </div>
                        <h1 class="text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight mb-5 leading-[1.1]">${window.ui.escapeHtml(event.title)}</h1>
                        <p class="text-stone-700 leading-relaxed text-base mb-8 whitespace-pre-line">${window.ui.escapeHtml(event.description || '')}</p>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-stone-200 elevate-1">
                            ${infoRow('Location', event.location)}
                            ${infoRow('Date', window.ui.formatDate(event.date))}
                            ${infoRow('Time', event.time || '—')}
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
                <span class="text-[11px] text-stone-500 block mb-1 font-semibold uppercase tracking-wider">${window.ui.escapeHtml(label)}</span>
                <span class="text-stone-900 font-semibold text-sm block">${window.ui.escapeHtml(value || '—')}</span>
            </div>
        `;
    }

    function seatsBlock(text, pct) {
        return `
            <div class="sm:col-span-2">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[11px] text-stone-500 font-semibold uppercase tracking-wider">Available seats</span>
                    <span class="text-stone-900 font-semibold text-sm">${window.ui.escapeHtml(text)}</span>
                </div>
                <div class="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div class="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all" style="width: ${pct}%"></div>
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
                <div class="bg-white border border-stone-200 rounded-3xl p-6 elevate-2">
                    <h2 class="text-lg font-bold text-stone-900 mb-1">Sign in to register</h2>
                    <p class="text-sm text-stone-500 mb-5 leading-relaxed">Students need to be signed in to reserve a seat.</p>
                    <a href="login.html?redirect=${encodeURIComponent('event-details.html?id=' + event.id)}"
                       class="w-full inline-flex items-center justify-center bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-3 text-sm min-h-[44px] elevate-1 focus-ring">Sign in to register</a>
                </div>
            `;
            return;
        }

        if (window.isAdmin()) {
            slot.innerHTML = `
                <div class="bg-white border border-stone-200 rounded-3xl p-6 elevate-2 space-y-5">
                    <div>
                        <span class="inline-flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-100 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full mb-2">Admin</span>
                        <h2 class="text-lg font-bold text-stone-900">Manage event</h2>
                    </div>
                    <div class="bg-stone-50 border border-stone-200 rounded-2xl p-4">
                        <p class="text-[11px] uppercase tracking-wider text-stone-500 font-semibold mb-1">Registered students</p>
                        <p class="text-3xl font-extrabold text-stone-900">${adminRegCount}</p>
                    </div>
                    <div class="flex flex-col gap-2">
                        <a href="create-event.html?id=${encodeURIComponent(event.id)}"
                           class="w-full inline-flex items-center justify-center bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-3 text-sm min-h-[44px] elevate-1">Edit event</a>
                        <button type="button" data-admin-delete
                                class="w-full inline-flex items-center justify-center bg-rose-500 hover:bg-rose-600 text-white font-medium rounded-full px-5 py-3 text-sm min-h-[44px] elevate-1">Delete event</button>
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
                <div class="bg-white border border-stone-200 rounded-3xl p-6 elevate-1 text-center">
                    <div class="text-3xl mb-2" aria-hidden="true">🏁</div>
                    <h2 class="text-lg font-bold text-stone-900 mb-1">This event has ended</h2>
                    <p class="text-sm text-stone-500 mb-5">Registrations are closed.</p>
                    <button type="button" disabled class="w-full inline-flex items-center justify-center bg-stone-100 border border-stone-200 text-stone-400 font-medium rounded-full px-5 py-3 text-sm min-h-[44px] cursor-not-allowed">Registration closed</button>
                </div>
            `;
            return;
        }

        if (registered) {
            slot.innerHTML = `
                <div class="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 elevate-1">
                    <div class="flex items-start gap-3 mb-4">
                        <span class="inline-flex w-8 h-8 rounded-full bg-emerald-500 text-white items-center justify-center font-bold" aria-hidden="true">&check;</span>
                        <div>
                            <h2 class="text-lg font-bold text-stone-900">You're registered</h2>
                            <p class="text-sm text-emerald-800">We've saved your spot for ${window.ui.escapeHtml(event.title)}.</p>
                        </div>
                    </div>
                    <button type="button" data-cancel-reg class="w-full inline-flex items-center justify-center bg-white border border-stone-200 hover:border-rose-300 hover:text-rose-600 text-stone-700 font-medium rounded-full px-5 py-3 text-sm min-h-[44px]">Cancel registration</button>
                </div>
            `;
            const cancel = slot.querySelector('[data-cancel-reg]');
            if (cancel) cancel.addEventListener('click', onCancel);
            return;
        }

        if (full) {
            slot.innerHTML = `
                <div class="bg-white border border-rose-200 rounded-3xl p-6 elevate-1 text-center">
                    <div class="text-3xl mb-2" aria-hidden="true">🚫</div>
                    <h2 class="text-lg font-bold text-stone-900 mb-1">Event is full</h2>
                    <p class="text-sm text-rose-700 mb-5">All seats have been taken. Check back later in case someone cancels.</p>
                    <button type="button" disabled class="w-full inline-flex items-center justify-center bg-stone-100 border border-stone-200 text-stone-400 font-medium rounded-full px-5 py-3 text-sm min-h-[44px] cursor-not-allowed">Full</button>
                </div>
            `;
            return;
        }

        const user = window.getCurrentUser() || {};
        slot.innerHTML = `
            <form id="registration-form" class="bg-white border border-stone-200 rounded-3xl p-6 elevate-2 space-y-4" novalidate>
                <div>
                    <h2 class="text-lg font-bold text-stone-900">Reserve your seat</h2>
                    <p class="text-sm text-stone-500">Confirm your details below.</p>
                </div>
                <div id="form-server-error" class="hidden bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl px-4 py-3"></div>
                <div>
                    <label class="block text-[11px] font-semibold text-stone-600 mb-1.5 uppercase tracking-wider" for="reg-name">Full name</label>
                    <input id="reg-name" type="text" readonly value="${window.ui.escapeHtml(user.name || '')}"
                           class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-stone-600 mb-1.5 uppercase tracking-wider" for="reg-email">University email</label>
                    <input id="reg-email" type="email" readonly value="${window.ui.escapeHtml(user.email || '')}"
                           class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 cursor-not-allowed">
                </div>
                <div>
                    <label class="block text-[11px] font-semibold text-stone-600 mb-1.5 uppercase tracking-wider" for="reg-studentid">Student ID</label>
                    <input id="reg-studentid" type="text" readonly value="${window.ui.escapeHtml(user.studentId || '')}"
                           class="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 cursor-not-allowed">
                </div>
                <label class="flex items-start gap-3 text-sm text-stone-700">
                    <input id="reg-agree" type="checkbox" required class="mt-0.5 w-5 h-5 accent-orange-500">
                    <span>I will attend and agree to the event rules.</span>
                </label>
                <p id="reg-agree-error" class="hidden text-rose-600 text-xs"></p>
                <button id="reg-submit" type="submit"
                        class="w-full inline-flex items-center justify-center bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-full px-5 py-3 text-sm min-h-[44px] elevate-1 focus-ring disabled:opacity-60 disabled:cursor-not-allowed">Confirm registration</button>
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
