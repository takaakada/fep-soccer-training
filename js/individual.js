// ══════════════════════════════════════════════════════════
// INDIVIDUAL PAGE  (js/individual.js)
// 選手選択 → タイプ別課題プラン + カスタムメニュー
// ══════════════════════════════════════════════════════════

// ── 状態管理 ────────────────────────────────────────────
let _indAllPlayers = [];      // Supabase + localStorage の全選手
let _indSelectedPlayer = null; // 現在選択中の選手オブジェクト
let _epOpenPlanId = null;
let _currentIndTab = 'rehab';

// エラータイプ定義（player-profile.jsと同じ）
const IND_ERROR_TYPE_MAP = {
  motor_prediction:     { label: '運動予測ズレ',       icon: '🎯', color: '#dc2626', planId: 'IND-001' },
  sensory_dependence:   { label: '感覚依存',           icon: '👁️', color: '#ea580c', planId: 'IND-002' },
  reaction_speed:       { label: '反応スピード不足',   icon: '⏱️', color: '#d97706', planId: 'IND-003' },
  correction_confusion: { label: '修正迷子',           icon: '🔄', color: '#7c3aed', planId: 'IND-004' },
  information_overload: { label: '情報混乱',           icon: '🌀', color: '#0891b2', planId: 'IND-005' },
  rigid_thinking:       { label: '固執',               icon: '🧊', color: '#2563eb', planId: 'IND-006' },
  low_motivation:       { label: 'やりたくない',       icon: '😤', color: '#ca8a04', planId: 'IND-007' },
  emotional_control:    { label: '感情コントロール',   icon: '💔', color: '#059669', planId: 'IND-008' },
  poor_communication:   { label: '相互理解不足',       icon: '🤝', color: '#6b7280', planId: 'IND-009' },
  unclassified:         { label: '未分類',             icon: '❓', color: '#9ca3af', planId: null },
};

// ══════════════════════════════════════════════════════════
// 初期化
// ══════════════════════════════════════════════════════════

async function initIndividualPage() {
  _indSelectedPlayer = null;
  _epOpenPlanId = null;
  await _loadIndPlayers();
  _populateTeamSelect();
  // リセット表示
  document.getElementById('ind-empty').style.display = 'block';
  document.getElementById('ind-main').style.display = 'none';
}

// ── Supabase + localStorage から全選手取得 ────────────────
async function _loadIndPlayers() {
  let supabasePlayers = [];
  let localPlayers = [];

  if (typeof sbFep !== 'undefined' && sbFep) {
    try {
      const { data, error } = await sbFep
        .from('players')
        .select('*')
        .order('team_name', { ascending: true })
        .order('player_name', { ascending: true });
      if (!error && data) supabasePlayers = data;
    } catch (e) {
      console.warn('[individual] Supabase fetch error:', e);
    }
  }

  try {
    localPlayers = JSON.parse(localStorage.getItem('fep_players') || '[]');
  } catch (e) {}

  // マージ（Supabase優先）
  if (supabasePlayers.length > 0) {
    const sbIds = new Set(supabasePlayers.map(p => p.id));
    const localOnly = localPlayers.filter(p => !sbIds.has(p.id));
    _indAllPlayers = [...supabasePlayers, ...localOnly];
  } else {
    _indAllPlayers = localPlayers;
  }
}

// ══════════════════════════════════════════════════════════
// チーム → 選手 セレクト
// ══════════════════════════════════════════════════════════

function _populateTeamSelect() {
  const teamSel = document.getElementById('ind-team-select');
  if (!teamSel) return;

  const teams = [...new Set(_indAllPlayers.map(p => p.team_name))].sort();
  teamSel.innerHTML = '<option value="">-- チームを選択 --</option>';
  teams.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    teamSel.appendChild(opt);
  });

  // 選手セレクトをリセット
  const playerSel = document.getElementById('ind-player-select');
  if (playerSel) {
    playerSel.innerHTML = '<option value="">-- 選手を選択 --</option>';
    playerSel.disabled = true;
  }
}

function onIndTeamChange() {
  const teamSel = document.getElementById('ind-team-select');
  const playerSel = document.getElementById('ind-player-select');
  if (!teamSel || !playerSel) return;

  const teamName = teamSel.value;
  _indSelectedPlayer = null;
  _epOpenPlanId = null;

  if (!teamName) {
    playerSel.innerHTML = '<option value="">-- 選手を選択 --</option>';
    playerSel.disabled = true;
    document.getElementById('ind-empty').style.display = 'block';
    document.getElementById('ind-main').style.display = 'none';
    return;
  }

  // チーム内の選手をリスト
  const teamPlayers = _indAllPlayers.filter(p => p.team_name === teamName);
  playerSel.innerHTML = '<option value="">-- 選手を選択 --</option>';
  teamPlayers.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    const errType = IND_ERROR_TYPE_MAP[p.error_type || 'unclassified'] || IND_ERROR_TYPE_MAP.unclassified;
    opt.textContent = `#${p.jersey_number || '?'} ${p.player_name}（${p.position || '--'}）${errType.icon}`;
    playerSel.appendChild(opt);
  });
  playerSel.disabled = false;

  // まだ選手未選択
  document.getElementById('ind-empty').style.display = 'block';
  document.getElementById('ind-main').style.display = 'none';
}

function onIndPlayerChange() {
  const playerSel = document.getElementById('ind-player-select');
  if (!playerSel) return;

  const playerId = playerSel.value;
  if (!playerId) {
    _indSelectedPlayer = null;
    document.getElementById('ind-empty').style.display = 'block';
    document.getElementById('ind-main').style.display = 'none';
    return;
  }

  _indSelectedPlayer = _indAllPlayers.find(p => p.id === playerId) || null;
  if (!_indSelectedPlayer) return;

  _epOpenPlanId = null;

  // 表示切替
  document.getElementById('ind-empty').style.display = 'none';
  document.getElementById('ind-main').style.display = 'block';

  // 描画
  renderPlayerHeader();
  renderErrorPlanCards();
  renderIndMenus();
}

// ══════════════════════════════════════════════════════════
// 選手ヘッダー（タイプ・スコア表示）
// ══════════════════════════════════════════════════════════

function renderPlayerHeader() {
  const headerEl = document.getElementById('ind-player-header');
  if (!headerEl || !_indSelectedPlayer) return;

  const p = _indSelectedPlayer;
  const errType = IND_ERROR_TYPE_MAP[p.error_type || 'unclassified'] || IND_ERROR_TYPE_MAP.unclassified;

  // 記録データ取得
  const records = _getPlayerRecords(p.player_name);
  const vfeValues = records.filter(r => r.vfe_display != null).map(r => r.vfe_display);
  const avgVfe = vfeValues.length > 0 ? (vfeValues.reduce((a, b) => a + b, 0) / vfeValues.length).toFixed(1) : '--';
  const latest = records[0];
  const latestVfe = latest?.vfe_display != null ? latest.vfe_display.toFixed(1) : '--';
  const latestFp = latest?.dr != null
    ? (((latest.dr - 5) / 2.5 + (latest.uh - 5) / 2.5 + (latest.fh - 5) / 2.5) / 3).toFixed(2)
    : '--';

  headerEl.innerHTML = `
    <div class="sf-card" style="border-left:4px solid ${errType.color}; margin-bottom:20px;">
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <!-- 背番号アイコン -->
        <div style="width:56px; height:56px; background:linear-gradient(135deg, ${errType.color}, ${errType.color}88); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.4rem; color:white; font-weight:800;">
          ${p.jersey_number || '?'}
        </div>
        <!-- 選手情報 -->
        <div style="flex:1; min-width:180px;">
          <div style="font-size:1.2rem; font-weight:800;">${p.player_name}</div>
          <div style="font-size:0.82rem; color:var(--text-muted);">${p.team_name} | ${p.position || '--'}</div>
        </div>
        <!-- タイプバッジ -->
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.88rem; padding:5px 14px; border-radius:12px; background:${errType.color}12; color:${errType.color}; border:1px solid ${errType.color}30; font-weight:700;">
            ${errType.icon} ${errType.label}
          </span>
          ${errType.planId ? `<span style="font-size:0.68rem; color:var(--text-muted); font-family:monospace;">${errType.planId}</span>` : ''}
        </div>
      </div>

      <!-- スコアバー -->
      <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(100px,1fr)); gap:10px; margin-top:14px; padding-top:14px; border-top:1px solid var(--border);">
        <div style="text-align:center;">
          <div style="font-size:0.72rem; color:var(--text-muted);">最新 VFE</div>
          <div style="font-size:1.3rem; font-weight:800; color:${_vfeColor(latestVfe)};">${latestVfe}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.72rem; color:var(--text-muted);">平均 VFE</div>
          <div style="font-size:1.3rem; font-weight:800; color:${_vfeColor(avgVfe)};">${avgVfe}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.72rem; color:var(--text-muted);">F' 概算</div>
          <div style="font-size:1.3rem; font-weight:800; color:${_fpColor(latestFp)};">${latestFp}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:0.72rem; color:var(--text-muted);">記録数</div>
          <div style="font-size:1.3rem; font-weight:800; color:#6b7280;">${records.length}</div>
        </div>
      </div>
    </div>
  `;
}

function _vfeColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '#6b7280';
  return n < 30 ? '#059669' : n < 60 ? '#d97706' : '#dc2626';
}

function _fpColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '#6b7280';
  return n > 0.3 ? '#059669' : n < -0.3 ? '#dc2626' : '#d97706';
}

function _getPlayerRecords(playerName) {
  if (!playerName) return [];
  let allRecords = [];
  try { allRecords = JSON.parse(localStorage.getItem('fep_individual_records') || '[]'); } catch (e) {}
  return allRecords.filter(r => r.playerName === playerName);
}

// ══════════════════════════════════════════════════════════
// 個別課題プラン（選手タイプに紐づくプランのみ表示）
// ══════════════════════════════════════════════════════════

function renderErrorPlanCards() {
  const container = document.getElementById('ep-plan-cards');
  const descEl = document.getElementById('ind-plan-desc');
  if (!container) return;

  if (!_indSelectedPlayer || typeof INDIVIDUAL_ERROR_PLANS === 'undefined') {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">選手を選択してください</div>';
    return;
  }

  const errType = IND_ERROR_TYPE_MAP[_indSelectedPlayer.error_type || 'unclassified'] || IND_ERROR_TYPE_MAP.unclassified;

  // タイプに紐づくプランのみ取得
  let plans;
  if (errType.planId) {
    const matchedPlan = getPlanById(errType.planId);
    plans = matchedPlan ? [matchedPlan] : [];
  } else {
    plans = []; // 未分類はプランなし
  }

  // 説明テキスト
  if (descEl) {
    if (plans.length > 0) {
      descEl.textContent = `${_indSelectedPlayer.player_name} のエラータイプ「${errType.icon} ${errType.label}」に基づく課題プランです`;
    } else {
      descEl.textContent = 'エラータイプが未分類のため、課題プランはありません。選手プロフィールでタイプを設定してください。';
    }
  }

  if (plans.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:24px; color:var(--text-muted);">
        <div style="font-size:1.5rem; margin-bottom:8px;">📭</div>
        <p style="font-size:0.88rem;">対応する課題プランがありません</p>
        <button class="sf-btn sf-btn-secondary" style="font-size:0.82rem; margin-top:10px;"
                onclick="showPage('player-profile')">選手プロフィールでタイプを設定</button>
      </div>`;
    return;
  }

  // ポジション
  const posId = (_indSelectedPlayer.position || '').toLowerCase();

  container.innerHTML = `<div style="display:grid; grid-template-columns:1fr; gap:12px;">
    ${plans.map(p => {
      const isOpen = _epOpenPlanId === p.plan_id;
      const posExample = posId && p.position_examples && p.position_examples[posId]
        ? `<div style="font-size:0.78rem; color:${p.color}; margin-top:6px;">📌 ${posId.toUpperCase()}向け: ${p.position_examples[posId]}</div>`
        : '';

      return `
        <div class="menu-card" style="cursor:pointer; border-left:4px solid ${p.color}; ${isOpen ? 'box-shadow:0 0 0 2px ' + p.color + '40;' : ''}"
             onclick="togglePlanDetail('${p.plan_id}')">
          <div class="menu-card-top">
            <div class="menu-card-title">
              <span style="font-size:1.2rem; margin-right:6px;">${p.icon}</span>
              ${p.ui_label || p.plan_name}
            </div>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:0.65rem; font-weight:700; color:${p.color}; background:${p.color}12; border:1px solid ${p.color}30; padding:1px 6px; border-radius:4px; font-family:monospace;">${p.plan_id}</span>
              <span class="time-badge">${p.duration_total}分</span>
            </div>
          </div>
          <div class="menu-card-desc">${p.summary}</div>
          <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;">
            ${[p.problem_main, ...(p.problem_sub || [])].map(code =>
              `<span class="attr-badge" style="background:${p.color}10;color:${p.color};border:1px solid ${p.color}30;font-size:0.65rem;">${code}: ${getProblemLabel(code)}</span>`
            ).join('')}
          </div>
          ${posExample}
          <div style="margin-top:8px; font-size:0.78rem; color:var(--text-muted);">
            タップして詳細を表示 ${isOpen ? '▲' : '▼'}
          </div>
        </div>
      `;
    }).join('')}
  </div>`;
}

function togglePlanDetail(planId) {
  const detailEl = document.getElementById('ep-plan-detail');
  if (!detailEl) return;

  if (_epOpenPlanId === planId) {
    _epOpenPlanId = null;
    detailEl.style.display = 'none';
    detailEl.innerHTML = '';
    renderErrorPlanCards();
    return;
  }

  _epOpenPlanId = planId;
  const plan = getPlanById(planId);
  if (!plan) return;

  renderErrorPlanCards();

  const posId = _indSelectedPlayer ? (_indSelectedPlayer.position || '').toLowerCase() : null;
  const posExample = posId && plan.position_examples && plan.position_examples[posId]
    ? `<div class="sf-alert sf-alert-blue" style="margin-bottom:16px;"><span class="sf-alert-icon">⚽</span><div><strong>${posId.toUpperCase()}向け：</strong>${plan.position_examples[posId]}</div></div>`
    : '';

  detailEl.style.display = 'block';
  detailEl.innerHTML = `
    <div class="sf-card" style="border-left:4px solid ${plan.color}; margin-bottom:24px;">
      <!-- ヘッダー -->
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <div style="width:48px; height:48px; background:${plan.color}15; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.5rem;">${plan.icon}</div>
        <div style="flex:1;">
          <div style="font-size:1.15rem; font-weight:800; color:${plan.color};">
            <span style="font-size:0.72rem; font-weight:700; font-family:monospace; background:${plan.color}12; border:1px solid ${plan.color}30; padding:2px 8px; border-radius:4px; margin-right:8px;">${plan.plan_id}</span>
            ${plan.plan_name}
          </div>
          <div style="font-size:0.82rem; color:var(--text-muted);">${plan.summary} | 合計${plan.duration_total}分</div>
        </div>
        <button onclick="togglePlanDetail('${planId}')" style="background:none;border:none;font-size:1.3rem;cursor:pointer;color:var(--text-muted);">×</button>
      </div>

      ${posExample}

      <div class="sf-grid-2">
        <!-- 左列 -->
        <div>
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:8px; color:${plan.color};">⚠️ よくある現れ方</div>
            <ul style="margin:0; padding-left:18px; font-size:0.82rem; line-height:1.7; color:var(--text-muted);">
              ${(plan.common_signs || []).map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:8px; color:${plan.color};">🔍 背景にある問題</div>
            <ul style="margin:0; padding-left:18px; font-size:0.82rem; line-height:1.7; color:var(--text-muted);">
              ${(plan.background || []).map(s => `<li>${s}</li>`).join('')}
            </ul>
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">
              ${[plan.problem_main, ...(plan.problem_sub || [])].map(code =>
                `<span class="attr-badge" style="background:${plan.color}10;color:${plan.color};border:1px solid ${plan.color}30;">${code}: ${getProblemLabel(code)}</span>`
              ).join('')}
            </div>
          </div>

          <div style="padding:12px 16px; background:${plan.color}08; border-radius:10px; border:1px solid ${plan.color}20;">
            <div style="font-weight:700; font-size:0.82rem; color:${plan.color};">🎯 改善目標</div>
            <div style="font-size:0.92rem; font-weight:600; margin-top:4px;">${plan.improvement_goal}</div>
          </div>
        </div>

        <!-- 右列 -->
        <div>
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:10px; color:${plan.color};">📋 解決プラン</div>
            ${(plan.training_steps || []).map((step, i) => `
              <div style="display:flex; gap:10px; margin-bottom:10px; padding:10px 12px; background:var(--bg); border-radius:10px; border-left:3px solid ${plan.color};">
                <div style="width:28px; height:28px; background:${plan.color}; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; flex-shrink:0;">${i + 1}</div>
                <div style="flex:1;">
                  <div style="font-weight:700; font-size:0.88rem;">${step.title}</div>
                  <div style="font-size:0.78rem; color:var(--text-muted); margin-top:3px; line-height:1.5;">${step.desc}</div>
                  <div style="display:flex; gap:6px; margin-top:6px;">
                    <span class="attr-badge">${step.layer}</span>
                    <span class="time-badge">${step.duration}分</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:8px; color:${plan.color};">✅ 評価ポイント</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              ${(plan.eval_points || []).map(ep => `
                <div style="padding:8px 10px; background:var(--bg); border-radius:8px; font-size:0.78rem; display:flex; align-items:center; gap:6px;">
                  <span style="color:${plan.color};">●</span> ${ep}
                </div>
              `).join('')}
            </div>
          </div>

          <div style="padding:10px 14px; background:#fffbeb; border-radius:10px; border:1px solid #fcd34d;">
            <div style="font-size:0.75rem; font-weight:700; color:#92400e;">💡 コーチングメモ</div>
            <div style="font-size:0.82rem; color:#78350f; margin-top:3px;">${plan.coaching_note}</div>
          </div>

          ${plan.note_for_player ? `
          <div style="padding:10px 14px; background:#f0fdf4; border-radius:10px; border:1px solid #86efac; margin-top:8px;">
            <div style="font-size:0.75rem; font-weight:700; color:#065f46;">🏃 選手への説明</div>
            <div style="font-size:0.82rem; color:#064e3b; margin-top:3px;">${plan.note_for_player}</div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ══════════════════════════════════════════════════════════
// 選手別カスタムメニュー
// ══════════════════════════════════════════════════════════

function switchIndTab(tab, btn) {
  _currentIndTab = tab;
  document.querySelectorAll('[id^="ind-tab-"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderIndMenus();
}

function getIndMenus(playerId) {
  try { return JSON.parse(localStorage.getItem('fep_ind_menus_' + playerId) || '[]'); } catch (e) { return []; }
}
function saveIndMenus(playerId, menus) {
  localStorage.setItem('fep_ind_menus_' + playerId, JSON.stringify(menus));
}

function renderIndMenus() {
  const container = document.getElementById('ind-menu-list');
  if (!container || !_indSelectedPlayer) return;

  const playerId = _indSelectedPlayer.id;
  const menus = getIndMenus(playerId).filter(m => m.category === _currentIndTab);

  if (menus.length === 0) {
    const catLabels = { rehab: 'リハビリ', skill: 'スキル強化', condition: 'コンディション', custom: 'カスタム' };
    container.innerHTML = `<div style="text-align:center; padding:24px 16px; color:var(--text-muted); font-size:0.85rem;">${catLabels[_currentIndTab] || _currentIndTab}メニューがまだありません</div>`;
    return;
  }

  container.innerHTML = menus.map((m, i) => `
    <div style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; border-bottom:1px solid var(--border);">
      <div style="flex:1;">
        <div style="font-weight:700; font-size:0.9rem;">${m.name}</div>
        <div style="display:flex; gap:5px; flex-wrap:wrap; margin-top:4px;">
          <span class="attr-badge">${m.layer || 'L1'}</span>
          ${(m.purpose || []).map(p => `<span class="attr-badge" style="background:#dbeafe;color:#1e40af;">${p}</span>`).join('')}
          <span class="time-badge">${m.duration || 15}分</span>
        </div>
        ${m.notes ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px; line-height:1.4;">${m.notes}</div>` : ''}
      </div>
      <button style="background:none; border:none; font-size:1rem; cursor:pointer; color:#dc2626; padding:2px 4px;" onclick="deleteIndMenu(${i})" title="削除">🗑</button>
    </div>
  `).join('');
}

function openAddIndMenu() {
  if (!_indSelectedPlayer) { alert('選手を選択してください。'); return; }
  document.getElementById('ind-add-modal').style.display = 'flex';
  document.getElementById('ind-new-name').value = '';
  document.getElementById('ind-new-notes').value = '';
  document.getElementById('ind-new-category').value = _currentIndTab;
  document.querySelectorAll('#ind-new-purpose .sf-chip').forEach(c => c.classList.remove('active'));
}
function closeAddIndMenu() { document.getElementById('ind-add-modal').style.display = 'none'; }

function saveNewIndMenu() {
  const name = document.getElementById('ind-new-name')?.value?.trim();
  if (!name) { alert('メニュー名を入力してください。'); return; }
  if (!_indSelectedPlayer) { alert('選手を選択してください。'); return; }

  const purpose = Array.from(document.querySelectorAll('#ind-new-purpose .sf-chip.active')).map(c => c.dataset.value);
  const menu = {
    name,
    category: document.getElementById('ind-new-category')?.value || 'custom',
    layer: document.querySelector('input[name="ind-new-layer"]:checked')?.value || 'L1',
    purpose,
    duration: parseInt(document.getElementById('ind-new-duration')?.value ?? 15),
    notes: document.getElementById('ind-new-notes')?.value || '',
    createdAt: new Date().toISOString(),
  };

  const playerId = _indSelectedPlayer.id;
  const menus = getIndMenus(playerId);
  menus.push(menu);
  saveIndMenus(playerId, menus);
  closeAddIndMenu();
  renderIndMenus();
}

function deleteIndMenu(index) {
  if (!confirm('このメニューを削除しますか？')) return;
  if (!_indSelectedPlayer) return;
  const playerId = _indSelectedPlayer.id;
  const menus = getIndMenus(playerId);
  const filtered = menus.filter(m => m.category === _currentIndTab);
  const globalIndex = menus.indexOf(filtered[index]);
  if (globalIndex >= 0) { menus.splice(globalIndex, 1); saveIndMenus(playerId, menus); renderIndMenus(); }
}
