(function () {
    'use strict';

    const page = {};
    let currentEvent = null;
    let registered = false;
    let adminRegCount = 0;

    function showNotFound() {
        page.content.innerHTML = `
            <div class="detail-notfound">
                <div class="ring glass" style="width:72px;height:72px;display:grid;place-items:center;border-radius:50%;font-size:1.8rem">🧭</div>
                <h1 style="font-size:2.2rem">Event not found</h1>
                <p class="muted">We couldn't find the event you're looking for. It may have been removed.</p>
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
        const bannerImg = event.image
            ? `<img src="${window.ui.escapeHtml(event.image)}" alt="${window.ui.escapeHtml(event.title)}" onerror="this.remove()">`
            : '<div class="ticket-art"></div>';
        page.content.innerHTML = `
            <div class="detail">
                <div style="display:grid;gap:24px;min-width:0">
                    <div class="banner glass" data-cat="${window.ui.escapeHtml((event.category || '').toLowerCase())}">
                        ${bannerImg}
                        ${window.ui.categoryBadge(event.category)}
                    </div>
                    <div>
                        <p class="mono faint" style="font-size:.85rem">${window.ui.escapeHtml(window.ui.formatDate(event.date))}${event.time ? ' · ' + window.ui.escapeHtml(event.time) : ''}</p>
                        <h1 style="font-size:clamp(1.9rem,4vw,2.8rem);margin-top:8px">${window.ui.escapeHtml(event.title)}</h1>
                        <p class="muted" style="margin-top:14px;max-width:65ch;font-size:1.02rem;white-space:pre-line">${window.ui.escapeHtml(event.description || '')}</p>
                    </div>
                    <div class="facts glass">
                        ${fact('Date', window.ui.formatDate(event.date))}
                        ${fact('Time', event.time || '—')}
                        ${fact('Location', event.location || '—')}
                        ${fact('Category', window.ui.categoryLabel(event.category))}
                        ${fact('Organizer', event.organizer || '—')}
                        ${fact('Prerequisites', event.prerequisites || 'None')}
                    </div>
                </div>
                <aside class="reg-card glass" data-cat="${window.ui.escapeHtml((event.category || '').toLowerCase())}" id="registration-card"></aside>
            </div>
        `;
        renderRegistrationCard();
    }

    function fact(label, value) {
        return `<div class="fact"><span class="label">${window.ui.escapeHtml(label)}</span><b>${window.ui.escapeHtml(value || '—')}</b></div>`;
    }

    function renderRegistrationCard() {
        const slot = document.getElementById('registration-card');
        if (!slot) return;
        const event = currentEvent;
        const past = window.ui.isPastDate(event.date);
        const full = Number(event.seatsLeft) === 0;

        const seatsHeader = `
            <div>
                <span class="eyebrow">Available seats</span>
                <div class="big-seats" style="margin-top:6px"><b class="mono">${Number.isFinite(Number(event.seatsLeft)) ? event.seatsLeft : '—'}</b><span class="faint">of ${Number.isFinite(Number(event.capacity)) ? event.capacity : '—'}</span></div>
            </div>
            ${window.ui.seatsSection(event)}
        `;

        if (!window.isLoggedIn()) {
            slot.innerHTML = `
                ${seatsHeader}
                <p class="faint" style="font-size:.88rem">Sign in with your university account to reserve a seat.</p>
                <a class="btn btn-primary btn-block" href="login.html?redirect=${encodeURIComponent('event-details.html?id=' + event.id)}">Sign in to register</a>
            `;
            return;
        }

        if (window.isAdmin()) {
            slot.innerHTML = `
                ${seatsHeader}
                <div style="display:grid;gap:4px">
                    <span class="eyebrow">Admin</span>
                    <p class="mono" style="font-size:1.8rem;font-weight:700;color:var(--ink);line-height:1">${adminRegCount}</p>
                    <p class="faint" style="font-size:.82rem">students registered</p>
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
                ${seatsHeader}
                <p class="faint" style="font-size:.88rem">This event has ended. Registrations are closed.</p>
                <button type="button" class="btn btn-glass btn-block" disabled>Event ended</button>
            `;
            return;
        }

        if (registered) {
            slot.innerHTML = `
                ${seatsHeader}
                <div class="registered"><span aria-hidden="true">✓</span><span>You're registered for this event</span></div>
                <p class="faint" style="font-size:.88rem">We'll keep your seat. If plans change, cancel so someone else can go.</p>
                <button type="button" class="btn btn-danger btn-block" data-cancel-reg>Cancel registration</button>
            `;
            slot.querySelector('[data-cancel-reg]').addEventListener('click', onCancel);
            return;
        }

        if (full) {
            slot.innerHTML = `
                ${seatsHeader}
                <button type="button" class="btn btn-glass btn-block" disabled>Event is full</button>
                <p class="faint" style="font-size:.88rem">All ${event.capacity} seats are taken. Check back in case someone cancels.</p>
            `;
            return;
        }

        const user = window.getCurrentUser() || {};
        slot.innerHTML = `
            ${seatsHeader}
            <form class="form" id="registration-form" novalidate>
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
        page.content.innerHTML = `<div class="skel-grid">${window.ui.skeletonCards(1)}</div>`;
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
