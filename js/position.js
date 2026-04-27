// ══════════════════════════════════════════════════════════
// POSITION MENU FUNCTIONS  (js/position.js)
// ══════════════════════════════════════════════════════════
// Layer-based view (L1-L4) with multi-axis filters
// 同一軸 OR / 軸間 AND / メニュー側パイプ・カンマ区切りは any-match
// target_scope はタブで決まるため詳細フィルターからは除外

const POS_KEYS = ['gk', 'df', 'mf', 'fw'];

const POS_META = {
  gk: { icon: '🧤', label: 'GKメニュー', theme: '先読みと判断',     color: '#d97706', tags: ['予測のズレ', '更新速度', '声かけ'] },
  df: { icon: '🛡️', label: 'DFメニュー', theme: '相手予測とライン調整', color: '#1d4ed8', tags: ['相手の意図', 'スペース管理', 'ライン共有'] },
  mf: { icon: '⚙️', label: 'MFメニュー', theme: '情報整理と選択',     color: '#059669', tags: ['周囲確認', '選択肢準備', '切り替え'] },
  fw: { icon: '🎯', label: 'FWメニュー', theme: '動き出しとフィニッシュ', color: '#dc2626', tags: ['動き出し', '打つ判断', 'ミス後の修正'] },
};

const POS_LAYERS = [
  { id: 'L1', label: 'L1: 感覚・身体',     color: '#3b82f6', bg: 'linear-gradient(135deg,#eff6ff,#dbeafe)', icon: '🌱' },
  { id: 'L2', label: 'L2: 技術・反復',     color: '#059669', bg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', icon: '⚙️' },
  { id: 'L3', label: 'L3: 戦術・相互作用', color: '#d97706', bg: 'linear-gradient(135deg,#fffbeb,#fef3c7)', icon: '🤝' },
  { id: 'L4', label: 'L4: 長期・統合',     color: '#dc2626', bg: 'linear-gradient(135deg,#fef2f2,#fecaca)', icon: '🎯' },
];

// ─── 状態 ───────────────────────────────────────────────────
let currentPosId = 'gk';
let isPosEditMode = false;
// 多軸フィルター（target_scope はタブで決まるため除外）
let posFilters = {
  layer:            [],
  session_phase:    [],
  sensory_channels: [],
  purpose_domain:   [],
  coaching_tone:    [],
  vfe_target:       [],
  efe_target:       [],
  eu_target:        [],
  difficulty_level: [],
  group_format:     [],
  time:             [],
};

// localStorage keys
const POS_CUSTOM_KEY_PREFIX = 'fep_custom_pos_';
const POS_DELETED_KEY_PREFIX = 'fep_deleted_pos_';

// ─── HTML エスケープ ────────────────────────────────────────
function escPosHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Badge helpers ──────────────────────────────────────────
function _posLayerBadge(layer) {
  if (!layer) return '';
  const colors = { L1: '#3b82f6', L2: '#059669', L3: '#d97706', L4: '#dc2626' };
  const c = colors[layer] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escPosHtml(layer)}</span>`;
}

function _posPurposeBadge(purpose) {
  if (!purpose) return '';
  const colors = { '感覚': '#3b82f6', '認知': '#8b5cf6', '相互作用': '#059669', '長期目標': '#d97706' };
  const c = colors[purpose] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escPosHtml(purpose)}</span>`;
}

function _posCoachingBadge(coaching) {
  if (!coaching) return '';
  const labels = { safe: 'Safe', explore: 'Explore', challenge: 'Challenge', positive: 'Positive', reflective: 'Reflective' };
  const colors = { safe: '#3b82f6', explore: '#8b5cf6', challenge: '#dc2626', positive: '#059669', reflective: '#6366f1' };
  const label = labels[coaching] || coaching;
  const c = colors[coaching] || '#6b7280';
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escPosHtml(label)}</span>`;
}

function _posVfeBadge(vfe) {
  if (!vfe) return '';
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
  return `<span class="attr-badge" style="background:${c}15;color:${c};border:1px solid ${c}30">${escPosHtml(label)}</span>`;
}

function _posChannelChips(channels) {
  if (!channels) return '';
  const list = Array.isArray(channels)
    ? channels
    : String(channels).split(/[|,]/).map(s => s.trim()).filter(Boolean);
  return list.map(ch => `<span class="channel-chip">${escPosHtml(ch)}</span>`).join('');
}

// ─── データ取得 ──────────────────────────────────────────────
function _getPosMenus(posId) {
  let base = [];

  // From ALL_MENU_PRESETS — target_scope = posId | 'all' | パイプ含み
  if (window.ALL_MENU_PRESETS && window.ALL_MENU_PRESETS.length > 0) {
    base = window.ALL_MENU_PRESETS.filter(m => {
      const scope = m.target_scope || m.scope || '';
      const scopes = String(scope).split(/[|,]/).map(s => s.trim()).filter(Boolean);
      return scopes.includes(posId) || scopes.includes('all');
    });
  }

  // Fallback: POS_PRESETS (hardcoded, minimal data)
  if (base.length === 0 && typeof POS_PRESETS !== 'undefined' && POS_PRESETS[posId]) {
    base = POS_PRESETS[posId].map(m => ({
      ...m,
      scope: posId,
      cat: m.cat || 'tech',
      layer: m.layer || '',
      purpose: m.purpose || '',
      channels: m.channels || '',
      coaching: m.coaching || '',
      vfe_target: m.vfe_target || '',
      fep: m.fep || '',
      steps: m.steps || [],
      coaching_points: m.coaching_points || [],
    }));
  }

  // Coach's custom additions
  try {
    const raw = localStorage.getItem(POS_CUSTOM_KEY_PREFIX + posId);
    if (raw) base = base.concat(JSON.parse(raw));
  } catch(e) {}

  // Coach's deletions
  const deleted = _getPosDeletedNames(posId);
  if (deleted.length > 0) {
    base = base.filter(m => !deleted.includes(m.name));
  }

  return base;
}

function _getPosDeletedNames(posId) {
  try {
    const raw = localStorage.getItem(POS_DELETED_KEY_PREFIX + posId);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function _addPosDeletedName(posId, name) {
  const deleted = _getPosDeletedNames(posId);
  if (!deleted.includes(name)) {
    deleted.push(name);
    localStorage.setItem(POS_DELETED_KEY_PREFIX + posId, JSON.stringify(deleted));
  }
}

function _getPosCustomMenus(posId) {
  try {
    const raw = localStorage.getItem(POS_CUSTOM_KEY_PREFIX + posId);
    return raw ? JSON.parse(raw) : [];
  } catch(e) { return []; }
}

function _savePosCustomMenus(posId, menus) {
  localStorage.setItem(POS_CUSTOM_KEY_PREFIX + posId, JSON.stringify(menus));
}

// ─── フィルター判定 ─────────────────────────────────────────
function _posMenuValueForAxis(m, axis) {
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
    case 'difficulty_level': return m.difficulty_level != null ? String(m.difficulty_level) : '';
    case 'group_format':     return m.group_format;
    case 'time':             return m.time != null ? String(m.time) : '';
    default: return '';
  }
}

function _posMatchAxis(menuValue, selectedValues) {
  if (menuValue === null || menuValue === undefined || menuValue === '') return false;
  let menuVals;
  if (Array.isArray(menuValue)) {
    menuVals = menuValue.map(v => String(v).trim()).filter(Boolean);
  } else {
    menuVals = String(menuValue).split(/[|,]/).map(s => s.trim()).filter(Boolean);
  }
  return selectedValues.some(sv => menuVals.includes(String(sv).trim()));
}

function _posMenuMatches(m) {
  for (const axis of Object.keys(posFilters)) {
    const selected = posFilters[axis];
    if (!selected || selected.length === 0) continue;
    if (!_posMatchAxis(_posMenuValueForAxis(m, axis), selected)) return false;
  }
  return true;
}

function _applyPosFilters(menus) {
  return menus.filter(_posMenuMatches);
}

// チップトグル（同一軸 OR）
function togglePosFilter(type, value, btn) {
  if (!posFilters[type]) posFilters[type] = [];
  const arr = posFilters[type];
  const idx = arr.indexOf(value);
  if (idx >= 0) {
    arr.splice(idx, 1);
    btn.classList.remove('active');
  } else {
    arr.push(value);
    btn.classList.add('active');
  }
  renderPosContent(currentPosId);
}

function clearPosFilters() {
  Object.keys(posFilters).forEach(k => posFilters[k] = []);
  document.querySelectorAll('#pos-filter-bar .filter-chip, #pos-filter-detail .filter-chip')
    .forEach(b => b.classList.remove('active'));
  renderPosContent(currentPosId);
}

// 旧 API 互換（all = 全クリア）
function setPosFilter(type, value, btn) {
  if (value === 'all') {
    posFilters[type] = [];
    const container = btn.closest('.filter-chips');
    if (container) container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderPosContent(currentPosId);
    return;
  }
  togglePosFilter(type, value, btn);
}

function togglePosFilterDetail() {
  const el = document.getElementById('pos-filter-detail');
  const btn = document.getElementById('pos-filter-detail-toggle');
  if (!el || !btn) return;
  const isOpen = el.classList.toggle('is-open');
  btn.textContent = isOpen ? '▲ 詳細フィルターを閉じる' : '▼ 詳細フィルターを開く';
}

// ─── ポジションタブ切替 ─────────────────────────────────────
function switchPosTab(posId, btn) {
  currentPosId = posId;
  document.querySelectorAll('.pos-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('#pos-tabs .pos-tab-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('pos-' + posId);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
  renderPosContent(posId);
}

// ─── ポジション内容描画（Layer グループ化）────────────────────
function renderPosContent(posId) {
  const container = document.getElementById('pos-' + posId);
  if (!container) return;

  const meta = POS_META[posId];
  const allMenus = _getPosMenus(posId);
  const filtered = _applyPosFilters(allMenus);

  let html = '';

  // Hero card
  html += `
    <div class="pos-hero ${posId}">
      <div class="pos-hero-icon">${meta.icon}</div>
      <div class="pos-hero-body">
        <h3>${meta.label}</h3>
        <p>テーマ：${meta.theme}</p>
        <div class="pos-fep-tags">
          ${meta.tags.map(t => `<span class="pos-fep-tag">${escPosHtml(t)}</span>`).join('')}
        </div>
      </div>
    </div>
  `;

  // フィルターヒット 0 件
  if (filtered.length === 0 && allMenus.length > 0) {
    html += `
      <div class="filter-empty-banner" style="margin:16px 0;">
        フィルターに一致するメニューがありません。
        <button class="filter-clear-btn" onclick="clearPosFilters()">フィルターをクリア</button>
      </div>
    `;
  } else if (allMenus.length === 0) {
    html += `<div class="phase-empty" style="margin:16px 0;">このポジションのメニューはありません</div>`;
  }

  // Layer グループごとに描画
  let drillCounter = 0;
  POS_LAYERS.forEach(layer => {
    const layerMenus = filtered.filter(m => m.layer === layer.id);
    if (layerMenus.length === 0) return;  // 空 Layer は描画しない（ポジション別はメニュー数が少ないため）

    html += `
      <div class="layer-section pos-layer-section" data-layer="${layer.id}">
        <div class="layer-header" style="background:${layer.bg};border-left:4px solid ${layer.color};">
          <div class="layer-header-top">
            <span class="layer-icon">${layer.icon}</span>
            <div class="layer-header-info">
              <div class="layer-title" style="color:${layer.color}">${layer.label}</div>
            </div>
            <span class="layer-count">${layerMenus.length}</span>
          </div>
        </div>
        <div class="layer-cards">
          ${layerMenus.map(menu => {
            drillCounter += 1;
            return _renderPosCard(menu, posId, drillCounter);
          }).join('')}
        </div>
      </div>
    `;
  });

  // Layer 未設定メニュー
  const noLayer = filtered.filter(m => !m.layer);
  if (noLayer.length > 0) {
    html += `
      <div class="layer-section pos-layer-section" data-layer="other">
        <div class="layer-header" style="background:#f3f4f6;border-left:4px solid #6b7280;">
          <div class="layer-header-top">
            <span class="layer-icon">📦</span>
            <div class="layer-header-info">
              <div class="layer-title" style="color:#374151">Layer 未設定</div>
            </div>
            <span class="layer-count">${noLayer.length}</span>
          </div>
        </div>
        <div class="layer-cards">
          ${noLayer.map(menu => {
            drillCounter += 1;
            return _renderPosCard(menu, posId, drillCounter);
          }).join('')}
        </div>
      </div>
    `;
  }

  // Add menu section (edit mode)
  html += `
    <div class="add-menu-section pos-edit-section">
      <button class="btn btn-accent" onclick="openAddModal('pos','${posId}')">＋ メニューを追加</button>
    </div>
  `;

  container.innerHTML = html;
}

function _renderPosCard(menu, posId, num) {
  const channels = (menu.sensory_channels_list && menu.sensory_channels_list.length)
    ? menu.sensory_channels_list
    : (menu.channels_list && menu.channels_list.length
        ? menu.channels_list
        : (menu.sensory_channels || menu.channels
            ? String(menu.sensory_channels || menu.channels).split(/[|,]/).map(s => s.trim()).filter(Boolean)
            : []));

  const steps = menu.steps || [];
  const coachingPts = menu.coaching_points || [];
  const name = menu.menu_name || menu.name || '';
  const desc = menu.desc || '';
  const purpose = menu.purpose_domain || menu.purpose || '';
  const coaching = menu.coaching_tone || menu.coaching || '';

  return `
    <div class="drill-card ${posId}" data-name="${escPosHtml(name)}">
      <button class="menu-delete-btn pos-del-btn" onclick="deletePosMenu('${posId}','${escPosHtml(name)}')" title="削除">✕</button>
      <div class="drill-header">
        <span class="drill-num ${posId}">Drill ${num}</span>
        <div class="drill-title">${escPosHtml(name)}</div>
      </div>
      ${desc ? `<p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px">${escPosHtml(desc)}</p>` : ''}
      <div class="menu-card-attrs">
        ${_posLayerBadge(menu.layer)}
        ${_posPurposeBadge(purpose)}
        ${_posCoachingBadge(coaching)}
        ${_posVfeBadge(menu.vfe_target)}
        ${menu.time ? `<span class="time-badge">${escPosHtml(menu.time)}分</span>` : ''}
      </div>
      ${channels.length > 0 ? `<div class="menu-card-channels">${_posChannelChips(channels)}</div>` : ''}
      ${steps.length > 0 ? `
        <ul class="drill-steps">
          ${steps.map(s => `<li>${escPosHtml(s)}</li>`).join('')}
        </ul>
      ` : ''}
      ${menu.fep ? `
        <details class="drill-fep-details">
          <summary>FEP解説</summary>
          <div class="drill-fep ${posId}">${escPosHtml(menu.fep)}</div>
        </details>
      ` : ''}
      ${coachingPts.length > 0 ? `
        <details class="drill-fep-details">
          <summary>コーチングポイント</summary>
          <ul class="drill-steps">${coachingPts.map(s => `<li>${escPosHtml(s)}</li>`).join('')}</ul>
        </details>
      ` : ''}
    </div>
  `;
}

// ─── 編集モード切替 ──────────────────────────────────────────
function togglePosEditMode() {
  isPosEditMode = !isPosEditMode;
  const wrapper = document.getElementById('pos-page-wrapper');
  const btn = document.getElementById('pos-edit-btn');
  if (!wrapper || !btn) return;
  if (isPosEditMode) {
    wrapper.classList.add('edit-mode');
    btn.textContent = '✓ 完了';
    btn.classList.add('is-active');
  } else {
    wrapper.classList.remove('edit-mode');
    btn.textContent = '✏️ 編集';
    btn.classList.remove('is-active');
  }
}

// ─── メニュー削除 ───────────────────────────────────────────
function deletePosMenu(posId, name) {
  if (!confirm(`「${name}」を削除しますか？`)) return;

  let customs = _getPosCustomMenus(posId);
  const customIdx = customs.findIndex(m => m.name === name);
  if (customIdx >= 0) {
    customs.splice(customIdx, 1);
    _savePosCustomMenus(posId, customs);
  } else {
    _addPosDeletedName(posId, name);
  }

  renderPosContent(posId);
}

// ─── メニュー追加（drill-library.js の openAddModal 経由）────
function addPosItemFromPreset(posId, preset) {
  const customs = _getPosCustomMenus(posId);
  const newMenu = {
    menu_id: preset.menu_id || '',
    name: preset.name || preset.menu_name || '',
    cat: preset.cat || preset.session_phase || 'tech',
    scope: posId,
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

  // Remove from deleted if was previously deleted
  let deleted = _getPosDeletedNames(posId);
  deleted = deleted.filter(n => n !== newMenu.name);
  localStorage.setItem(POS_DELETED_KEY_PREFIX + posId, JSON.stringify(deleted));

  if (!customs.find(m => m.name === newMenu.name)) {
    customs.push(newMenu);
    _savePosCustomMenus(posId, customs);
  }

  renderPosContent(posId);
}

// ─── 旧互換 ─────────────────────────────────────────────────
function savePosMenu() {}

function deletePosItem(btn) {
  const card = btn.closest('.drill-card');
  if (!card) return;
  const name = card.dataset.name;
  if (name) deletePosMenu(currentPosId, name);
}

function normalizeAllPosCards() {}

// ─── 初期化 ──────────────────────────────────────────────────
function initPositionPage() {
  currentPosId = 'gk';
  isPosEditMode = false;
  Object.keys(posFilters).forEach(k => posFilters[k] = []);

  // Reset edit mode
  const wrapper = document.getElementById('pos-page-wrapper');
  if (wrapper) wrapper.classList.remove('edit-mode');
  const btn = document.getElementById('pos-edit-btn');
  if (btn) { btn.textContent = '✏️ 編集'; btn.classList.remove('is-active'); }

  // Reset filters
  document.querySelectorAll('#pos-filter-bar .filter-chip, #pos-filter-detail .filter-chip')
    .forEach(b => b.classList.remove('active'));

  // 詳細フィルターは閉じた状態に
  const detail = document.getElementById('pos-filter-detail');
  if (detail) detail.classList.remove('is-open');
  const detailToggle = document.getElementById('pos-filter-detail-toggle');
  if (detailToggle) detailToggle.textContent = '▼ 詳細フィルターを開く';

  // グループセレクター描画 + グループ必須チェック
  if (typeof GroupContext !== 'undefined') {
    GroupContext.renderGroupSelector('pos-group-selector', _onPosGroupChange);
  }
  _applyPosGroupGate();
}

function _onPosGroupChange(group) {
  _applyPosGroupGate();
}

function _applyPosGroupGate() {
  const hasGroup = typeof GroupContext !== 'undefined' && GroupContext.getActiveGroupId();
  const noGroupEl = document.getElementById('pos-no-group');
  const tabs = document.getElementById('pos-tabs');
  const filterBar = document.getElementById('pos-filter-bar');
  const filterDetailWrap = document.getElementById('pos-filter-detail-wrap');
  const contents = document.querySelectorAll('.pos-content');

  if (hasGroup) {
    if (noGroupEl) noGroupEl.style.display = 'none';
    if (tabs) tabs.style.display = '';
    if (filterBar) filterBar.style.display = '';
    if (filterDetailWrap) filterDetailWrap.style.display = '';
    contents.forEach(c => c.style.display = '');
    // Render
    const firstBtn = document.querySelector('#pos-tabs .pos-tab-btn');
    if (firstBtn) switchPosTab('gk', firstBtn);
  } else {
    if (noGroupEl) noGroupEl.style.display = 'block';
    if (tabs) tabs.style.display = 'none';
    if (filterBar) filterBar.style.display = 'none';
    if (filterDetailWrap) filterDetailWrap.style.display = 'none';
    contents.forEach(c => c.style.display = 'none');
  }
}
