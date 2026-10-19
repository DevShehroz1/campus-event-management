const supabase = require('../config/supabase');

// Reads go through the view so every event carries a live seats_left count.
const VIEW = 'events_with_seats';

async function list({ search, category } = {}) {
    let query = supabase.from(VIEW).select('*');
    if (category) query = query.eq('category', category);
    if (search) {
        const pattern = `%${search}%`;
        query = query.or(
            ['title', 'description', 'location', 'organizer'].map((col) => `${col}.ilike.${pattern}`).join(',')
        );
    }
    const { data, error } = await query
        .order('event_date', { ascending: true })
        .order('event_time', { ascending: true });
    if (error) throw error;
    return data;
}

async function findById(id) {
    const { data, error } = await supabase.from(VIEW).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
}

async function findByIds(ids) {
    if (!ids.length) return [];
    const { data, error } = await supabase.from(VIEW).select('*').in('id', ids);
    if (error) throw error;
    return data;
}

async function create(row) {
    const { data, error } = await supabase.from('events').insert(row).select('id').single();
    if (error) throw error;
    return findById(data.id);
}

async function update(id, row) {
    const { data, error } = await supabase.from('events').update(row).eq('id', id).select('id');
    if (error) throw error;
    if (!data.length) return null;
    return findById(id);
}

// Registrations for the event are removed by the database (on delete cascade).
async function remove(id) {
    const { data, error } = await supabase.from('events').delete().eq('id', id).select('id');
    if (error) throw error;
    return data.length > 0;
}

module.exports = { list, findById, findByIds, create, update, remove };
