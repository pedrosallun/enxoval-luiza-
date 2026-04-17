import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getUserId(req) {
  return req.headers['x-user-id'] || req.query.user_id || (req.body && req.body.user_id);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'user_id é obrigatório' });

  try {
    if (req.method === 'PATCH') {
      const updates = {};
      if (req.body.filter !== undefined) updates.filter = req.body.filter;
      if (req.body.collapsed !== undefined) updates.collapsed = req.body.collapsed;

      // upsert — caso a linha ainda não exista
      const { data, error } = await supabase
        .from('preferences')
        .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in preferences API:', error);
    return res.status(500).json({ error: error.message });
  }
}
