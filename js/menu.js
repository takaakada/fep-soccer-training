// ══════════════════════════════════════════════════════════
// TEAM TRAINING PAGE  (js/menu.js)
// ══════════════════════════════════════════════════════════
// Phase-based view driven by ALL_MENU_PRESETS (from data-loader.js)
// Coach can add/delete menus (persisted to localStorage as overlay)

// ─── Phase 定義（旧、メニュー追加モーダルで使用）────────────
const PHASES = [
  { id: 'warm',   num: 1, label: 'Phase 1: ウォームアップ', color: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', icon: '🔥', vfeCurve: 'low' },
  { id: 'tech',   num: 2, label: 'Phase 2: 技術',           color: '#059669', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: '⚽', vfeCurve: 'mid' },
  { id: 'tactic', num: 3, label: 'Phase 3: 戦術',           color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', icon: '🧩', vfeCurve: 'high' },
  { id: 'phys',   num: 4, label: 'Phase 4: フィジカル',     color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fecaca)', icon: '💪', vfeCurve: 'mid' },
  { id: 'cool',   num: 5, label: 'Phase 5: クールダウン',   color: '#6366f1', bg: 'linear-gradient(135deg,#eef2ff,#e0e7ff)', icon: '🧘', vfeCurve: 'low' },
];

// ─── Layer 定義（メイン表示軸）──────────────────────────────
// FEP の 4 レイヤー学習設計に準拠
const LAYERS = [
  { id: 'L1', label: 'Layer 1', subtitle: '感覚・姿勢・基礎制御',
    color: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', icon: '🌱', vfeCurve: 'low',
    subGroupBy: 'modality' },
  { id: 'L2', label: 'Layer 2', subtitle: '個別の動作・実技',
    color: '#059669', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: '⚽', vfeCurve: 'mid',
    subGroupBy: null },
  { id: 'L3', label: 'Layer 3', subtitle: '相手のコントロール',
    color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', icon: '🤝', vfeCurve: 'mid',
    subGroupBy: null },
  { id: 'L4', label: 'Layer 4', subtitle: '全体のコントロール',
    color: '#7c3aed', bg: 'linear-gradient(135deg,#f5f3ff,#ede9fe)', icon: '🎯', vfeCurve: 'high',
    subGroupBy: null },
];

const CAT_OPTIONS = [
  { v: 'warm',   l: 'ウォームアップ' },
  { v: 'tech',   l: '技術' },
  { v: 'tactic', l: '戦術' },
  { v: 'phys',   l: 'フィジカル' },
  { v: 'cool',   l: 'クールダウン' },
];

// ─── 状態 ───────────────────────────────────────────────────
let isEditMode = false;
let activeFilters = { layer: 'all', purpose: 'all', coaching: 'all' };

// localStorage keys
const CUSTOM_MENUS_KEY = 'fep_custom_team_menus';
const DELETED_MENUS_KEY = 'fep_deleted_team_menus';

// ─── HTML エスケープ ────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── カテゴリラベル ─────────────────────────────────────────
function catLabelFromValue(val) {
  const found = CAT_OPTIONS.find(c => c.v === val);
  return found ? found.l : val;
}

function catSelectHtml(selected) {
  return CAT_OPTIONS.map(c => {
    const sel = (c.l === selected || c.v === selected) ? ' selected' : '';
    return `<option value="${c.v}"${sel}>${c.l}</option>`;
  }).join('');
}

// ─── FEP属性のバッジ HTML ───────────────────────────────────
function layerBadge(layer) {
  if (!layer) return '';
  const colors = { L1: '#3b82f6', L2: '#059669', L3: '#d97706', L4: '#dc2626' };
  const c = colors[layer] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(layer)}</span>`;
}

function purposeBadge(purpose) {
  if (!purpose) return '';
  const colors = { '安定化': '#3b82f6', '探索': '#8b5cf6', '修正': '#d97706', '強化': '#dc2626', '統合': '#059669' };
  const c = colors[purpose] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(purpose)}</span>`;
}

function coachingBadge(coaching) {
  if (!coaching) return '';
  const labels = { safe: 'Safe', explore: 'Explore', challenge: 'Challenge', positive: 'Positive' };
  const colors = { safe: '#3b82f6', explore: '#8b5cf6', challenge: '#dc2626', positive: '#059669' };
  const label = labels[coaching] || coaching;
  const c = colors[coaching] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(label)}</span>`;
}

function vfeBadge(vfe) {
  if (!vfe) return '';
  const labels = { low: 'VFE: Low', mid: 'VFE: Mid', high: 'VFE: High' };
  const colors = { low: '#059669', mid: '#d97706', high: '#dc2626' };
  const label = labels[vfe] || `VFE: ${vfe}`;
  const c = colors[vfe] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(label)}</span>`;
}

function channelChips(channels) {
  if (!channels) return '';
  const list = typeof channels === 'string' ? channels.split(',').map(s => s.trim()).filter(Boolean) : channels;
  return list.map(ch => `<span class="channel-chip">${escHtml(ch)}</span>`).join('');
}

// ─── データ取得 ──────────────────────────────────────────────
function _getTeamMenus() {
  // Base data from ALL_MENU_PRESETS (or DRILL_PRESETS fallback)
  let base = [];
  if (window.ALL_MENU_PRESETS && window.ALL_MENU_PRESETS.length > 0) {
    base = window.ALL_MENU_PRESETS.filter(m => m.scope === 'team' || m.scope === 'all');
  } else if (typeof DRILL_PRESETS !== 'undefined' && Array.isArray(DRILL_PRESETS)) {
    base = DRILL_PRESETS.map(m => ({ ...m, scope: m.scope || 'team' }));
  }

  // Coach's custom additions
  try {
    const raw = localStorage.getItem(CUSTOM_MENUS_KEY);
    if (raw) {
      const custom = JSON.parse(raw);
      base = base.concat(custom);
    }
  } catch(e) {}

  // Coach's deletions
  const deleted = _getDeletedNames();
  if (deleted.length > 0) {
    base = base.filter(m => !deleted.includes(m.name));
  }

  return base;
}

function _getDeletedNames() {
  try {
    const raw = localStorage.getItem(DELETED_MENUS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function _addDeletedName(name) {
  const deleted = _getDeletedNames();
  if (!deleted.includes(name)) {
    deleted.push(name);
    localStorage.setItem(DELETED_MENUS_KEY, JSON.stringify(deleted));
  }
}

function _removeDeletedName(name) {
  let deleted = _getDeletedNames();
  deleted = deleted.filter(n => n !== name);
  localStorage.setItem(DELETED_MENUS_KEY, JSON.stringify(deleted));
}

function _getCustomMenus() {
  try {
    const raw = localStorage.getItem(CUSTOM_MENUS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function _saveCustomMenus(menus) {
  localStorage.setItem(CUSTOM_MENUS_KEY, JSON.stringify(menus));
}

// ─── フィルター適用 ─────────────────────────────────────────
function _applyFilters(menus) {
  return menus.filter(m => {
    if (activeFilters.layer !== 'all' && m.layer !== activeFilters.layer) return false;
    if (activeFilters.purpose !== 'all') {
      // 新スキーマ: m.purpose_domain (4ドメイン)
      // 旧スキーマ: m.purpose (旧 5 種値)
      const domain = m.purpose_domain || m.purpose || '';
      if (domain !== activeFilters.purpose) return false;
    }
    if (activeFilters.coaching !== 'all') {
      const tone = m.coaching_tone || m.coaching || '';
      if (tone !== activeFilters.coaching) return false;
    }
    return true;
  });
}

function setFilter(type, value, btn) {
  activeFilters[type] = value;
  const container = btn.closest('.filter-chips');
  container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPhases();
}

// ─── Layer描画（メイン）───────────────────────────────────
// LAYERS を主軸に、Layer 1 のみ modality でサブグループ化する
function renderPhases() {
  const container = document.getElementById('phase-container');
  if (!container) return;

  const allMenus = _getTeamMenus();
  const filtered = _applyFilters(allMenus);
  const labels = window.MENU_LABELS || {};

  let html = '';
  LAYERS.forEach(layer => {
    const layerMenus = filtered.filter(m => m.layer === layer.id);

    html += `
      <div class="phase-section" data-layer="${layer.id}">
        <div class="phase-header" style="background:${layer.bg};border-left:4px solid ${layer.color};">
          <div class="phase-header-top">
            <span class="phase-icon">${layer.icon}</span>
            <div class="phase-header-info">
              <div class="phase-title" style="color:${layer.color}">${layer.label}</div>
              <div class="phase-subtitle" style="color:${layer.color};opacity:0.85;font-size:0.82rem;">${layer.subtitle}</div>
            </div>
            <span class="phase-count">${layerMenus.length}</span>
          </div>
          <div class="phase-vfe-indicator">
            <div class="vfe-curve-bar">
              <div class="vfe-curve-fill" style="width:${layer.vfeCurve === 'low' ? '25' : layer.vfeCurve === 'mid' ? '55' : '85'}%;background:${layer.color}"></div>
            </div>
            <span class="vfe-curve-label">VFE ${layer.vfeCurve}</span>
          </div>
        </div>
        <div class="phase-cards">
    `;

    if (layerMenus.length === 0) {
      html += `<div class="phase-empty">このレイヤーのメニューはありません</div>`;
    } else if (layer.subGroupBy === 'modality') {
      // modality 別にサブグループ化（Layer 1）
      const groups = {};
      layerMenus.forEach(m => {
        const key = m.modality || '_other';
        (groups[key] = groups[key] || []).push(m);
      });
      // 表示順: prop / vision / vest / それ以外
      const order = ['prop', 'vision', 'vest', 'respi', 'haptic', '_other'];
      order.filter(k => groups[k]).forEach(modKey => {
        const modLabel = (labels.modality && labels.modality[modKey]) || (modKey === '_other' ? 'その他' : modKey);
        html += `
          <div class="layer-modality-group" data-modality="${modKey}">
            <div class="layer-modality-header" style="color:${layer.color};">
              ${modLabel} <span style="opacity:0.6;font-weight:500;">(${groups[modKey].length})</span>
            </div>
            <div class="layer-modality-cards">
              ${groups[modKey].map(menu => _renderMenuCard(menu, layer)).join('')}
            </div>
          </div>
        `;
      });
    } else {
      // フラットに並べる（Layer 2 / 3 / 4）
      layerMenus.forEach(menu => {
        html += _renderMenuCard(menu, layer);
      });
    }

    html += `
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function _renderMenuCard(menu, phase) {
  const channels = menu.channels_list && menu.channels_list.length > 0
    ? menu.channels_list
    : (menu.channels ? menu.channels.split(',').map(s => s.trim()).filter(Boolean) : []);

  return `
    <div class="menu-card" data-name="${escHtml(menu.name)}">
      <div class="menu-card-top">
        <div class="menu-card-title">${escHtml(menu.name)}</div>
        <div class="menu-card-actions">
          ${menu.time ? `<span class="time-badge">${menu.time}分</span>` : ''}
          <button class="menu-card-del-btn" onclick="deleteTeamMenu('${escHtml(menu.name)}')" title="削除">✕</button>
        </div>
      </div>
      ${menu.desc ? `<div class="menu-card-desc">${escHtml(menu.desc)}</div>` : ''}
      <div class="menu-card-attrs">
        ${layerBadge(menu.layer)}
        ${purposeBadge(menu.purpose)}
        ${coachingBadge(menu.coaching)}
        ${vfeBadge(menu.vfe_target)}
      </div>
      ${channels.length > 0 ? `<div class="menu-card-channels">${channelChips(channels)}</div>` : ''}
      ${menu.fep ? `
        <details class="menu-card-fep">
          <summary>FEP解説</summary>
          <div class="menu-card-fep-text">${escHtml(menu.fep)}</div>
        </details>
      ` : ''}
      ${menu.steps && menu.steps.length > 0 ? `
        <details class="menu-card-steps">
          <summary>ステップ (${menu.steps.length})</summary>
          <ul class="menu-card-steps-list">
            ${menu.steps.map(s => `<li>${escHtml(s)}</li>`).join('')}
          </ul>
        </details>
      ` : ''}
      ${menu.coaching_points && menu.coaching_points.length > 0 ? `
        <details class="menu-card-coaching-pts">
          <summary>コーチングポイント</summary>
          <ul class="menu-card-steps-list">
            ${menu.coaching_points.map(s => `<li>${escHtml(s)}</li>`).join('')}
          </ul>
        </details>
      ` : ''}
    </div>
  `;
}

// ─── 編集モード切替 ──────────────────────────────────────────
function toggleEditMode() {
  isEditMode = !isEditMode;
  const wrapper = document.getElementById('menu-page-wrapper');
  const btn = document.getElementById('edit-mode-btn');
  const addSection = document.getElementById('menu-add-section');
  if (!wrapper || !btn) return;

  if (isEditMode) {
    wrapper.classList.add('edit-mode');
    btn.textContent = '✓ 完了';
    btn.classList.add('is-active');
    if (addSection) addSection.style.display = 'block';
  } else {
    wrapper.classList.remove('edit-mode');
    btn.textContent = '✏️ 編集';
    btn.classList.remove('is-active');
    if (addSection) addSection.style.display = 'none';
  }
}

// ─── メニュー削除 ───────────────────────────────────────────
function deleteTeamMenu(name) {
  if (!confirm(`「${name}」を削除しますか？`)) return;

  // Check if it's a custom menu
  let customs = _getCustomMenus();
  const customIdx = customs.findIndex(m => m.name === name);
  if (customIdx >= 0) {
    customs.splice(customIdx, 1);
    _saveCustomMenus(customs);
  } else {
    // It's a base menu — add to deleted list
    _addDeletedName(name);
  }

  renderPhases();
}

// ─── メニュー追加（drill-library.js の openAddModal 経由）────
function addMenuItemFromPreset(levelId, preset) {
  // Add as custom menu
  const customs = _getCustomMenus();
  const newMenu = {
    menu_id: '',
    name: preset.name || '',
    cat: preset.cat || 'tech',
    scope: 'team',
    layer: preset.layer || '',
    purpose: preset.purpose || '',
    purpose_list: preset.purpose_list || [],
    channels: preset.channels || '',
    channels_list: preset.channels_list || [],
    coaching: preset.coaching || '',
    vfe_target: preset.vfe_target || '',
    time: parseInt(preset.time) || 0,
    desc: preset.desc || '',
    fep: preset.fep || '',
    steps: preset.steps || [],
    coaching_points: preset.coaching_points || [],
  };

  // Remove from deleted list if was previously deleted
  _removeDeletedName(newMenu.name);

  // Avoid duplicates
  if (!customs.find(m => m.name === newMenu.name)) {
    customs.push(newMenu);
    _saveCustomMenus(customs);
  }

  renderPhases();
}

// ─── 旧互換: toggleAddMenuForm ──────────────────────────────
function toggleAddMenuForm(levelId) {
  if (typeof openAddModal === 'function') {
    openAddModal('level', 'team');
  }
}

// ─── 旧互換: saveLevelMenu (no-op, data auto-persists) ──────
function saveLevelMenu() {}

// ─── 旧互換: deleteMenuItem (for drill-library modal) ────────
function deleteMenuItem(btn) {
  const card = btn.closest('.menu-card');
  if (!card) {
    // fallback: old-style card
    const oldCard = btn.closest('.drill-card') || btn.closest('.menu-item-card');
    if (oldCard) oldCard.remove();
    return;
  }
  const name = card.dataset.name;
  if (name) deleteTeamMenu(name);
}

// ─── 初期化 ─────────────────────────────────────────────────
function initMenuPage() {
  isEditMode = false;
  activeFilters = { layer: 'all', purpose: 'all', coaching: 'all' };

  // Reset edit mode UI
  const wrapper = document.getElementById('menu-page-wrapper');
  if (wrapper) wrapper.classList.remove('edit-mode');
  const editBtn = document.getElementById('edit-mode-btn');
  if (editBtn) { editBtn.textContent = '✏️ 編集'; editBtn.classList.remove('is-active'); }
  const addSection = document.getElementById('menu-add-section');
  if (addSection) addSection.style.display = 'none';

  // Reset filter UI
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.val === 'all');
  });

  // グループセレクター描画 + グループ必須チェック
  if (typeof GroupContext !== 'undefined') {
    GroupContext.renderGroupSelector('menu-group-selector', _onMenuGroupChange);
  }
  _applyMenuGroupGate();
}

function _onMenuGroupChange(group) {
  _applyMenuGroupGate();
}

function _applyMenuGroupGate() {
  const hasGroup = typeof GroupContext !== 'undefined' && GroupContext.getActiveGroupId();
  const noGroupEl = document.getElementById('menu-no-group');
  const filterBar = document.getElementById('menu-filter-bar');
  const phaseContainer = document.getElementById('phase-container');
  const addSection = document.getElementById('menu-add-section');

  if (hasGroup) {
    if (noGroupEl) noGroupEl.style.display = 'none';
    if (filterBar) filterBar.style.display = '';
    if (phaseContainer) phaseContainer.style.display = '';
    renderPhases();
  } else {
    if (noGroupEl) noGroupEl.style.display = 'block';
    if (filterBar) filterBar.style.display = 'none';
    if (phaseContainer) phaseContainer.style.display = 'none';
    if (addSection) addSection.style.display = 'none';
  }
}
