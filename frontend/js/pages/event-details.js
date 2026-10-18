(function () {
    'use strict';

    const page = {};
    let currentEvent = null;
    let registered = false;
    let adminRegCount = 0;

    function showNotFound() {
        page.content.innerHTML = `
            <div class="empty" style="padding:80px 20px">
                <div class="glyph" aria-hidden="true">🧭</div>
                <h3>Event not found</h3>
                <p>We couldn't find the event you're looking for. It may have been removed.</p>
                <a class="btn btn-primary" href="events.html">Back to events</a>
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
        const key = (event.category || '').toLowerCase();
        const bannerInner = event.image
            ? `<img src="${window.ui.escapeHtml(event.image)}" alt="${window.ui.escapeHtml(event.title)}" onerror="this.outerHTML='<div class=&quot;placeholder&quot;>${window.ui.escapeHtml(window.ui.categoryLabel(key) || 'event')}</div>'">`
            : `<div class="placeholder">${window.ui.escapeHtml(window.ui.categoryLabel(key) || 'event')}</div>`;

        page.content.innerHTML = `
            <div class="detail">
                <div class="detail-main">
                    <div class="detail-banner">${bannerInner}</div>
                    <div class="detail-meta" style="margin-top:20px">
                        ${window.ui.categoryBadge(event.category)}
                        <span>${window.ui.escapeHtml(window.ui.formatDateLong(event.date))}${event.time ? ' · ' + window.ui.escapeHtml(event.time) : ''}</span>
                    </div>
                    <h1>${window.ui.escapeHtml(event.title)}</h1>
                    <p class="detail-desc">${window.ui.escapeHtml(event.description || '')}</p>

                    <div class="facts">
                        ${fact('Date', window.ui.formatDateLong(event.date))}
                        ${fact('Time', event.time || '—')}
                        ${fact('Location', event.location || '—')}
                        ${fact('Category', window.ui.categoryLabel(event.category))}
                        ${fact('Organizer', event.organizer || '—')}
                        ${fact('Prerequisites', event.prerequisites || 'None')}
                    </div>
                </div>
                <aside>
                    <div id="registration-card" class="reg-card"></div>
                </aside>
            </div>
        `;
        renderRegistrationCard();
    }

    function fact(label, value) {
        return `<div class="fact"><span class="fact-label">${window.ui.escapeHtml(label)}</span><span class="fact-value">${window.ui.escapeHtml(value || '—')}</span></div>`;
    }

    function renderRegistrationCard() {
        const slot = document.getElementById('registration-card');
        if (!slot) return;
        const event = currentEvent;
        const past = window.ui.isPastDate(event.date);
        const full = Number(event.seatsLeft) === 0;
        const left = Number.isFinite(Number(event.seatsLeft)) ? event.seatsLeft : '—';
        const cap  = Number.isFinite(Number(event.capacity)) ? event.capacity : '—';

        const seatsSection = `
            <div>
                <div class="seats-headline"><b>${left}</b><span>of ${cap} seats left</span></div>
                ${window.ui.seatsBar(event)}
            </div>
        `;

        if (!window.isLoggedIn()) {
            slot.innerHTML = `
                ${seatsSection}
                <p class="muted" style="font-size:.9rem">Sign in with your university account to reserve a seat.</p>
                <a class="btn btn-primary btn-block" href="login.html?redirect=${encodeURIComponent('event-details.html?id=' + event.id)}">Sign in to register</a>
            `;
            return;
        }

        if (window.isAdmin()) {
            slot.innerHTML = `
                ${seatsSection}
                <div>
                    <p class="muted" style="font-size:.78rem;text-transform:uppercase;letter-spacing:.04em;font-weight:600;color:var(--ink-3)">Registrations</p>
                    <p style="font-size:1.8rem;font-weight:800;letter-spacing:-0.02em">${adminRegCount}</p>
                    <p class="muted" style="font-size:.82rem;color:var(--ink-3)">students registered</p>
                </div>
                <div style="display:grid;gap:8px">
                    <a class="btn btn-primary btn-block" href="create-event.html?id=${encodeURIComponent(event.id)}">Edit event</a>
                    <button type="button" class="btn btn-danger btn-block" data-admin-delete>Delete event</button>
                </div>
            `;
            slot.querySelector('[data-admin-delete]').addEventListener('click', () => {
                window.ui.confirmAndDeleteEvent(event, () => {
                    window.ui.setFlash(`Deleted "${event.title}"`, 'success');
                    location.href = 'events.html';
                });
            });
            return;
        }

        if (past) {
            slot.innerHTML = `
                ${seatsSection}
                <p class="muted" style="font-size:.9rem">This event has ended. Registrations are closed.</p>
                <button type="button" class="btn btn-outline btn-block" disabled>Event ended</button>
            `;
            return;
        }

        if (registered) {
            slot.innerHTML = `
                ${seatsSection}
                <div class="registered-banner"><span aria-hidden="true">✓</span><span>You're registered for this event</span></div>
                <p class="muted" style="font-size:.88rem">We'll keep your seat. If plans change, cancel so someone else can go.</p>
                <button type="button" class="btn btn-danger btn-block" data-cancel-reg>Cancel registration</button>
            `;
            slot.querySelector('[data-cancel-reg]').addEventListener('click', onCancel);
            return;
        }

        if (full) {
            slot.innerHTML = `
                ${seatsSection}
                <p class="muted" style="font-size:.9rem">All ${event.capacity} seats are taken. Check back in case someone cancels.</p>
                <button type="button" class="btn btn-outline btn-block" disabled>Event is full</button>
            `;
            return;
        }

        const user = window.getCurrentUser() || {};
        slot.innerHTML = `
            ${seatsSection}
            <form class="form" id="registration-form" style="display:grid;gap:12px" novalidate>
                <div class="server-error" id="reg-server-error" hidden></div>
                <div class="field"><label for="reg-name">Full name</label><input id="reg-name" value="${window.ui.escapeHtml(user.name || '')}" readonly></div>
                <div class="field"><label for="reg-email">University email</label><input id="reg-email" value="${window.ui.escapeHtml(user.email || '')}" readonly></div>
                <div class="field"><label for="reg-studentid">Student ID</label><input id="reg-studentid" value="${window.ui.escapeHtml(user.studentId || '')}" readonly></div>
                <label class="check"><input type="checkbox" id="reg-agree"> I will attend and agree to the event rules</label>
                <span class="error" id="reg-agree-error" hidden>Please confirm you will attend.</span>
                <button class="btn btn-primary btn-block" id="reg-submit" type="submit">Confirm registration</button>
            </form>
        `;
        slot.querySelector('#registration-form').addEventListener('submit', onSubmit);
    }

    async function onSubmit(e) {
        e.preventDefault();
        const err = document.getElementById('reg-server-error');
        const agree = document.getElementById('reg-agree');
        const agreeErr = document.getElementById('reg-agree-error');
        err.hidden = true;
        if (!agree.checked) {
            agreeErr.hidden = false;
            agree.focus();
            return;
        }
        agreeErr.hidden = true;
        const btn = document.getElementById('reg-submit');
        window.ui.setButtonLoading(btn, true, 'Registering…');
        try {
            await window.api.registerForEvent(currentEvent.id);
            window.ui.showToast(`You're registered for ${currentEvent.title}.`, 'success');
            await reload();
        } catch (ex) {
            err.textContent = ex.message || 'Could not register for this event.';
            err.hidden = false;
            window.ui.setButtonLoading(btn, false);
        }
    }

    async function onCancel() {
        const ok = await window.ui.showConfirm({
            title: 'Cancel registration?',
            message: `Your seat at "${currentEvent.title}" will be released for another student.`,
            confirmText: 'Cancel registration',
            cancelText: 'Keep my seat',
            danger: true
        });
        if (!ok) return;
        try {
            await window.api.cancelRegistration(currentEvent.id);
            window.ui.showToast('Registration cancelled.', 'info');
            await reload();
        } catch (err) {
            window.ui.showToast(err.message || 'Could not cancel registration', 'error');
        }
    }

    async function detectState(event) {
        if (!window.isLoggedIn()) { registered = false; adminRegCount = 0; return; }
        try {
            const regs = await window.api.getRegistrations();
            const matches = (regs || []).filter((r) => r && r.event && String(r.event.id) === String(event.id));
            if (window.isAdmin()) { adminRegCount = matches.length; registered = false; }
            else { registered = matches.length > 0; adminRegCount = 0; }
        } catch (_) { registered = false; adminRegCount = 0; }
    }

    async function reload() {
        const event = await window.api.getEvent(currentEvent.id);
        currentEvent = event;
        await detectState(event);
        renderEvent(event);
    }

    async function load() {
        const id = window.ui.getParam('id');
        if (!id || /^\s*$/.test(id)) { showNotFound(); return; }
        page.content.innerHTML = `<div class="skel-card" style="height:300px"><div class="skel skel-art"></div></div>`;
        try {
            const event = await window.api.getEvent(id);
            currentEvent = event;
            await detectState(event);
            renderEvent(event);
        } catch (err) {
            if (err.status === 404 || err.status === 400) { showNotFound(); return; }
            showError(err.message);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        page.content = document.getElementById('event-details-content');
        load();
    });
})();
