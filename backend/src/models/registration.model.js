const supabase = require('../config/supabase');

const COLUMNS = 'id, user_id, event_id, registration_date, user:users(id, name, email)';

// "Event is full" and duplicate registrations are enforced by the database
// (capacity trigger and unique constraint), so concurrent requests stay correct.
async function create(userId, eventId) {
    const { data, error } = await supabase
        .from('registrations')
        .insert({ user_id: userId, event_id: eventId })
        .select(COLUMNS)
        .single();
    if (error) throw error;
    return data;
}

// userId = null returns every registration (admin view).
async function list(userId = null) {
    let query = supabase.from('registrations').select(COLUMNS);
    if (userId !== null) query = query.eq('user_id', userId);
    const { data, error } = await query.order('registration_date', { ascending: false }).order('id', { ascending: false });
    if (error) throw error;
    return data;
}

async function remove(userId, eventId) {
    const { data, error } = await supabase
        .from('registrations')
        .delete()
        .eq('user_id', userId)
        .eq('event_id', eventId)
        .select('id');
    if (error) throw error;
    return data.length > 0;
}

module.exports = { create, list, remove };
