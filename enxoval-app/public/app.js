(function() {
'use strict';

// ============================================================
// ESTADO GLOBAL
// ============================================================
let state = {
  sizes: [],
  items: [],
  preferences: { filter: 'all', collapsed: {} }
};

// ============================================================
// ÍCONES SVG
// ============================================================
const ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
};

// ============================================================
// API CLIENT
// ============================================================
const API = {
  async fetchAll() {
    const res = await fetch('/api/data');
    if (!res.ok) throw new Error('Falha ao carregar dados');
    return res.json();
  },

  async updateItem(id, updates) {
    const res = await fetch(`/api/items?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Falha ao atualizar item');
    return res.json();
  },

  async createItem(data) {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Falha ao criar item');
    return res.json();
  },

  async deleteItem(id) {
    const res = await fetch(`/api/items?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Falha ao remover item');
    return res.json();
  },

  async updatePreferences(updates) {
    const res = await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Falha ao atualizar preferências');
    return res.json();
  },

  async reset() {
    const res = await fetch('/api/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Falha ao resetar');
    return res.json();
  }
};

// ============================================================
// UI HELPERS
// ============================================================
function setSyncStatus(status) {
  const dot = document.getElementById('save-dot');
  const text = document.getElementById('save-text');
  dot.classList.remove('syncing', 'error');
  if (status === 'syncing') {
    dot.classList.add('syncing');
    text.textContent = 'Sincronizando...';
  } else if (status === 'error') {
    dot.classList.add('error');
    text.textContent = 'Erro de conexão';
  } else {
    text.textContent = 'Sincronizado';
  }
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function showModal(title, message, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  const modal = document.getElementById('modal');
  modal.classList.add('show');
  const close = () => modal.classList.remove('show');
  document.getElementById('modal-confirm').onclick = () => { close(); onConfirm(); };
  document.getElementById('modal-cancel').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function getStatus(item) {
  if (item.target > 0 && item.bought >= item.target) return 'complete';
  if (item.checked && item.target === 0) return 'complete';
  if (item.bought > 0) return 'partial';
  return 'pending';
}

// ============================================================
// OPTIMISTIC UPDATES
// Atualiza a UI imediatamente, depois sincroniza com o backend.
// Se falhar, reverte e mostra erro.
// ============================================================
async function optimisticUpdate(localChange, apiCall) {
  // 1. Aplica a mudança local imediatamente
  localChange();
  renderAll();
  setSyncStatus('syncing');

  // 2. Sincroniza com backend
  try {
    await apiCall();
    setSyncStatus('ok');
  } catch (err) {
    console.error('Sync error:', err);
    setSyncStatus('error');
    showToast('Erro ao salvar. Recarregando...', true);
    // 3. Se falhar, recarrega estado do servidor
    setTimeout(() => loadData(), 1500);
  }
}

// ============================================================
// RENDERIZAÇÃO
// ============================================================
function calcStats() {
  let totalTarget = 0, totalBought = 0, completeItems = 0;
  const totalItems = state.items.length;
  state.items.forEach(item => {
    totalTarget += item.target;
    totalBought += Math.min(item.bought, item.target);
    if (getStatus(item) === 'complete') completeItems++;
  });
  return { totalTarget, totalBought, completeItems, totalItems };
}

function renderStats() {
  const s = calcStats();
  const pct = s.totalTarget > 0 ? Math.round((s.totalBought / s.totalTarget) * 100) : 0;
  document.getElementById('stats').innerHTML = `
    <div class="stat">
      <div class="stat-label">Progresso</div>
      <div class="stat-value">${pct}%</div>
      <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>
    <div class="stat">
      <div class="stat-label">Peças</div>
      <div class="stat-value">${s.totalBought}<span style="font-size:13px;color:var(--text-secondary);font-weight:400;"> / ${s.totalTarget}</span></div>
      <div class="stat-sub">${s.totalTarget - s.totalBought} faltando</div>
    </div>
    <div class="stat">
      <div class="stat-label">Itens</div>
      <div class="stat-value">${s.completeItems}<span style="font-size:13px;color:var(--text-secondary);font-weight:400;"> / ${s.totalItems}</span></div>
      <div class="stat-sub">completos</div>
    </div>
  `;
}

function renderSizes() {
  const container = document.getElementById('sizes');
  container.innerHTML = '';
  const filter = state.preferences.filter || 'all';
  const collapsed = state.preferences.collapsed || {};

  state.sizes.forEach(size => {
    const sizeItems = state.items.filter(i => i.size_id === size.id);
    let filtered = sizeItems;
    if (filter === 'pending') filtered = sizeItems.filter(i => getStatus(i) === 'pending');
    else if (filter === 'partial') filtered = sizeItems.filter(i => getStatus(i) === 'partial');
    else if (filter === 'complete') filtered = sizeItems.filter(i => getStatus(i) === 'complete');

    const totalT = sizeItems.reduce((a, i) => a + i.target, 0);
    const totalB = sizeItems.reduce((a, i) => a + Math.min(i.bought, i.target), 0);
    const pct = totalT > 0 ? Math.round((totalB / totalT) * 100) : 0;
    const isCollapsed = collapsed[size.id];

    const card = document.createElement('div');
    card.className = 'size-card';

    let html = `
      <div class="size-header ${isCollapsed ? 'collapsed' : ''}" data-size="${size.id}">
        <div class="size-header-left">
          <div class="chevron ${isCollapsed ? 'collapsed' : ''}">${ICONS.chevron}</div>
          <div class="size-info">
            <div class="size-name">${escapeHtml(size.name)} · ${escapeHtml(size.tam)}</div>
            <span class="size-tag">${escapeHtml(size.season)}</span>
          </div>
        </div>
        <div class="size-progress">
          <div class="size-pct">${pct}%</div>
          <div class="size-count">${totalB}/${totalT} peças</div>
          <div class="size-mini-bar"><div class="size-mini-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
    `;

    if (!isCollapsed) {
      html += '<div class="items">';
      if (filtered.length === 0) {
        html += '<div class="empty">Nenhum item neste filtro</div>';
      } else {
        filtered.forEach(item => {
          const status = getStatus(item);
          const isComplete = status === 'complete';
          const isOver = item.bought > item.target && item.target > 0;
          html += `
            <div class="item ${isComplete ? 'complete' : ''} ${isOver ? 'over' : ''}" data-item="${item.id}">
              <button class="check ${isComplete ? 'checked' : ''}" data-action="check" data-id="${item.id}" aria-label="Marcar">${ICONS.check}</button>
              <div class="item-body">
                <div class="item-name ${isComplete ? 'complete' : ''}">${escapeHtml(item.name)}${item.is_custom ? '<span class="item-custom-tag">CUSTOM</span>' : ''}</div>
                ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
              </div>
              <div class="qty-group">
                <button class="qty-btn" data-action="dec" data-id="${item.id}" aria-label="Diminuir">−</button>
                <input type="number" class="qty-input" value="${item.bought}" min="0" data-action="qty" data-id="${item.id}" inputmode="numeric">
                <button class="qty-btn" data-action="inc" data-id="${item.id}" aria-label="Aumentar">+</button>
              </div>
              <div class="qty-target">/ ${item.target}</div>
              <div class="item-actions">
                <button class="icon-btn delete" data-action="delete" data-id="${item.id}" aria-label="Remover">${ICONS.trash}</button>
              </div>
            </div>
          `;
        });
      }
      html += `
        <div class="add-form">
          <input type="text" placeholder="Adicionar item..." class="add-name" data-size="${size.id}" maxlength="100">
          <input type="number" placeholder="Qtd" class="add-qty" data-size="${size.id}" min="1" value="1" inputmode="numeric">
          <button class="add-btn" data-size="${size.id}">+ Add</button>
        </div>
      `;
      html += '</div>';
    }

    card.innerHTML = html;
    container.appendChild(card);
  });

  attachEventListeners();
}

function renderAll() {
  renderStats();
  renderSizes();
}

// ============================================================
// EVENT LISTENERS
// ============================================================
function attachEventListeners() {
  // Colapsar/expandir seções
  document.querySelectorAll('.size-header').forEach(h => {
    h.onclick = (e) => {
      if (e.target.closest('button, input')) return;
      const sid = h.dataset.size;
      const collapsed = { ...(state.preferences.collapsed || {}) };
      collapsed[sid] = !collapsed[sid];
      optimisticUpdate(
        () => { state.preferences.collapsed = collapsed; },
        () => API.updatePreferences({ collapsed })
      );
    };
  });

  // Check item
  document.querySelectorAll('[data-action="check"]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === el.dataset.id);
      if (!item) return;
      const status = getStatus(item);
      let newBought, newChecked;
      if (status === 'complete') {
        newChecked = false;
        newBought = 0;
      } else {
        newChecked = true;
        newBought = (item.target > 0 && item.bought < item.target) ? item.target : item.bought;
      }
      optimisticUpdate(
        () => { item.bought = newBought; item.checked = newChecked; },
        () => API.updateItem(item.id, { bought: newBought, checked: newChecked })
      );
    };
  });

  // Incremento
  document.querySelectorAll('[data-action="inc"]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === el.dataset.id);
      if (!item) return;
      const newBought = item.bought + 1;
      optimisticUpdate(
        () => { item.bought = newBought; },
        () => API.updateItem(item.id, { bought: newBought })
      );
    };
  });

  // Decremento
  document.querySelectorAll('[data-action="dec"]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === el.dataset.id);
      if (!item || item.bought <= 0) return;
      const newBought = item.bought - 1;
      const newChecked = newBought < item.target ? false : item.checked;
      optimisticUpdate(
        () => { item.bought = newBought; item.checked = newChecked; },
        () => API.updateItem(item.id, { bought: newBought, checked: newChecked })
      );
    };
  });

  // Input manual de quantidade
  document.querySelectorAll('[data-action="qty"]').forEach(el => {
    el.onchange = (e) => {
      const item = state.items.find(i => i.id === el.dataset.id);
      if (!item) return;
      const newBought = Math.max(0, parseInt(el.value) || 0);
      const newChecked = newBought < item.target ? false : item.checked;
      optimisticUpdate(
        () => { item.bought = newBought; item.checked = newChecked; },
        () => API.updateItem(item.id, { bought: newBought, checked: newChecked })
      );
    };
    el.onclick = (e) => e.stopPropagation();
  });

  // Delete
  document.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.onclick = (e) => {
      e.stopPropagation();
      const item = state.items.find(i => i.id === el.dataset.id);
      if (!item) return;
      showModal(
        'Remover item?',
        `Tem certeza que quer remover "${item.name}"?`,
        () => {
          optimisticUpdate(
            () => { state.items = state.items.filter(i => i.id !== el.dataset.id); },
            () => API.deleteItem(el.dataset.id)
          );
          showToast('Item removido');
        }
      );
    };
  });

  // Adicionar item custom
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.onclick = async (e) => {
      e.stopPropagation();
      const sid = btn.dataset.size;
      const nameInp = document.querySelector(`.add-name[data-size="${sid}"]`);
      const qtyInp = document.querySelector(`.add-qty[data-size="${sid}"]`);
      const name = nameInp.value.trim();
      const qty = parseInt(qtyInp.value) || 1;
      if (!name) { nameInp.focus(); return; }

      setSyncStatus('syncing');
      try {
        const newItem = await API.createItem({ name, size_id: sid, target: Math.max(1, qty) });
        state.items.push(newItem);
        renderAll();
        setSyncStatus('ok');
        showToast(`"${name}" adicionado!`);
      } catch (err) {
        setSyncStatus('error');
        showToast('Erro ao adicionar item', true);
      }
    };
  });

  document.querySelectorAll('.add-name, .add-qty').forEach(inp => {
    inp.onkeypress = (e) => {
      if (e.key === 'Enter') {
        const sid = inp.dataset.size;
        document.querySelector(`.add-btn[data-size="${sid}"]`).click();
      }
    };
    inp.onclick = (e) => e.stopPropagation();
  });
}

// Filtros
document.querySelectorAll('.filter').forEach(f => {
  f.onclick = () => {
    document.querySelectorAll('.filter').forEach(x => x.classList.remove('active'));
    f.classList.add('active');
    const newFilter = f.dataset.filter;
    optimisticUpdate(
      () => { state.preferences.filter = newFilter; },
      () => API.updatePreferences({ filter: newFilter })
    );
  };
});

// Export CSV
document.getElementById('export-btn').onclick = () => {
  let csv = '\uFEFF';
  csv += 'Tamanho,Item,Comprado,Meta,Status,Observação\n';
  state.sizes.forEach(size => {
    state.items.filter(i => i.size_id === size.id).forEach(item => {
      const st = getStatus(item);
      const stLabel = st === 'complete' ? 'Completo' : st === 'partial' ? 'Em andamento' : 'Faltando';
      const safe = (s) => `"${(s || '').toString().replace(/"/g, '""')}"`;
      csv += `${safe(size.name + ' - ' + size.tam)},${safe(item.name)},${item.bought},${item.target},${safe(stLabel)},${safe(item.note || '')}\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'enxoval-luiza.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
  showToast('CSV exportado! 📥');
};

// Reset
document.getElementById('reset-btn').onclick = () => {
  showModal(
    'Resetar tudo?',
    'Isto vai apagar TODO o progresso e itens personalizados do banco de dados. Esta ação não pode ser desfeita.',
    async () => {
      setSyncStatus('syncing');
      try {
        await API.reset();
        await loadData();
        showToast('Lista resetada');
        setSyncStatus('ok');
      } catch (err) {
        setSyncStatus('error');
        showToast('Erro ao resetar', true);
      }
    }
  );
};

// ============================================================
// INICIALIZAÇÃO
// ============================================================
async function loadData() {
  try {
    const data = await API.fetchAll();
    state.sizes = data.sizes;
    state.items = data.items;
    state.preferences = data.preferences || { filter: 'all', collapsed: {} };

    // Aplicar filtro ativo nos botões
    document.querySelectorAll('.filter').forEach(f => {
      f.classList.toggle('active', f.dataset.filter === state.preferences.filter);
    });

    renderAll();
    document.getElementById('loading-screen').classList.add('hidden');
    setSyncStatus('ok');
  } catch (err) {
    console.error('Load error:', err);
    setSyncStatus('error');
    document.getElementById('loading-screen').innerHTML = `
      <div class="loading-content">
        <p style="color: var(--red-strong); font-size: 15px; margin-bottom: 12px;">⚠️ Erro ao conectar</p>
        <p style="font-size: 13px; color: var(--text-secondary);">Verifique se o Supabase está configurado.</p>
        <button class="btn" onclick="location.reload()" style="margin-top: 16px;">Tentar novamente</button>
      </div>
    `;
  }
}

// Inicializar
loadData();

// Recarregar quando a janela volta do background
// Importante pra quando você tem o app aberto em dois dispositivos (você e Luigi)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    loadData();
  }
});

})();
