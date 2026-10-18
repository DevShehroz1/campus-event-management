(function () {
    'use strict';

    const CATEGORIES = ['workshop','seminar','competition','sports','conference','society'];

    const els = {};
    let requestSeq = 0;

    function syncUrl(search, category) {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        const qs = params.toString();
        const target = qs ? `?${qs}` : location.pathname.split('/').pop();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname.split('/').pop());
    }

    function updateClearButton() {
        if (!els.clearBtn) return;
        const hasFilter = (els.search.value && els.search.value.trim()) || (els.category.value && els.category.value !== '');
        els.clearBtn.classList.toggle('hidden', !hasFilter);
    }

    function renderCount(total, search) {
        if (!els.count) return;
        const noun = total === 1 ? 'event' : 'events';
        const suffix = search ? ` for "${window.ui.escapeHtml(search)}"` : '';
        els.count.innerHTML = `Showing <span class="text-white font-semibold">${total}</span> ${noun}${suffix}`;
    }

    function renderResults(events) {
        if (!els.grid) return;
        const sorted = events.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        const admin = window.isAdmin();
        els.grid.innerHTML = sorted.map((e) => window.ui.eventCardHTML(e, { showAdminActions: admin })).join('');
        wireAdminDelete();
    }

    function wireAdminDelete() {
        els.grid.querySelectorAll('[data-delete-event]').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const id = decodeURIComponent(btn.getAttribute('data-delete-event'));
                const card = btn.closest('article');
                const title = card ? (card.querySelector('h3 a')?.textContent || 'this event') : 'this event';
                await window.ui.confirmAndDeleteEvent({ id, title }, () => {
                    load();
                });
            });
        });
    }

    function showEmpty() {
        if (!els.grid) return;
        els.grid.innerHTML = window.ui.emptyStateHTML({
            icon: '🔍',
            title: 'No events match your search',
            text: 'Try different keywords, pick another category, or clear your filters.',
            actionHTML: `<button type="button" data-clear class="inline-flex items-center justify-center bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-xl shadow-lg shadow-orange-600/30 px-5 py-2.5 text-sm min-h-[44px]">Clear filters</button>`
        });
        const clear = els.grid.querySelector('[data-clear]');
        if (clear) clear.addEventListener('click', clearFilters);
    }

    function showError(message) {
        if (!els.grid) return;
        els.grid.innerHTML = window.ui.errorStateHTML(message);
        const retry = els.grid.querySelector('[data-retry]');
        if (retry) retry.addEventListener('click', load);
    }

    function clearFilters() {
        els.search.value = '';
        els.category.value = '';
        updateClearButton();
        syncUrl('', '');
        load();
    }

    async function load() {
        if (!els.grid) return;
        const search = els.search.value.trim();
        const category = els.category.value;
        syncUrl(search, category);
        updateClearButton();
        els.grid.innerHTML = window.ui.skeletonCards(6);
        if (els.count) els.count.textContent = '';
        const seq = ++requestSeq;
        try {
            const events = await window.api.getEvents(search, category);
            if (seq !== requestSeq) return;
            renderCount(events.length, search);
            if (events.length === 0) {
                showEmpty();
                return;
            }
            renderResults(events);
        } catch (err) {
            if (seq !== requestSeq) return;
            showError(err.message);
        }
    }

    function initCategoryOptions() {
        if (!els.category) return;
        const options = ['<option value="">All Categories</option>']
            .concat(CATEGORIES.map((c) => `<option value="${c}">${c.charAt(0).toUpperCase() + c.slice(1)}</option>`));
        els.category.innerHTML = options.join('');
    }

    function initFromUrl() {
        const search = window.ui.getParam('search') || '';
        const category = window.ui.getParam('category') || '';
        els.search.value = search;
        if (CATEGORIES.includes(category)) els.category.value = category;
    }

    document.addEventListener('DOMContentLoaded', () => {
        els.search   = document.getElementById('events-search');
        els.category = document.getElementById('events-category');
        els.clearBtn = document.getElementById('events-clear');
        els.grid     = document.getElementById('events-grid');
        els.count    = document.getElementById('events-count');

        initCategoryOptions();
        initFromUrl();
        updateClearButton();

        const debouncedLoad = window.ui.debounce(load, 300);
        els.search.addEventListener('input', debouncedLoad);
        els.category.addEventListener('change', load);
        if (els.clearBtn) els.clearBtn.addEventListener('click', clearFilters);

        load();
    });
})();
