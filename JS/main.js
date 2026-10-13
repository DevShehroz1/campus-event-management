const mockEvents = [
    {
        id: "1",
        title: "Intro to Neural Architecture",
        category: "workshop",
        date: "Oct 25, 2026",
        time: "10:00 AM - 02:00 PM",
        location: "Science Hall 4B, Lab 2",
        seatsLeft: "18 seats left (Capacity: 50)",
        organizer: "AI & Machine Learning Society",
        prerequisites: "Basic Python knowledge",
        description: "Join our comprehensive hands-on workshop designed to introduce students to modern deep learning models. Build custom models using Python and PyTorch/TensorFlow.",
        image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop"
    },
    {
        id: "2",
        title: "Annual Autonomous Bot Clash",
        category: "competition",
        date: "Nov 02, 2026",
        time: "09:00 AM - 05:00 PM",
        location: "University Gymnasium",
        seatsLeft: "5 teams left (Capacity: 20)",
        organizer: "Robotics Club",
        prerequisites: "Arduino / Raspberry Pi basics",
        description: "Pit your custom-programmed hardware against top campus engineering teams in line-following, maze-solving, and sumo bot battles.",
        image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200&auto=format&fit=crop"
    },
    {
        id: "3",
        title: "Inter-Department Cricket League",
        category: "sports",
        date: "Nov 10, 2026",
        time: "08:00 AM - 04:00 PM",
        location: "Main Sports Complex",
        seatsLeft: "2 slots left (Capacity: 12 teams)",
        organizer: "University Sports Board",
        prerequisites: "Departmental team approval",
        description: "The premier seasonal sporting tournament. Register your departmental squad today to compete for the annual university trophy.",
        image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1200&auto=format&fit=crop"
    },
    {
        id: "4",
        title: "Cyber Security & Ethical Hacking",
        category: "seminar",
        date: "Nov 15, 2026",
        time: "02:00 PM - 05:00 PM",
        location: "Main Auditorium",
        seatsLeft: "45 seats left (Capacity: 200)",
        organizer: "Cyber Security Society",
        prerequisites: "None",
        description: "Industry experts talk about vulnerability assessment, penetration testing, network defense, and modern career paths in cyber security.",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop"
    }
];

document.addEventListener('DOMContentLoaded', () => {
    initSearchAndFilter();
    initEventDetailsPage();
    initRegistrationForm();
    initAuthForms();
    initDashboard();
});

function initSearchAndFilter() {
    const searchInput = document.getElementById('searchEvents');
    const categoryFilter = document.getElementById('categoryFilter');
    const eventCards = document.querySelectorAll('main article');

    if (!searchInput || !categoryFilter) return;

    function filterEvents() {
        const query = searchInput.value.toLowerCase().trim();
        const selectedCategory = categoryFilter.value.toLowerCase().trim();

        eventCards.forEach(card => {
            const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const description = card.querySelector('p')?.textContent.toLowerCase() || '';
            const badge = card.querySelector('span.uppercase');
            const category = badge ? badge.textContent.toLowerCase().trim() : '';

            const matchesSearch = title.includes(query) || description.includes(query);
            const matchesCategory = selectedCategory === 'all' || category === selectedCategory;

            if (matchesSearch && matchesCategory) {
                card.style.display = '';
            } else {
                card.style.display = 'none';
            }
        });
    }

    searchInput.addEventListener('input', filterEvents);
    categoryFilter.addEventListener('change', filterEvents);
}

function initEventDetailsPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const eventId = urlParams.get('id');

    if (!document.getElementById('eventDetailTitle')) return;

    const event = mockEvents.find(e => e.id === eventId) || mockEvents[0];
    window.currentActiveEvent = event;

    document.getElementById('eventDetailTitle').textContent = event.title;
    document.getElementById('eventDetailCategory').textContent = event.category.toUpperCase();
    document.getElementById('eventDetailDate').textContent = `📅 ${event.date} • ${event.time}`;
    document.getElementById('eventDetailDescription').textContent = event.description;
    document.getElementById('eventDetailLocation').textContent = event.location;
    document.getElementById('eventDetailSeats').textContent = event.seatsLeft;
    document.getElementById('eventDetailOrganizer').textContent = event.organizer;
    document.getElementById('eventDetailPrereq').textContent = event.prerequisites;
    document.getElementById('eventDetailImage').src = event.image;

    const regCardContainer = document.getElementById('registrationCardContainer');
    if (regCardContainer) {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (!isLoggedIn) {
            regCardContainer.innerHTML = `
                <div class="bg-slate-900/80 rounded-2xl border border-orange-500/30 p-6 sticky top-28 shadow-xl text-center">
                    <h3 class="text-xl font-bold text-white mb-2">Authentication Required</h3>
                    <p class="text-slate-400 text-xs mb-6">You must be signed in with your university account to register for events.</p>
                    <a href="login.html" class="inline-block w-full bg-orange-600 hover:bg-orange-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-orange-600/30 text-sm">Sign In to Register</a>
                </div>
            `;
        }
    }
}

function initRegistrationForm() {
    const regForm = document.getElementById('registrationForm');
    if (!regForm) return;

    regForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const currentUserEmail = localStorage.getItem('currentUserEmail');

        if (!isLoggedIn || !currentUserEmail) {
            alert('⚠️ Access Denied: You must be signed in to register for an event.');
            window.location.href = 'login.html';
            return;
        }

        const eventToRegister = window.currentActiveEvent || mockEvents[0];
        const regKey = `myRegistrations_${currentUserEmail}`;
        let myRegistrations = JSON.parse(localStorage.getItem(regKey)) || [];

        if (!myRegistrations.some(e => e.id === eventToRegister.id)) {
            myRegistrations.push(eventToRegister);
            localStorage.setItem(regKey, JSON.stringify(myRegistrations));
        }

        alert('🎉 Registration successful! Redirecting to your dashboard.');
        window.location.href = 'dashboard.html';
    });
}

function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('regName').value.trim();
            const studentId = document.getElementById('regStudentId').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const password = document.getElementById('regPassword').value.trim();
            const deptString = `ID: ${studentId}`;

            let accounts = JSON.parse(localStorage.getItem('campusAccounts')) || {};
            
            if (accounts[email]) {
                alert('⚠️ An account with this email already exists. Please sign in instead.');
                switchTab('login');
                return;
            }

            accounts[email] = { name, email, password, studentId, dept: deptString };
            localStorage.setItem('campusAccounts', JSON.stringify(accounts));

            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUserEmail', email);
            localStorage.setItem('userName', name);
            localStorage.setItem('userDept', deptString);

            alert('Account created successfully! Redirecting to dashboard.');
            window.location.href = 'dashboard.html';
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value.trim();

            let accounts = JSON.parse(localStorage.getItem('campusAccounts')) || {};
            
            if (!accounts[email] || accounts[email].password !== password) {
                alert('❌ Invalid email or password. Please check your credentials or register first.');
                return;
            }

            let deptStr = accounts[email].dept || `ID: ${accounts[email].studentId || '4091'}`;
            deptStr = deptStr.replace('Computer Science • ', '').replace('Computer Science', '').trim();
            if (!deptStr.startsWith('ID:')) deptStr = 'ID: ' + deptStr;

            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('currentUserEmail', email);
            localStorage.setItem('userName', accounts[email].name);
            localStorage.setItem('userDept', deptStr);

            alert('Signed in successfully!');
            window.location.href = 'dashboard.html';
        });
    }
}

function initDashboard() {
    const dashboardContainer = document.getElementById('dashboardRegistrations');
    if (!dashboardContainer) return;

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const currentUserEmail = localStorage.getItem('currentUserEmail');

    if (!isLoggedIn || !currentUserEmail) {
        alert('Please sign in to view your dashboard.');
        window.location.href = 'login.html';
        return;
    }

    const userName = localStorage.getItem('userName') || 'Student';
    const nameEl = document.getElementById('userNameDisplay');
    const deptEl = document.getElementById('userDeptDisplay');
    const initialsEl = document.getElementById('userInitials');

    if (nameEl) nameEl.textContent = `Welcome back, ${userName}`;
    
    // Sanitize userDept to ensure "Computer Science" is stripped out if loaded from older storage
    let rawDept = localStorage.getItem('userDept') || 'ID: 4091';
    rawDept = rawDept.replace('Computer Science • ', '').replace('Computer Science', '').trim();
    if (!rawDept.startsWith('ID:')) rawDept = 'ID: ' + rawDept;

    if (deptEl) deptEl.textContent = rawDept;

    if (initialsEl) {
        const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        initialsEl.textContent = initials || 'US';
    }

    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('currentUserEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userDept');
            window.location.href = 'index.html';
        });
    }

    renderRegistrations();
}

function renderRegistrations() {
    const container = document.getElementById('dashboardRegistrations');
    if (!container) return;

    const currentUserEmail = localStorage.getItem('currentUserEmail');
    const regKey = `myRegistrations_${currentUserEmail}`;
    let myRegistrations = JSON.parse(localStorage.getItem(regKey)) || [];

    if (myRegistrations.length === 0) {
        container.innerHTML = `
            <div class="col-span-2 text-center py-12 bg-slate-900/40 rounded-2xl border border-slate-800">
                <p class="text-slate-400 text-sm mb-4">You haven't registered for any events yet.</p>
                <a href="events.html" class="inline-block bg-orange-600 hover:bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all">Browse Events Directory</a>
            </div>
        `;
        return;
    }

    container.innerHTML = myRegistrations.map(event => `
        <div class="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all">
            <div>
                <div class="flex items-center justify-between mb-3">
                    <span class="text-xs font-semibold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-md border border-orange-500/20">${event.category}</span>
                    <span class="text-xs text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Registered</span>
                </div>
                <h3 class="text-lg font-bold text-white">${event.title}</h3>
                <p class="text-slate-400 text-sm mt-1">📅 ${event.date} • ${event.time} | 📍 ${event.location}</p>
            </div>
            <div class="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                <span class="text-xs text-slate-500">Organizer: ${event.organizer}</span>
                <button onclick="cancelRegistration('${event.id}')" class="text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors">Cancel Registration</button>
            </div>
        </div>
    `).join('');
}

window.cancelRegistration = function(eventId) {
    const currentUserEmail = localStorage.getItem('currentUserEmail');
    const regKey = `myRegistrations_${currentUserEmail}`;
    let myRegistrations = JSON.parse(localStorage.getItem(regKey)) || [];
    
    myRegistrations = myRegistrations.filter(e => e.id !== eventId);
    localStorage.setItem(regKey, JSON.stringify(myRegistrations));
    renderRegistrations();
};