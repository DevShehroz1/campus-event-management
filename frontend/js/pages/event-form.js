(function () {
    'use strict';

    const CATEGORIES = ['workshop','seminar','competition','sports','conference','society'];
    const CAT_LABELS = {
        workshop: 'Workshop', seminar: 'Seminar', competition: 'Competition',
        sports: 'Sports', conference: 'Conference', society: 'Student Society Activity'
    };

    const els = {};
    let editingId = null;
    const schema = {
        'event-title':        [window.validation.required('Title')],
        'event-category':     [window.validation.required('Category'), window.validation.oneOf(CATEGORIES, 'Category')],
        'event-date':         [window.validation.required('Date'), window.validation.notPastDate()],
        'event-time':         [window.validation.required('Time')],
        'event-location':     [window.validation.required('Location')],
        'event-capacity':     [window.validation.required('Capacity'), window.validation.positiveInteger('Capacity')],
        'event-organizer':    [window.validation.required('Organizer')],
        'event-image':        [window.validation.required('Image URL'), window.validation.url()],
        'event-description':  [window.validation.required('Description'), window.validation.minLength(20, 'Description')]
    };

    function renderCategoryOptions() {
        els.category.innerHTML = ['<option value="">Choose a category…</option>']
            .concat(CATEGORIES.map((c) => `<option value="${c}">${CAT_LABELS[c]}</option>`))
            .join('');
    }

    function setMinDate() {
        els.date.min = window.ui.todayISO();
    }

    function updateCharCount() {
        if (!els.descCount) return;
        els.descCount.textContent = `${els.description.value.length} characters`;
    }

    function updateImagePreview() {
        const url = els.image.value.trim();
        if (!url) {
            els.imagePreview.innerHTML = `<div class="w-full h-full flex items-center justify-center text-xs text-stone-400">Preview appears here</div>`;
            return;
        }
        els.imagePreview.innerHTML = `<img src="${window.ui.escapeHtml(url)}" alt="Image preview" class="w-full h-full object-cover" onerror="this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center text-xs text-rose-600\\'>Could not load image</div>'">`;
    }

    function fillFromEvent(event) {
        els.title.value = event.title || '';
        els.category.value = CATEGORIES.includes((event.category || '').toLowerCase()) ? event.category.toLowerCase() : '';
        els.date.value = event.date ? event.date.slice(0, 10) : '';
        els.time.value = event.time || '';
        els.location.value = event.location || '';
        els.capacity.value = Number.isFinite(Number(event.capacity)) ? event.capacity : '';
        els.organizer.value = event.organizer || '';
        els.prerequisites.value = event.prerequisites || 'None';
        els.image.value = event.image || '';
        els.description.value = event.description || '';
        updateCharCount();
        updateImagePreview();
    }

    function switchToEditMode(event) {
        els.heading.textContent = 'Edit event';
        els.subheading.textContent = 'Update the details below and save.';
        els.submitBtn.textContent = 'Save changes';
        els.eyebrow.textContent = 'Admin · edit';
        document.title = `Edit ${event.title} — CampusHub`;
    }

    async function onSubmit(e) {
        e.preventDefault();
        window.validation.showServerError(els.form, '');
        if (!window.validation.validateForm(els.form, schema)) return;

        const payload = {
            title:         els.title.value.trim(),
            description:   els.description.value.trim(),
            date:          els.date.value,
            time:          els.time.value.trim(),
            location:      els.location.value.trim(),
            category:      els.category.value,
            capacity:      Number(els.capacity.value),
            organizer:     els.organizer.value.trim(),
            prerequisites: (els.prerequisites.value || '').trim() || 'None',
            image:         els.image.value.trim()
        };

        window.ui.setButtonLoading(els.submitBtn, true, editingId ? 'Saving…' : 'Publishing…');
        try {
            const result = editingId
                ? await window.api.updateEvent(editingId, payload)
                : await window.api.createEvent(payload);
            window.ui.setFlash(editingId ? 'Changes saved' : 'Event created', 'success');
            location.href = `event-details.html?id=${encodeURIComponent(result.id || editingId)}`;
        } catch (err) {
            window.validation.showServerError(els.form, err.message || 'Could not save the event.');
            window.ui.setButtonLoading(els.submitBtn, false);
        }
    }

    async function loadForEdit(id) {
        try {
            const event = await window.api.getEvent(id);
            editingId = event.id;
            switchToEditMode(event);
            fillFromEvent(event);
        } catch (err) {
            window.ui.setFlash(err.status === 404 ? 'Event not found' : (err.message || 'Could not load event'), 'error');
            location.replace('dashboard.html');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!window.ui.requireAdmin()) return;

        els.form        = document.getElementById('event-form');
        els.heading     = document.getElementById('event-form-heading');
        els.subheading  = document.getElementById('event-form-subheading');
        els.eyebrow     = document.getElementById('event-form-eyebrow');
        els.submitBtn   = document.getElementById('event-submit');

        els.title        = document.getElementById('event-title');
        els.category     = document.getElementById('event-category');
        els.date         = document.getElementById('event-date');
        els.time         = document.getElementById('event-time');
        els.location     = document.getElementById('event-location');
        els.capacity     = document.getElementById('event-capacity');
        els.organizer    = document.getElementById('event-organizer');
        els.prerequisites= document.getElementById('event-prerequisites');
        els.image        = document.getElementById('event-image');
        els.description  = document.getElementById('event-description');
        els.descCount    = document.getElementById('event-description-count');
        els.imagePreview = document.getElementById('event-image-preview');

        renderCategoryOptions();
        setMinDate();
        updateCharCount();
        updateImagePreview();

        window.validation.attachLiveValidation(els.form, schema);
        els.form.addEventListener('submit', onSubmit);
        els.description.addEventListener('input', updateCharCount);
        els.image.addEventListener('input', window.ui.debounce(updateImagePreview, 250));

        const cancelBtn = document.getElementById('event-cancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.history.length > 1) window.history.back();
                else location.href = 'dashboard.html';
            });
        }

        const id = window.ui.getParam('id');
        if (id) loadForEdit(id);
    });
})();
