// ══════════════════════════════════════════════════════════
// TEAM TRAINING PAGE  (js/menu.js)
// ══════════════════════════════════════════════════════════
// Layer-based view (L1-L4) driven by ALL_MENU_PRESETS (from data-loader.js)
// 多軸フィルター: 同一軸内 OR / 軸間 AND / メニュー側パイプ区切りは any-match

// ─── Layer 定義 ─────────────────────────────────────────────
const LAYERS = [
  { id: 'L1', label: 'L1: 感覚・身体',     color: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', icon: '🌱', desc: '感覚入力と身体図式の安定化' },
  { id: 'L2', label: 'L2: 技術・反復',     color: '#059669', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: '⚙️', desc: '個人技術の反復と修正' },
  { id: 'L3', label: 'L3: 戦術・相互作用', color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', icon: '🤝', desc: '集団の共有モデル形成' },
  { id: 'L4', label: 'L4: 長期・統合',     color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fecaca)', icon: '🎯', desc: '目標設定と長期統合' },
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
// 多軸フィルター（各軸は配列。空配列 = その軸は無効）
let activeFilters = {
  // 基本（常時表示）
  layer:            [],
  session_phase:    [],
  sensory_channels: [],
  purpose_domain:   [],
  coaching_tone:    [],
  // 詳細（アコーディオン内）
  vfe_target:       [],
  efe_target:       [],
  eu_target:        [],
  target_scope:     [],
  difficulty_level: [],
  group_format:     [],
  time:             [],
};

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
  const colors = { '感覚': '#3b82f6', '認知': '#8b5cf6', '相互作用': '#059669', '長期目標': '#d97706' };
  const c = colors[purpose] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(purpose)}</span>`;
}

function coachingBadge(coaching) {
  if (!coaching) return '';
  const labels = { safe: 'Safe', explore: 'Explore', challenge: 'Challenge', positive: 'Positive', reflective: 'Reflective' };
  const colors = { safe: '#3b82f6', explore: '#8b5cf6', challenge: '#dc2626', positive: '#059669', reflective: '#6366f1' };
  const label = labels[coaching] || coaching;
  const c = colors[coaching] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(label)}</span>`;
}

function phaseBadge(phase) {
  if (!phase) return '';
  const labels = { warm: 'Warm', tech: 'Tech', tactic: 'Tactic', phys: 'Phys', cool: 'Cool', main: 'Main', cool_down: 'Cool' };
  const c = '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(labels[phase] || phase)}</span>`;
}

function vfeBadge(vfe) {
  if (!vfe) return '';
  // 旧3値 + 新統制語彙の両対応
  const labels = {
    low: 'VFE: Low', mid: 'VFE: Mid', high: 'VFE: High',
    low_stable: 'VFE: 低値安定', optimal: 'VFE: 最適', high_confused: 'VFE: 高値混乱',
  };
  const colors = {
    low: '#059669', mid: '#d97706', high: '#dc2626',
    low_stable: '#059669', optimal: '#d97706', high_confused: '#dc2626',
  };
  const label = labels[vfe] || `VFE: ${vfe}`;
  const c = colors[vfe] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escHtml(label)}</span>`;
}

function channelChips(channels) {
  if (!channels) return '';
  const list = Array.isArray(channels)
    ? channels
    : String(channels).split(/[|,]/).map(s => s.trim()).filter(Boolean);
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

// ─── フィルター判定 ─────────────────────────────────────────
// 同一軸内: OR / 軸間: AND / メニュー側パイプ・カンマ区切り: any-match
function _menuValueForAxis(m, axis) {
  switch (axis) {
    case 'layer':            return m.layer;
    case 'session_phase':    return m.session_phase || m.cat;
    case 'sensory_channels': return m.sensory_channels_list && m.sensory_channels_list.length
                                  ? m.sensory_channels_list
                                  : (m.sensory_channels || m.channels);
    case 'purpose_domain':   return m.purpose_domain || m.purpose;
    case 'coaching_tone':    return m.coaching_tone || m.coaching;
    case 'vfe_target':       return m.vfe_target;
    case 'efe_target':       return m.efe_target;
    case 'eu_target':        return m.eu_target;
    case 'target_scope':     return m.target_scope || m.scope;
    case 'difficulty_level': return m.difficulty_level != null ? String(m.difficulty_level) : '';
    case 'group_format':     return m.group_format;
    case 'time':             return m.time != null ? String(m.time) : '';
    default: return '';
  }
}

function _matchAxis(menuValue, selectedValues) {
  if (menuValue === null || menuValue === undefined || menuValue === '') return false;
  let menuVals;
  if (Array.isArray(menuValue)) {
    menuVals = menuValue.map(v => String(v).trim()).filter(Boolean);
  } else {
    menuVals = String(menuValue).split(/[|,]/).map(s => s.trim()).filter(Boolean);
  }
  return selectedValues.some(sv => menuVals.includes(String(sv).trim()));
}

function _menuMatchesFilters(m) {
  for (const axis of Object.keys(activeFilters)) {
    const selected = activeFilters[axis];
    if (!selected || selected.length === 0) continue;
    if (!_matchAxis(_menuValueForAxis(m, axis), selected)) return false;
  }
  return true;
}

function _applyFilters(menus) {
  return menus.filter(_menuMatchesFilters);
}

// チップトグル（同一軸 OR）
function toggleFilter(type, value, btn) {
  if (!activeFilters[type]) activeFilters[type] = [];
  const arr = activeFilters[type];
  const idx = arr.indexOf(value);
  if (idx >= 0) {
    arr.splice(idx, 1);
    btn.classList.remove('active');
  } else {
    arr.push(value);
    btn.classList.add('active');
  }
  renderLayers();
}

// 全フィルタークリア
function clearAllFilters() {
  Object.keys(activeFilters).forEach(k => activeFilters[k] = []);
  document.querySelectorAll('#menu-filter-bar .filter-chip, #menu-filter-detail .filter-chip')
    .forEach(b => b.classList.remove('active'));
  renderLayers();
}

// ─── Layer描画 ───────────────────────────────────────────────
function renderLayers() {
  const container = document.getElementById('layer-container');
  if (!container) return;

  const allMenus = _getTeamMenus();
  const filtered = _applyFilters(allMenus);

  let html = '';
  LAYERS.forEach(layer => {
    const layerMenus = filtered.filter(m => m.layer === layer.id);

    html += `
      <div class="layer-section" data-layer="${layer.id}">
        <div class="layer-header" style="background:${layer.bg};border-left:4px solid ${layer.color};">
          <div class="layer-header-top">
            <span class="layer-icon">${layer.icon}</span>
            <div class="layer-header-info">
              <div class="layer-title" style="color:${layer.color}">${layer.label}</div>
              <div class="layer-desc">${escHtml(layer.desc)}</div>
            </div>
            <span class="layer-count">${layerMenus.length}</span>
          </div>
        </div>
        <div class="layer-cards">
    `;

    if (layerMenus.length === 0) {
      html += `<div class="layer-empty">該当するメニューはありません</div>`;
    } else {
      layerMenus.forEach(menu => {
        html += _renderMenuCard(menu);
      });
    }

    html += `
        </div>
      </div>
    `;
  });

  // 該当 0 件のとき、フィルター解除導線
  const totalFiltered = filtered.length;
  if (totalFiltered === 0 && _activeFilterCount() > 0) {
    html = `
      <div class="filter-empty-banner">
        フィルターに一致するメニューがありません。
        <button class="filter-clear-btn" onclick="clearAllFilters()">フィルターをクリア</button>
      </div>
    ` + html;
  }

  container.innerHTML = html;
}

function _activeFilterCount() {
  return Object.values(activeFilters).reduce((n, arr) => n + (arr ? arr.length : 0), 0);
}

function _renderMenuCard(menu) {
  const channels = (menu.sensory_channels_list && menu.sensory_channels_list.length)
    ? menu.sensory_channels_list
    : (menu.channels_list && menu.channels_list.length
        ? menu.channels_list
        : (menu.sensory_channels || menu.channels
            ? String(menu.sensory_channels || menu.channels).split(/[|,]/).map(s => s.trim()).filter(Boolean)
            : []));

  const phase = menu.session_phase || menu.cat || '';
  const purpose = menu.purpose_domain || menu.purpose || '';
  const coaching = menu.coaching_tone || menu.coaching || '';
  const name = menu.menu_name || menu.name || '';
  const desc = menu.desc || '';
  const fep = menu.fep || '';
  const steps = menu.steps || [];
  const coachingPts = menu.coaching_points || [];

  return `
    <div class="menu-card" data-name="${escHtml(name)}">
      <div class="menu-card-top">
        <div class="menu-card-title">${escHtml(name)}</div>
        <div class="menu-card-actions">
          ${menu.time ? `<span class="time-badge">${escHtml(menu.time)}分</span>` : ''}
          <button class="menu-card-del-btn" onclick="deleteTeamMenu('${escHtml(name)}')" title="削除">✕</button>
        </div>
      </div>
      ${desc ? `<div class="menu-card-desc">${escHtml(desc)}</div>` : ''}
      <div class="menu-card-attrs">
        ${layerBadge(menu.layer)}
        ${phaseBadge(phase)}
        ${purposeBadge(purpose)}
        ${coachingBadge(coaching)}
        ${vfeBadge(menu.vfe_target)}
      </div>
      ${channels.length > 0 ? `<div class="menu-card-channels">${channelChips(channels)}</div>` : ''}
      ${fep ? `
        <details class="menu-card-fep">
          <summary>FEP解説</summary>
          <div class="menu-card-fep-text">${escHtml(fep)}</div>
        </details>
      ` : ''}
      ${steps.length > 0 ? `
        <details class="menu-card-steps">
          <summary>ステップ (${steps.length})</summary>
          <ul class="menu-card-steps-list">
            ${steps.map(s => `<li>${escHtml(s)}</li>`).join('')}
          </ul>
        </details>
      ` : ''}
      ${coachingPts.length > 0 ? `
        <details class="menu-card-coaching-pts">
          <summary>コーチングポイント</summary>
          <ul class="menu-card-steps-list">
            ${coachingPts.map(s => `<li>${escHtml(s)}</li>`).join('')}
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

  renderLayers();
}

// ─── メニュー追加（drill-library.js の openAddModal 経由）────
function addMenuItemFromPreset(levelId, preset) {
  // Add as custom menu
  const customs = _getCustomMenus();
  const newMenu = {
    menu_id: '',
    name: preset.name || preset.menu_name || '',
    cat: preset.cat || preset.session_phase || 'tech',
    scope: 'team',
    layer: preset.layer || '',
    purpose: preset.purpose || preset.purpose_domain || '',
    purpose_list: preset.purpose_list || [],
    channels: preset.channels || preset.sensory_channels || '',
    channels_list: preset.channels_list || preset.sensory_channels_list || [],
    coaching: preset.coaching || preset.coaching_tone || '',
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

  renderLayers();
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

// ─── 旧互換: 旧 setFilter（単一選択 API）── 内部で toggle に委譲
function setFilter(type, value, btn) {
  // 旧仕様の "all" は全クリアに変換
  if (value === 'all') {
    activeFilters[type] = [];
    const container = btn.closest('.filter-chips');
    if (container) container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLayers();
    return;
  }
  toggleFilter(type, value, btn);
}

// ─── 詳細フィルター開閉 ──────────────────────────────────────
function toggleFilterDetail() {
  const el = document.getElementById('menu-filter-detail');
  const btn = document.getElementById('menu-filter-detail-toggle');
  if (!el || !btn) return;
  const isOpen = el.classList.toggle('is-open');
  btn.textContent = isOpen ? '▲ 詳細フィルターを閉じる' : '▼ 詳細フィルターを開く';
}

// ─── 初期化 ─────────────────────────────────────────────────
function initMenuPage() {
  isEditMode = false;
  Object.keys(activeFilters).forEach(k => activeFilters[k] = []);

  // Reset edit mode UI
  const wrapper = document.getElementById('menu-page-wrapper');
  if (wrapper) wrapper.classList.remove('edit-mode');
  const editBtn = document.getElementById('edit-mode-btn');
  if (editBtn) { editBtn.textContent = '✏️ 編集'; editBtn.classList.remove('is-active'); }
  const addSection = document.getElementById('menu-add-section');
  if (addSection) addSection.style.display = 'none';

  // Reset filter UI: チップ active 解除
  document.querySelectorAll('#menu-filter-bar .filter-chip, #menu-filter-detail .filter-chip')
    .forEach(btn => btn.classList.remove('active'));

  // 詳細フィルターは閉じた状態に
  const detail = document.getElementById('menu-filter-detail');
  if (detail) detail.classList.remove('is-open');
  const detailToggle = document.getElementById('menu-filter-detail-toggle');
  if (detailToggle) detailToggle.textContent = '▼ 詳細フィルターを開く';

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
  const filterDetailWrap = document.getElementById('menu-filter-detail-wrap');
  const layerContainer = document.getElementById('layer-container');
  const addSection = document.getElementById('menu-add-section');

  if (hasGroup) {
    if (noGroupEl) noGroupEl.style.display = 'none';
    if (filterBar) filterBar.style.display = '';
    if (filterDetailWrap) filterDetailWrap.style.display = '';
    if (layerContainer) layerContainer.style.display = '';
    renderLayers();
  } else {
    if (noGroupEl) noGroupEl.style.display = 'block';
    if (filterBar) filterBar.style.display = 'none';
    if (filterDetailWrap) filterDetailWrap.style.display = 'none';
    if (layerContainer) layerContainer.style.display = 'none';
    if (addSection) addSection.style.display = 'none';
  }
}
