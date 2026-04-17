import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userId = req.query.user_id || req.headers['x-user-id'];
    if (!userId) {
      return res.status(400).json({ error: 'user_id é obrigatório (header x-user-id ou query ?user_id=...)' });
    }

    const [userRes, sizesRes, itemsRes, prefsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).maybeSingle(),
      supabase.from('sizes').select('*').order('display_order'),
      supabase.from('items').select('*').eq('user_id', userId).order('sort_order', { ascending: true }),
      supabase.from('preferences').select('*').eq('user_id', userId).maybeSingle(),
    ]);

    if (userRes.error) throw userRes.error;
    if (!userRes.data) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (sizesRes.error) throw sizesRes.error;
    if (itemsRes.error) throw itemsRes.error;

    return res.status(200).json({
      user: userRes.data,
      sizes: sizesRes.data || [],
      items: itemsRes.data || [],
      preferences: prefsRes.data || { filter: 'all', collapsed: {} },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({ error: error.message });
  }
}
