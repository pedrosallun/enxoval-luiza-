import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'PATCH') {
      const updates = {};
      if (req.body.filter !== undefined) updates.filter = req.body.filter;
      if (req.body.collapsed !== undefined) updates.collapsed = req.body.collapsed;

      const { data, error } = await supabase
        .from('preferences')
        .update(updates)
        .eq('id', 1)
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
