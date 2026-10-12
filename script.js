const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const cards = document.querySelectorAll('.event-card');

const applyFilters = () => {
  const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
  const query = searchInput.value.trim().toLowerCase();

  cards.forEach((card) => {
    const category = card.dataset.category;
    const name = card.dataset.name.toLowerCase();
    const matchesFilter = filter === 'all' || category === filter;
    const matchesQuery = !query || name.includes(query) || category.toLowerCase().includes(query);

    card.classList.toggle('hidden', !(matchesFilter && matchesQuery));
  });
};

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((btn) => btn.classList.toggle('active', btn === button));
    applyFilters();
  });
});

searchInput.addEventListener('input', applyFilters);
