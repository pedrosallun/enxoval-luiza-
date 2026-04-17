import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getUserId(req) {
  return req.headers['x-user-id'] || req.query.user_id || (req.body && req.body.user_id);
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'user_id é obrigatório' });

  try {
    // POST: criar novo item custom
    if (req.method === 'POST') {
      const { name, size_id, target, note } = req.body || {};
      if (!name || !size_id) {
        return res.status(400).json({ error: 'name e size_id são obrigatórios' });
      }
      const id = `${userId}_custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from('items')
        .insert({
          id,
          user_id: userId,
          name: String(name).slice(0, 120),
          size_id,
          target: Math.max(1, parseInt(target) || 1),
          note: note ? String(note).slice(0, 200) : null,
          bought: 0,
          checked: false,
          is_custom: true,
          category: 'Personalizado',
          sort_order: 999999,
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    // PATCH: atualizar item (bought, checked, etc.)
    if (req.method === 'PATCH') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id é obrigatório' });

      const updates = {};
      if (req.body.bought !== undefined) updates.bought = Math.max(0, parseInt(req.body.bought) || 0);
      if (req.body.checked !== undefined) updates.checked = !!req.body.checked;
      if (req.body.target !== undefined) updates.target = Math.max(0, parseInt(req.body.target) || 0);
      if (req.body.name !== undefined) updates.name = String(req.body.name).slice(0, 120);
      if (req.body.note !== undefined) updates.note = req.body.note ? String(req.body.note).slice(0, 200) : null;

      const { data, error } = await supabase
        .from('items')
        .update(updates)
        .eq('id', id)
        .eq('user_id', userId)         // garante que o user só atualiza os dele
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    // DELETE: remover item
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id é obrigatório' });

      const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in items API:', error);
    return res.status(500).json({ error: error.message });
  }
}
