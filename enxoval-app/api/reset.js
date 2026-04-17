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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'user_id é obrigatório' });

  try {
    // Remove itens custom deste usuário
    await supabase.from('items').delete().eq('is_custom', true).eq('user_id', userId);
    // Zera bought/checked dos itens padrão deste usuário
    await supabase.from('items').update({ bought: 0, checked: false }).eq('user_id', userId);
    // Reseta as preferências (UPDATE primeiro; INSERT se não existir)
    const { data: updated } = await supabase
      .from('preferences')
      .update({ filter: 'all', collapsed: {} })
      .eq('user_id', userId)
      .select();
    if (!updated || updated.length === 0) {
      await supabase.from('preferences').insert({
        user_id: userId, filter: 'all', collapsed: {}
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in reset API:', error);
    return res.status(500).json({ error: error.message });
  }
}
