const supabase = require('../config/supabase');

const PUBLIC_COLUMNS = 'id, name, email, student_id, role, created_at';

async function findByEmail(email) {
    const { data, error } = await supabase
        .from('users')
        .select(`${PUBLIC_COLUMNS}, password_hash`)
        .eq('email', email)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function findById(id) {
    const { data, error } = await supabase
        .from('users')
        .select(PUBLIC_COLUMNS)
        .eq('id', id)
        .maybeSingle();
    if (error) throw error;
    return data;
}

async function create({ name, studentId, email, passwordHash }) {
    const { data, error } = await supabase
        .from('users')
        .insert({ name, student_id: studentId, email, password_hash: passwordHash, role: 'student' })
        .select(PUBLIC_COLUMNS)
        .single();
    if (error) throw error;
    return data;
}

module.exports = { findByEmail, findById, create };
