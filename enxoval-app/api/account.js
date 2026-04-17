import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Gera um id curto/amigável (ex.: 'u_k3p2xy9') — não é criptográfico.
function genUserId() {
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ------------------------------------------------------------
    // POST /api/account  → cria a conta + gera todos os itens
    //  body: { baby_name, parent_name?, gender: 'boy'|'girl'|'neutral' }
    // ------------------------------------------------------------
    if (req.method === 'POST') {
      const { baby_name, parent_name, gender } = req.body || {};
      if (!baby_name || !gender) {
        return res.status(400).json({ error: 'baby_name e gender são obrigatórios' });
      }
      if (!['boy', 'girl', 'neutral'].includes(gender)) {
        return res.status(400).json({ error: "gender deve ser 'boy', 'girl' ou 'neutral'" });
      }

      const userId = genUserId();

      // 1. Cria o usuário
      const { data: user, error: userErr } = await supabase
        .from('users')
        .insert({
          id: userId,
          baby_name: String(baby_name).trim().slice(0, 80),
          parent_name: parent_name ? String(parent_name).trim().slice(0, 80) : null,
          gender,
        })
        .select()
        .single();
      if (userErr) throw userErr;

      // 2. Cria a linha de preferências desse usuário
      await supabase.from('preferences').insert({
        user_id: userId,
        filter: 'all',
        collapsed: {},
      });

      // 3. Busca templates aplicáveis (neutros + do gênero escolhido)
      // Se 'neutral', usa só os neutros.
      const genderFilter = gender === 'neutral'
        ? ['neutral']
        : ['neutral', gender];

      const { data: templates, error: tplErr } = await supabase
        .from('item_templates')
        .select('*')
        .in('gender', genderFilter)
        .order('sort_order', { ascending: true });
      if (tplErr) throw tplErr;

      // 4. Gera os items do usuário a partir dos templates
      const now = Date.now();
      const items = (templates || []).map((t, idx) => ({
        id: `${userId}_${t.code}_${t.size_id}`,
        user_id: userId,
        name: t.name,
        size_id: t.size_id,
        target: t.target,
        bought: 0,
        checked: false,
        note: t.note,
        is_custom: false,
        category: t.category,
        sort_order: t.sort_order * 1000 + idx,
      }));

      if (items.length) {
        // Supabase aceita até 1000 rows num insert. 150 é tranquilo.
        const { error: insertErr } = await supabase.from('items').insert(items);
        if (insertErr) throw insertErr;
      }

      return res.status(200).json({
        user,
        itemsCreated: items.length,
      });
    }

    // ------------------------------------------------------------
    // GET /api/account?id=USER_ID  → recupera info da conta
    // ------------------------------------------------------------
    if (req.method === 'GET') {
      const id = req.query.id || req.headers['x-user-id'];
      if (!id) return res.status(400).json({ error: 'id é obrigatório' });

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Conta não encontrada' });
      return res.status(200).json(data);
    }

    // ------------------------------------------------------------
    // PATCH /api/account?id=USER_ID  → atualiza nome / tema
    // ------------------------------------------------------------
    if (req.method === 'PATCH') {
      const id = req.query.id || req.headers['x-user-id'];
      if (!id) return res.status(400).json({ error: 'id é obrigatório' });

      const updates = {};
      if (req.body.baby_name !== undefined) updates.baby_name = String(req.body.baby_name).slice(0, 80);
      if (req.body.parent_name !== undefined) updates.parent_name = req.body.parent_name ? String(req.body.parent_name).slice(0, 80) : null;
      if (req.body.theme !== undefined) updates.theme = req.body.theme;

      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    // ------------------------------------------------------------
    // DELETE /api/account?id=USER_ID  → deleta conta (ON DELETE CASCADE)
    // ------------------------------------------------------------
    if (req.method === 'DELETE') {
      const id = req.query.id || req.headers['x-user-id'];
      if (!id) return res.status(400).json({ error: 'id é obrigatório' });
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in account API:', error);
    return res.status(500).json({ error: error.message });
  }
}
