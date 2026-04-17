import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [sizesRes, itemsRes, prefsRes] = await Promise.all([
      supabase.from('sizes').select('*').order('display_order'),
      supabase.from('items').select('*').order('id'),
      supabase.from('preferences').select('*').eq('id', 1).single()
    ]);

    if (sizesRes.error) throw sizesRes.error;
    if (itemsRes.error) throw itemsRes.error;

    return res.status(200).json({
      sizes: sizesRes.data || [],
      items: itemsRes.data || [],
      preferences: prefsRes.data || { filter: 'all', collapsed: {} }
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return res.status(500).json({ error: error.message });
  }
}
