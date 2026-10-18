(function () {
    'use strict';

    const CATS = window.ui.CATEGORY_KEYS;
    const LABELS = window.ui.CATEGORY_LABELS;
    const els = {};
    let seq = 0;

    function syncUrl(search, category) {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        const qs = params.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname.split('/').pop());
    }

    function renderOptions() {
        els.category.innerHTML = '<option value="">All categories</option>'
            + CATS.map((k) => `<option value="${k}">${LABELS[k]}</option>`).join('');
    }

    function renderChips() {
        els.chips.innerHTML = CATS.map((k) => `
            <button type="button" class="chip" data-filter="${k}" aria-pressed="false"><i></i>${LABELS[k]}</button>
        `).join('');
    }

    function updateChips() {
        const current = els.category.value;
        els.chips.querySelectorAll('[data-filter]').forEach((c) => {
            c.setAttribute('aria-pressed', String(c.getAttribute('data-filter') === current));
        });
    }

    function updateClear() {
        const has = (els.search.value && els.search.value.trim()) || els.category.value;
        els.clearBtn.hidden = !has;
    }

    function renderCount(total, search, category) {
        const noun = total === 1 ? 'event' : 'events';
        const parts = [`Showing ${total} ${noun}`];
        if (search) parts.push(`for "${window.ui.escapeHtml(search)}"`);
        if (category) parts.push(`in ${LABELS[category]}`);
        els.count.textContent = parts.join(' ');
    }

    function renderResults(events) {
        const admin = window.isAdmin();
        const sorted = events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        els.grid.innerHTML = sorted.map((e) => window.ui.eventCardHTML(e, { showAdminActions: admin })).join('');
        els.grid.querySelectorAll('[data-delete-event]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = decodeURIComponent(btn.getAttribute('data-delete-event'));
                const title = btn.closest('article')?.querySelector('h3 a')?.textContent || 'this event';
                await window.ui.confirmAndDeleteEvent({ id, title }, load);
            });
        });
    }

    function showEmpty() {
        els.grid.innerHTML = window.ui.emptyStateHTML({
            icon: '⌕',
            title: 'No events match your search',
            text: 'Try a different word or clear the category filter.',
            actionHTML: `<button type="button" class="btn btn-glass" data-clear>Clear filters</button>`
        });
        const clr = els.grid.querySelector('[data-clear]');
        if (clr) clr.addEventListener('click', clearFilters);
    }

    function showError(msg) {
        els.grid.innerHTML = window.ui.errorStateHTML(msg);
        const retry = els.grid.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', load);
    }

    function clearFilters() {
        els.search.value = '';
        els.category.value = '';
        syncUrl('', '');
        updateClear();
        updateChips();
        load();
    }

    async function load() {
        const search = els.search.value.trim();
        const category = els.category.value;
        syncUrl(search, category);
        updateClear();
        updateChips();
        els.grid.innerHTML = window.ui.skeletonCards(6);
        els.count.textContent = '';
        const mySeq = ++seq;
        try {
            const events = await window.api.getEvents(search, category);
            if (mySeq !== seq) return;
            renderCount(events.length, search, category);
            if (!events.length) { showEmpty(); return; }
            renderResults(events);
        } catch (err) {
            if (mySeq !== seq) return;
            showError(err.message);
        }
    }

    function initFromUrl() {
        els.search.value = window.ui.getParam('search') || '';
        const cat = window.ui.getParam('category') || '';
        if (CATS.includes(cat)) els.category.value = cat;
    }

    document.addEventListener('DOMContentLoaded', () => {
        els.search   = document.getElementById('events-search');
        els.category = document.getElementById('events-category');
        els.chips    = document.getElementById('events-chips');
        els.count    = document.getElementById('events-count');
        els.grid     = document.getElementById('events-grid');
        els.clearBtn = document.getElementById('events-clear');

        renderOptions();
        renderChips();
        initFromUrl();

        const debouncedLoad = window.ui.debounce(load, 250);
        els.search.addEventListener('input', debouncedLoad);
        els.category.addEventListener('change', load);
        els.clearBtn.addEventListener('click', clearFilters);
        els.chips.addEventListener('click', (e) => {
            const chip = e.target.closest('[data-filter]');
            if (!chip) return;
            const next = chip.getAttribute('data-filter');
            els.category.value = els.category.value === next ? '' : next;
            load();
        });

        load();
    });
})();
