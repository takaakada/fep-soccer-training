// ══════════════════════════════════════════════════════════
// PLAYER PROFILE PAGE  (js/player-profile.js)
// チーム別選手管理 + エラータイプ分類 + トレーニング提案
// ══════════════════════════════════════════════════════════

let _ppSelectedTeam = '';
let _ppSelectedPlayerId = '';

// ── エラータイプ定義（individual-plans.jsのerror_typeに対応）──
const ERROR_TYPE_MAP = {
  reaction_delay:       { label: '反応遅れ型',   icon: '⏱️', color: '#dc2626', planId: 'IND-001' },
  information_overload: { label: '情報混乱型',   icon: '🌀', color: '#ea580c', planId: 'IND-002' },
  correction_confusion: { label: '修正迷子型',   icon: '🔄', color: '#7c3aed', planId: 'IND-003' },
  change_freeze:        { label: '変化フリーズ型', icon: '🧊', color: '#2563eb', planId: 'IND-004' },
  emotional_drag:       { label: '感情引きずり型', icon: '💔', color: '#be185d', planId: 'IND-005' },
  unclassified:         { label: '未分類',       icon: '❓', color: '#6b7280', planId: null },
};

function initPlayerProfilePage() {
  loadTeamList();
}

// ══════════════════════════════════════════════════════════
// チーム一覧読み込み（Supabase → localStorage fallback）
// ══════════════════════════════════════════════════════════

async function loadTeamList() {
  const container = document.getElementById('pp-team-list');
  if (!container) return;

  let players = await fetchAllPlayers();
  // チーム名をユニーク抽出
  const teams = [...new Set(players.map(p => p.team_name))].sort();

  if (teams.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:30px 20px; color:var(--text-muted);">
        <div style="font-size:1.5rem; margin-bottom:8px;">📭</div>
        <p>登録チームがありません</p>
        <p style="font-size:0.82rem; margin-top:6px;">選手がログインするとチームが自動作成されます</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px;">
      ${teams.map(t => {
        const count = players.filter(p => p.team_name === t).length;
        const isActive = _ppSelectedTeam === t;
        return `
          <div class="menu-card" style="cursor:pointer; padding:14px 16px; ${isActive ? 'border-left:4px solid #2563eb; background:#eff6ff;' : ''}"
               onclick="selectTeam('${t.replace(/'/g, "\\'")}')">
            <div style="font-weight:700; font-size:0.95rem;">🏟️ ${t}</div>
            <div style="font-size:0.78rem; color:var(--text-muted); margin-top:4px;">${count}名の選手</div>
          </div>`;
      }).join('')}
    </div>`;
}

async function fetchAllPlayers() {
  let supabasePlayers = [];
  let localPlayers = [];

  // Supabaseから取得
  if (typeof sbFep !== 'undefined' && sbFep) {
    try {
      const { data, error } = await sbFep
        .from('players')
        .select('*')
        .order('team_name', { ascending: true })
        .order('player_name', { ascending: true });
      if (!error && data) supabasePlayers = data;
    } catch(e) {
      console.warn('fetchAllPlayers Supabase error:', e);
    }
  }

  // localStorageからも取得（マージ）
  try {
    localPlayers = JSON.parse(localStorage.getItem('fep_players') || '[]');
  } catch(e) {}

  // Supabaseにあるデータ優先、ローカルのみのデータも含める
  if (supabasePlayers.length > 0) {
    // Supabase IDセットを作成
    const sbIds = new Set(supabasePlayers.map(p => p.id));
    // ローカルのみの選手（Supabaseにない）を追加
    const localOnly = localPlayers.filter(p => !sbIds.has(p.id));
    return [...supabasePlayers, ...localOnly];
  }

  return localPlayers;
}

// ══════════════════════════════════════════════════════════
// チーム選択 → 選手一覧表示
// ══════════════════════════════════════════════════════════

async function selectTeam(teamName) {
  _ppSelectedTeam = teamName;
  _ppSelectedPlayerId = '';

  // チームリスト再描画（ハイライト更新）
  await loadTeamList();

  // 選手一覧表示
  const rosterEl = document.getElementById('pp-roster');
  const detailEl = document.getElementById('pp-detail');
  if (detailEl) detailEl.style.display = 'none';

  let players = await fetchAllPlayers();
  const teamPlayers = players.filter(p => p.team_name === teamName);

  if (!rosterEl) return;
  rosterEl.style.display = 'block';
  document.getElementById('pp-roster-team-name').textContent = teamName;

  const listEl = document.getElementById('pp-roster-list');
  if (!listEl) return;

  listEl.innerHTML = `
    <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
      <thead>
        <tr style="border-bottom:2px solid var(--border); text-align:left;">
          <th style="padding:8px 10px; font-weight:700; width:60px;">背番号</th>
          <th style="padding:8px 10px; font-weight:700;">選手名</th>
          <th style="padding:8px 10px; font-weight:700; width:50px;">Pos</th>
          <th style="padding:8px 10px; font-weight:700;">タイプ</th>
          <th style="padding:8px 10px; font-weight:700; width:50px;"></th>
        </tr>
      </thead>
      <tbody>
        ${teamPlayers.map(p => {
          const errType = ERROR_TYPE_MAP[p.error_type || 'unclassified'] || ERROR_TYPE_MAP.unclassified;
          return `
            <tr style="border-bottom:1px solid var(--border); cursor:pointer;" onclick="selectPlayer('${p.id}')">
              <td style="padding:8px 10px; font-weight:700; color:#2563eb; font-size:1.05rem;">${p.jersey_number || '--'}</td>
              <td style="padding:8px 10px; font-weight:600;">${p.player_name}</td>
              <td style="padding:8px 10px; color:var(--text-muted);">${p.position || '--'}</td>
              <td style="padding:8px 10px;">
                <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; padding:2px 8px; border-radius:10px; background:${errType.color}10; color:${errType.color}; border:1px solid ${errType.color}25;">
                  ${errType.icon} ${errType.label}
                </span>
              </td>
              <td style="padding:8px 10px; text-align:center;">
                <span style="font-size:0.85rem; color:#2563eb;">▶</span>
              </td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
    <div style="text-align:center; margin-top:12px;">
      <button class="sf-btn sf-btn-secondary" style="font-size:0.82rem;" onclick="openAddPlayerModal()">＋ 選手を追加</button>
    </div>`;
}

// ══════════════════════════════════════════════════════════
// 選手詳細表示
// ══════════════════════════════════════════════════════════

async function selectPlayer(playerId) {
  _ppSelectedPlayerId = playerId;

  const players = await fetchAllPlayers();
  const player = players.find(p => p.id === playerId);
  if (!player) return;

  const detailEl = document.getElementById('pp-detail');
  if (!detailEl) return;
  detailEl.style.display = 'block';

  const errType = ERROR_TYPE_MAP[player.error_type || 'unclassified'] || ERROR_TYPE_MAP.unclassified;

  // 記録データ取得
  const records = getPlayerRecords(player.player_name);

  // 統計計算
  const vfeValues = records.filter(r => r.vfe_display != null).map(r => r.vfe_display);
  const avgVfe = vfeValues.length > 0 ? (vfeValues.reduce((a,b)=>a+b,0) / vfeValues.length).toFixed(1) : '--';
  const latest = records[0];
  const latestVfe = latest?.vfe_display != null ? latest.vfe_display.toFixed(1) : '--';
  const latestFp = latest?.dr != null ? (((latest.dr-5)/2.5 + (latest.uh-5)/2.5 + (latest.fh-5)/2.5)/3).toFixed(2) : '--';

  // 推奨プラン
  const suggestedPlan = errType.planId && typeof getPlanById === 'function' ? getPlanById(errType.planId) : null;

  detailEl.innerHTML = `
    <!-- 選手カード -->
    <div class="sf-card" style="border-left:4px solid ${errType.color};">
      <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap;">
        <div style="width:60px; height:60px; background:linear-gradient(135deg, ${errType.color}, ${errType.color}88); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:1.5rem; color:white; font-weight:800;">
          ${player.jersey_number || '?'}
        </div>
        <div style="flex:1;">
          <div style="font-size:1.3rem; font-weight:800;">${player.player_name}</div>
          <div style="font-size:0.88rem; color:var(--text-muted);">${player.team_name} | ${player.position || '--'}</div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
          <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.85rem; padding:4px 12px; border-radius:12px; background:${errType.color}12; color:${errType.color}; border:1px solid ${errType.color}30; font-weight:700;">
            ${errType.icon} ${errType.label}
          </span>
          ${errType.planId ? `<span style="font-size:0.65rem; color:var(--text-muted); font-family:monospace;">${errType.planId}</span>` : ''}
        </div>
        <button class="sf-btn sf-btn-secondary" style="font-size:0.78rem; padding:6px 10px;" onclick="openEditPlayerModal('${playerId}')">✏️ 編集</button>
      </div>
    </div>

    <div class="sf-grid-2">
      <!-- ══ 左列：スコア + 統計 ══ -->
      <div>
        <div class="sf-card sf-preview-card">
          <div class="sf-card-title">🎯 最新スコア</div>
          <div class="sf-preview-grid" style="grid-template-columns:repeat(3,1fr);">
            <div class="sf-preview-item">
              <div class="sf-preview-label">VFE</div>
              <div class="sf-preview-val">${latestVfe}</div>
              <div class="sf-preview-sub">最新</div>
            </div>
            <div class="sf-preview-item">
              <div class="sf-preview-label">F'概算</div>
              <div class="sf-preview-val">${latestFp}</div>
              <div class="sf-preview-sub">dr/uh/fh</div>
            </div>
            <div class="sf-preview-item">
              <div class="sf-preview-label">平均VFE</div>
              <div class="sf-preview-val">${avgVfe}</div>
              <div class="sf-preview-sub">全${records.length}回</div>
            </div>
          </div>
        </div>

        <!-- VFE Chart -->
        <div class="sf-card">
          <div class="sf-card-title">📊 VFE 推移</div>
          <div id="pp-vfe-chart" style="display:flex; align-items:flex-end; gap:4px; height:140px; padding:8px 0;"></div>
        </div>
      </div>

      <!-- ══ 右列：タイプ別トレーニング提案 ══ -->
      <div>
        ${suggestedPlan ? `
        <div class="sf-card" style="border-left:4px solid ${suggestedPlan.color};">
          <div class="sf-card-title" style="color:${suggestedPlan.color};">💡 推奨トレーニングプラン</div>
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
            <div style="width:40px; height:40px; background:${suggestedPlan.color}15; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.2rem;">${suggestedPlan.icon}</div>
            <div style="flex:1;">
              <div style="font-weight:700; font-size:0.95rem;">
                <span style="font-size:0.65rem; font-family:monospace; background:${suggestedPlan.color}12; border:1px solid ${suggestedPlan.color}30; padding:1px 6px; border-radius:4px; margin-right:6px;">${suggestedPlan.plan_id}</span>
                ${suggestedPlan.plan_name}
              </div>
              <div style="font-size:0.78rem; color:var(--text-muted);">${suggestedPlan.summary}</div>
            </div>
            <span class="time-badge">${suggestedPlan.duration_total}分</span>
          </div>
          <div style="font-size:0.82rem; font-weight:600; margin-bottom:8px;">🎯 ${suggestedPlan.improvement_goal}</div>
          ${suggestedPlan.training_steps.map((step, i) => `
            <div style="display:flex; gap:8px; margin-bottom:6px; padding:8px 10px; background:var(--bg); border-radius:8px; border-left:3px solid ${suggestedPlan.color};">
              <div style="width:22px; height:22px; background:${suggestedPlan.color}; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.65rem; font-weight:800; flex-shrink:0;">${i+1}</div>
              <div style="flex:1;">
                <div style="font-weight:600; font-size:0.82rem;">${step.title}</div>
                <div style="font-size:0.72rem; color:var(--text-muted);">${step.layer} | ${step.duration}分</div>
              </div>
            </div>
          `).join('')}
          <div style="margin-top:10px; padding:8px 12px; background:#fffbeb; border-radius:8px; border:1px solid #fcd34d;">
            <div style="font-size:0.72rem; font-weight:700; color:#92400e;">💡 ${suggestedPlan.coaching_note}</div>
          </div>
        </div>
        ` : `
        <div class="sf-card">
          <div class="sf-card-title">💡 トレーニング提案</div>
          <div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.88rem;">
            エラータイプを設定すると、推奨プランが表示されます
          </div>
        </div>
        `}

        <!-- F' Chart -->
        <div class="sf-card">
          <div class="sf-card-title">🧠 F' 推移</div>
          <div id="pp-fprime-chart" style="display:flex; align-items:flex-end; gap:4px; height:100px; padding:8px 0;"></div>
        </div>
      </div>
    </div>

    <!-- 記録一覧 -->
    <div class="sf-card">
      <div class="sf-card-title">📋 記録一覧</div>
      <div id="pp-record-list" style="max-height:400px; overflow-y:auto;"></div>
    </div>
  `;

  // チャート描画
  renderProfileVfeChart(records);
  renderProfileFPrimeChart(records);
  renderProfileRecordList(records);

  detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ══════════════════════════════════════════════════════════
// チャート・記録一覧描画
// ══════════════════════════════════════════════════════════

function getPlayerRecords(playerName) {
  if (!playerName) return [];
  let allRecords = [];
  try { allRecords = JSON.parse(localStorage.getItem('fep_individual_records') || '[]'); } catch(e) {}
  return allRecords.filter(r => r.playerName === playerName);
}

function renderProfileVfeChart(records) {
  const container = document.getElementById('pp-vfe-chart');
  if (!container) return;
  const withVfe = records.filter(r => r.vfe_display != null).slice(0, 20).reverse();
  if (withVfe.length === 0) {
    container.innerHTML = '<div style="text-align:center; width:100%; color:var(--text-muted); font-size:0.85rem;">記録データなし</div>';
    return;
  }
  container.innerHTML = withVfe.map(r => {
    const h = Math.max(4, (r.vfe_display / 100) * 120);
    const color = r.vfe_display < 30 ? '#059669' : r.vfe_display < 60 ? '#d97706' : '#dc2626';
    return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:2px;">
      <div style="font-size:0.6rem; color:var(--text-muted);">${r.vfe_display.toFixed(0)}</div>
      <div style="width:100%; max-width:20px; height:${h}px; background:${color}; border-radius:3px 3px 0 0;"></div>
      <div style="font-size:0.55rem; color:var(--text-muted);">${(r.date || '').slice(5)}</div>
    </div>`;
  }).join('');
}

function renderProfileFPrimeChart(records) {
  const container = document.getElementById('pp-fprime-chart');
  if (!container) return;
  const withFP = records.filter(r => r.dr != null).slice(0, 20).reverse();
  if (withFP.length === 0) {
    container.innerHTML = '<div style="text-align:center; width:100%; color:var(--text-muted); font-size:0.85rem;">記録データなし</div>';
    return;
  }
  container.innerHTML = withFP.map(r => {
    const fp = ((r.dr - 5) / 2.5 + (r.uh - 5) / 2.5 + (r.fh - 5) / 2.5) / 3;
    const normalized = (fp + 2) / 4;
    const h = Math.max(4, normalized * 80);
    const color = fp > 0.3 ? '#059669' : fp < -0.3 ? '#dc2626' : '#d97706';
    return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:2px;">
      <div style="font-size:0.6rem; color:var(--text-muted);">${fp.toFixed(1)}</div>
      <div style="width:100%; max-width:20px; height:${h}px; background:${color}; border-radius:3px 3px 0 0;"></div>
      <div style="font-size:0.55rem; color:var(--text-muted);">${(r.date || '').slice(5)}</div>
    </div>`;
  }).join('');
}

function renderProfileRecordList(records) {
  const container = document.getElementById('pp-record-list');
  if (!container) return;
  if (records.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">記録データなし</div>';
    return;
  }
  container.innerHTML = records.map((r, i) => {
    const vfeColor = r.vfe_display != null ? (r.vfe_display < 40 ? '#059669' : r.vfe_display < 60 ? '#d97706' : '#dc2626') : '#888';
    const fp = r.dr != null ? ((r.dr-5)/2.5 + (r.uh-5)/2.5 + (r.fh-5)/2.5)/3 : null;
    return `<div style="display:flex; align-items:center; gap:12px; padding:10px 12px; border-bottom:1px solid var(--border); ${i===0 ? 'background:#f0fdf4;' : ''}">
      <div style="font-size:0.82rem; color:var(--text-muted); min-width:80px;">${r.date || '--'}</div>
      <div style="font-size:1.05rem; font-weight:800; color:${vfeColor}; min-width:50px;">${r.vfe_display != null ? r.vfe_display.toFixed(1) : '--'}</div>
      <div style="font-size:0.78rem; color:var(--text-muted); flex:1;">${r.menuName || ''} ${fp != null ? `| F'=${fp.toFixed(2)}` : ''}</div>
      ${i === 0 ? '<span style="font-size:0.72rem; background:#059669; color:white; padding:2px 8px; border-radius:99px; font-weight:700;">最新</span>' : ''}
    </div>`;
  }).join('');
}

// ══════════════════════════════════════════════════════════
// 選手追加・編集モーダル
// ══════════════════════════════════════════════════════════

function openAddPlayerModal() {
  document.getElementById('pp-modal-title').textContent = '選手を追加';
  document.getElementById('pp-modal-player-id').value = '';
  document.getElementById('pp-modal-name').value = '';
  document.getElementById('pp-modal-jersey').value = '';
  document.getElementById('pp-modal-position').value = 'MF';
  document.getElementById('pp-modal-error-type').value = 'unclassified';
  document.getElementById('pp-modal-team').value = _ppSelectedTeam;
  document.getElementById('pp-player-modal').style.display = 'flex';
}

async function openEditPlayerModal(playerId) {
  const players = await fetchAllPlayers();
  const p = players.find(pl => pl.id === playerId);
  if (!p) return;

  document.getElementById('pp-modal-title').textContent = '選手を編集';
  document.getElementById('pp-modal-player-id').value = p.id;
  document.getElementById('pp-modal-name').value = p.player_name;
  document.getElementById('pp-modal-jersey').value = p.jersey_number || '';
  document.getElementById('pp-modal-position').value = p.position || 'MF';
  document.getElementById('pp-modal-error-type').value = p.error_type || 'unclassified';
  document.getElementById('pp-modal-team').value = p.team_name;
  document.getElementById('pp-player-modal').style.display = 'flex';
}

function closePlayerModal() {
  document.getElementById('pp-player-modal').style.display = 'none';
}

async function savePlayerFromModal() {
  const id = document.getElementById('pp-modal-player-id').value;
  const teamName = document.getElementById('pp-modal-team').value.trim();
  const playerName = document.getElementById('pp-modal-name').value.trim();
  const jerseyNumber = document.getElementById('pp-modal-jersey').value.trim();
  const position = document.getElementById('pp-modal-position').value;
  const errorType = document.getElementById('pp-modal-error-type').value;

  if (!playerName) { alert('選手名を入力してください。'); return; }
  if (!teamName) { alert('チーム名を入力してください。'); return; }

  const row = {
    team_name: teamName,
    player_name: playerName,
    jersey_number: jerseyNumber || null,
    position: position,
    error_type: errorType === 'unclassified' ? null : errorType,
  };

  if (typeof sbFep !== 'undefined' && sbFep) {
    try {
      if (id) {
        // 更新
        const { error } = await sbFep.from('players').update(row).eq('id', id);
        if (error) console.error('Player update error:', error);
      } else {
        // 新規作成
        const { error } = await sbFep.from('players').insert(row);
        if (error) console.error('Player insert error:', error);
      }
    } catch(e) {
      console.error('Player save Supabase error:', e);
    }
  } else {
    // localStorage fallback
    let players = [];
    try { players = JSON.parse(localStorage.getItem('fep_players') || '[]'); } catch(e) {}
    if (id) {
      const idx = players.findIndex(p => p.id === id);
      if (idx >= 0) Object.assign(players[idx], row);
    } else {
      row.id = 'local_' + Date.now();
      row.created_at = new Date().toISOString();
      players.push(row);
    }
    localStorage.setItem('fep_players', JSON.stringify(players));
  }

  closePlayerModal();
  await selectTeam(teamName);
}
