// Database rows use snake_case column names; the API returns the camelCase shape the frontend expects.

function toEvent(row) {
    if (!row) return null;
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        date: row.event_date,
        time: row.event_time,
        location: row.location,
        category: row.category,
        capacity: row.capacity,
        seatsLeft: row.seats_left ?? row.capacity,
        organizer: row.organizer || '',
        prerequisites: row.prerequisites || 'None',
        image: row.image_url || ''
    };
}

// password_hash is deliberately never copied.
function toUser(row) {
    if (!row) return null;
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        studentId: row.student_id || '',
        role: row.role
    };
}

function toRegistration(row, event) {
    return {
        id: row.id,
        registrationDate: row.registration_date,
        user: row.user ? { id: row.user.id, name: row.user.name, email: row.user.email } : null,
        event: toEvent(event)
    };
}

// API body (camelCase) -> events table columns.
function toEventRow(body) {
    return {
        title: body.title,
        description: body.description,
        event_date: body.date,
        event_time: body.time,
        location: body.location,
        category: body.category,
        capacity: body.capacity,
        organizer: body.organizer,
        prerequisites: body.prerequisites || 'None',
        image_url: body.image || null
    };
}

module.exports = { toEvent, toUser, toRegistration, toEventRow };
