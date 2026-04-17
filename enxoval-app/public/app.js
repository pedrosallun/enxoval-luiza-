(function() {
'use strict';

// ============================================================
// CONSTANTES
// ============================================================
const LS_USER_ID = 'enxoval_user_id';
const LS_THEME   = 'enxoval_theme_override';

// ============================================================
// ESTADO GLOBAL
// ============================================================
let state = {
  userId: null,
  user: null,
  sizes: [],
  items: [],
  preferences: { filter: 'all', collapsed: {} },
  onboard: { step: 1, baby_name: '', parent_name: '', gender: null },
};

// ============================================================
// ÍCONES
// ============================================================
const ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
};

// ============================================================
// API CLIENT
// ============================================================
function authHeaders() {
  return state.userId ? { 'x-user-id': state.userId } : {};
}

const API = {
  async createAccount(payload) {
    const res = await fetch('/api/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Falha ao criar conta');
    return res.json();
  },

  async getAccount(id) {
    const res = await fetch(`/api/account?id=${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Conta não encontrada');
    return res.json();
  },

  async fetchAll() {
    const res = await fetch('/api/data', { headers: authHeaders() });
    if (!res.ok) throw new Error('Falha ao carregar dados');
    return res.json();
  },

  async updateItem(id, updates) {
    const res = await fetch(`/api/items?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Falha ao atualizar item');
    return res.json();
  },

  async createItem(data) {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao criar item');
    return res.json();
  },

  async deleteItem(id) {
    const res = await fetch(`/api/items?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error('Falha ao remover item');
    return res.json();
  },

  async updatePreferences(updates) {
    const res = await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Falha ao atualizar preferências');
    return res.json();
  },

  async reset() {
    const res = await fetch('/api/reset', { method: 'POST', headers: authHeaders() });
    if (!res.ok) throw new Error('Falha ao resetar');
    return res.json();
  }
};

// ============================================================
// HELPERS DE UI
// ============================================================
function setSyncStatus(status) {
  const dot = document.getElementById('save-dot');
  const text = document.getElementById('save-text');
  if (!dot) return;
  dot.classList.remove('syncing', 'error');
  if (status === 'syncing') { dot.classList.add('syncing'); text.textContent = 'Sincronizando...'; }
  else if (status === 'error') { dot.classList.add('error'); text.textContent = 'Erro de conexão'; }
  else text.textContent = 'Sincronizado';
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function showModal(title, message, onConfirm, confirmLabel = 'Confirmar') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('modal-confirm').textContent = confirmLabel;
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
// TEMA
// ============================================================
function applyTheme(gender) {
  const override = localStorage.getItem(LS_THEME);
  const t = override || (gender === 'boy' ? 'theme-boy' : 'theme-girl');
  document.body.className = t;
  // ajusta meta theme-color p/ status bar mobile
  const meta = document.getElementById('meta-theme');
  const themeColors = { 'theme-girl': '#FCE3EC', 'theme-boy': '#DBE9F7' };
  if (meta) meta.setAttribute('content', themeColors[t] || '#FCE3EC');
}

function cycleTheme() {
  const cur = document.body.classList[0];
  const next = cur === 'theme-girl' ? 'theme-boy' : 'theme-girl';
  localStorage.setItem(LS_THEME, next);
  document.body.className = next;
  showToast(next === 'theme-girl' ? 'Tema rosa 💕' : 'Tema azul 💙');
}

// ============================================================
// OPTIMISTIC UPDATES
// ============================================================
async function optimisticUpdate(localChange, apiCall) {
  localChange();
  renderAll();
  setSyncStatus('syncing');
  try {
    await apiCall();
    setSyncStatus('ok');
  } catch (err) {
    console.error('Sync error:', err);
    setSyncStatus('error');
    showToast('Erro ao salvar. Recarregando...', true);
    setTimeout(() => loadData(), 1500);
  }
}

// ============================================================
// RENDER
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
      <div class="stat-value">${s.totalBought}<small> / ${s.totalTarget}</small></div>
      <div class="stat-sub">${s.totalTarget - s.totalBought} faltando</div>
    </div>
    <div class="stat">
      <div class="stat-label">Itens</div>
      <div class="stat-value">${s.completeItems}<small> / ${s.totalItems}</small></div>
      <div class="stat-sub">completos</div>
    </div>
  `;
}

function groupByCategory(items) {
  const groups = {};
  items.forEach(it => {
    const cat = it.category || 'Outros';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(it);
  });
  return groups;
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
        const groups = groupByCategory(filtered);
        const catOrder = ['Macacão','Body','Parte de cima','Parte de baixo','Vestido','Conjunto','Casaco','Calçado','Acessório','Dormir','Especial','Lazer','Personalizado','Outros'];
        const sortedCats = Object.keys(groups).sort((a,b) => {
          const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });
        sortedCats.forEach(cat => {
          html += `<div class="category-heading">${escapeHtml(cat)}</div>`;
          groups[cat].forEach(item => {
            const status = getStatus(item);
            const isComplete = status === 'complete';
            const isOver = item.bought > item.target && item.target > 0;
            html += `
              <div class="item ${isComplete ? 'complete' : ''} ${isOver ? 'over' : ''}" data-item="${item.id}">
                <button class="check ${isComplete ? 'checked' : ''}" data-action="check" data-id="${item.id}" aria-label="Marcar">${ICONS.check}</button>
                <div class="item-body">
                  <div class="item-name ${isComplete ? 'complete' : ''}">${escapeHtml(item.name)}${item.is_custom ? '<span class="item-custom-tag">MEU</span>' : ''}</div>
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
        });
      }
      html += `
        <div class="add-form">
          <input type="text" placeholder="Adicionar item personalizado..." class="add-name" data-size="${size.id}" maxlength="100">
          <input type="number" placeholder="Qtd" class="add-qty" data-size="${size.id}" min="1" value="1" inputmode="numeric">
          <button class="add-btn" data-size="${size.id}">+ Add</button>
        </div>
      `;
      html += '</div>';
    }

    card.innerHTML = html;
    container.appendChild(card);
  });

  attachItemListeners();
}

function renderHeader() {
  if (!state.user) return;
  const babyName = state.user.baby_name || 'do bebê';
  const gender = state.user.gender;
  const genderLabel = gender === 'boy' ? 'Menino' : 'Menina';
  const genderEmoji = gender === 'boy' ? '👦' : '👧';

  document.getElementById('hero-baby-name').textContent = `de ${babyName}`;
  document.getElementById('badge-gender').textContent = `${genderEmoji} ${genderLabel}`;
  document.getElementById('hero-sub').textContent = state.user.parent_name
    ? `Lista organizada por ${escapeHtml(state.user.parent_name)} · Sincronizada na nuvem`
    : 'Sua lista completa, sincronizada em qualquer dispositivo.';
  document.getElementById('menu-name').textContent = babyName;
  document.getElementById('menu-sub').textContent = `${genderLabel} · ${state.items.length} itens`;
  document.title = `Enxoval · ${babyName}`;
}

function renderAll() {
  renderHeader();
  renderStats();
  renderSizes();
}

// ============================================================
// LISTENERS DO APP
// ============================================================
function attachItemListeners() {
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

  document.querySelectorAll('[data-action="qty"]').forEach(el => {
    el.onchange = () => {
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
        },
        'Remover'
      );
    };
  });

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
        nameInp.value = '';
        qtyInp.value = 1;
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

// ============================================================
// ONBOARDING
// ============================================================
function showOnboardStep(n) {
  state.onboard.step = n;
  document.querySelectorAll('.onboard-step').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.step) === n);
  });
}

function attachOnboardListeners() {
  document.getElementById('btn-step1-next').onclick = () => {
    const baby = document.getElementById('in-baby-name').value.trim();
    const parent = document.getElementById('in-parent-name').value.trim();
    if (!baby) {
      document.getElementById('in-baby-name').focus();
      showToast('Preenche o nome do bebê 👶', true);
      return;
    }
    state.onboard.baby_name = baby;
    state.onboard.parent_name = parent;
    showOnboardStep(2);
  };

  document.getElementById('btn-step2-back').onclick = () => showOnboardStep(1);

  document.querySelectorAll('.gender-pick').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.gender-pick').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      state.onboard.gender = btn.dataset.gender;
      document.getElementById('btn-step2-next').disabled = false;
      // preview do tema
      applyTheme(state.onboard.gender);
    };
  });

  document.getElementById('btn-step2-next').onclick = async () => {
    if (!state.onboard.gender) return;
    showOnboardStep(3);
    try {
      const result = await API.createAccount({
        baby_name: state.onboard.baby_name,
        parent_name: state.onboard.parent_name || null,
        gender: state.onboard.gender,
      });
      state.userId = result.user.id;
      state.user = result.user;
      localStorage.setItem(LS_USER_ID, result.user.id);

      document.getElementById('onboard-summary').innerHTML =
        `<strong>${escapeHtml(result.user.baby_name)}</strong> · ${result.itemsCreated} itens criados em ${state.onboard.gender === 'boy' ? 'versão masculina 💙' : 'versão feminina 💕'}`;
      document.getElementById('out-user-code').value = result.user.id;
      showOnboardStep(4);
    } catch (err) {
      console.error(err);
      showToast('Erro: ' + err.message, true);
      showOnboardStep(2);
    }
  };

  document.getElementById('btn-step4-go').onclick = () => {
    document.getElementById('onboard').classList.add('hidden');
    loadData();
  };

  document.getElementById('link-existing').onclick = () => showOnboardStep(5);
  document.getElementById('btn-step5-back').onclick = () => showOnboardStep(1);
  document.getElementById('btn-step5-next').onclick = async () => {
    const code = document.getElementById('in-user-code').value.trim();
    if (!code) return;
    try {
      const user = await API.getAccount(code);
      state.userId = user.id;
      state.user = user;
      localStorage.setItem(LS_USER_ID, user.id);
      document.getElementById('onboard').classList.add('hidden');
      loadData();
    } catch (err) {
      showToast('Código inválido', true);
    }
  };

  document.getElementById('out-user-code').onclick = (e) => {
    e.target.select();
    navigator.clipboard?.writeText(e.target.value);
    showToast('Código copiado 📋');
  };
}

// ============================================================
// MENU DRAWER
// ============================================================
function attachMenuListeners() {
  const drawer = document.getElementById('menu-drawer');
  const overlay = document.getElementById('menu-overlay');
  const open = () => { drawer.classList.add('open'); overlay.classList.add('open'); };
  const close = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); };

  document.getElementById('open-menu').onclick = open;
  overlay.onclick = close;

  document.getElementById('menu-export').onclick = () => {
    let csv = '\uFEFF';
    csv += 'Tamanho,Categoria,Item,Comprado,Meta,Status,Observação\n';
    state.sizes.forEach(size => {
      state.items.filter(i => i.size_id === size.id).forEach(item => {
        const st = getStatus(item);
        const stLabel = st === 'complete' ? 'Completo' : st === 'partial' ? 'Em andamento' : 'Faltando';
        const safe = (s) => `"${(s || '').toString().replace(/"/g, '""')}"`;
        csv += `${safe(size.name + ' - ' + size.tam)},${safe(item.category)},${safe(item.name)},${item.bought},${item.target},${safe(stLabel)},${safe(item.note || '')}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enxoval-${state.user?.baby_name || 'lista'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
    close();
    showToast('CSV exportado 📥');
  };

  document.getElementById('menu-share-code').onclick = () => {
    close();
    showModal(
      'Código de acesso',
      `Use este código pra acessar seu enxoval em outro aparelho:\n\n${state.userId}`,
      () => {
        navigator.clipboard?.writeText(state.userId);
        showToast('Código copiado 📋');
      },
      'Copiar'
    );
  };

  document.getElementById('menu-switch-theme').onclick = () => { cycleTheme(); close(); };

  document.getElementById('menu-reset').onclick = () => {
    close();
    showModal(
      'Resetar progresso?',
      'Isso vai zerar todos os "comprados" e remover itens personalizados. Os itens padrão continuam.',
      async () => {
        setSyncStatus('syncing');
        try {
          await API.reset();
          await loadData();
          showToast('Lista zerada');
        } catch (err) {
          setSyncStatus('error');
          showToast('Erro ao resetar', true);
        }
      },
      'Resetar'
    );
  };

  document.getElementById('menu-logout').onclick = () => {
    close();
    showModal(
      'Sair da conta?',
      'Você vai voltar à tela inicial. Seu enxoval continua salvo — entre de novo com o código de acesso.',
      () => {
        localStorage.removeItem(LS_USER_ID);
        localStorage.removeItem(LS_THEME);
        location.reload();
      },
      'Sair'
    );
  };
}

// ============================================================
// FILTROS
// ============================================================
function attachFilterListeners() {
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
}

// ============================================================
// CARREGAR DADOS
// ============================================================
async function loadData() {
  const onboard = document.getElementById('onboard');
  const loading = document.getElementById('loading-screen');
  const main = document.getElementById('app-main');

  onboard.classList.add('hidden');
  loading.classList.remove('hidden');
  main.style.display = 'none';

  try {
    const data = await API.fetchAll();
    state.user = data.user;
    state.sizes = data.sizes;
    state.items = data.items;
    state.preferences = data.preferences || { filter: 'all', collapsed: {} };

    applyTheme(state.user.gender);

    document.querySelectorAll('.filter').forEach(f => {
      f.classList.toggle('active', f.dataset.filter === state.preferences.filter);
    });

    renderAll();
    main.style.display = 'block';
    loading.classList.add('hidden');
    setSyncStatus('ok');
  } catch (err) {
    console.error('Load error:', err);
    // Se o user_id salvo não existir mais, volta pro onboard
    if (String(err.message).toLowerCase().includes('não encontrado') ||
        String(err.message).toLowerCase().includes('not found')) {
      localStorage.removeItem(LS_USER_ID);
      state.userId = null;
      loading.classList.add('hidden');
      onboard.classList.remove('hidden');
      return;
    }
    setSyncStatus('error');
    loading.innerHTML = `
      <div class="loading-content">
        <p style="color: var(--red-strong); font-size: 15px; margin-bottom: 12px;">⚠️ Erro ao conectar</p>
        <p style="font-size: 13px; color: var(--text-secondary);">Verifique sua conexão e tente novamente.</p>
        <button class="btn" onclick="location.reload()" style="margin-top: 16px;">Tentar novamente</button>
      </div>
    `;
  }
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function init() {
  attachOnboardListeners();
  attachMenuListeners();
  attachFilterListeners();

  const savedId = localStorage.getItem(LS_USER_ID);
  if (savedId) {
    state.userId = savedId;
    loadData();
  } else {
    // aplica tema default (girl) pro onboarding — ele muda ao escolher o gênero
    applyTheme('girl');
  }
}

init();

// Recarrega ao voltar do background (sincronização entre aparelhos)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && state.userId) {
    loadData();
  }
});

})();
