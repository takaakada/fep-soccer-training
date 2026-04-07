// ══════════════════════════════════════════════════════════
// INDIVIDUAL PAGE  (js/individual.js)
// ══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// エラーパターン プラン表示
// ═══════════════════════════════════════════════════════════
let _epFilterPos = 'all';
let _epOpenPlanId = null;

function initIndividualPage() {
  renderErrorPlanCards();
  loadPlayerList();
}

function filterErrorPlans(pos, btn) {
  _epFilterPos = pos;
  document.querySelectorAll('[id^="ep-filter-"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderErrorPlanCards();
}

function renderErrorPlanCards() {
  const container = document.getElementById('ep-plan-cards');
  if (!container || typeof INDIVIDUAL_ERROR_PLANS === 'undefined') {
    if (container) container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">プランデータ読み込み中...</div>';
    return;
  }

  const plans = _epFilterPos === 'all'
    ? getActivePlans()
    : getPlansByPosition(_epFilterPos);

  container.innerHTML = `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:12px;">
    ${plans.map(p => {
      const isOpen = _epOpenPlanId === p.plan_id;
      const problems = [p.problem_main, ...(p.problem_sub || [])].map(code => getProblemLabel(code)).join(', ');
      const posExample = _epFilterPos !== 'all' && p.position_examples[_epFilterPos]
        ? `<div style="font-size:0.75rem; color:${p.color}; margin-top:4px;">例: ${p.position_examples[_epFilterPos]}</div>`
        : '';

      return `
        <div class="menu-card" style="cursor:pointer; border-left:4px solid ${p.color}; ${isOpen ? 'box-shadow:0 0 0 2px ' + p.color + '40;' : ''}"
             onclick="togglePlanDetail('${p.plan_id}')">
          <div class="menu-card-top">
            <div class="menu-card-title">
              <span style="font-size:1.2rem; margin-right:6px;">${p.icon}</span>
              ${p.ui_label}
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

  renderErrorPlanCards(); // update card highlight

  const posId = _epFilterPos !== 'all' ? _epFilterPos : null;
  const posExample = posId && plan.position_examples[posId]
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
          <!-- よくある現れ方 -->
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:8px; color:${plan.color};">⚠️ よくある現れ方</div>
            <ul style="margin:0; padding-left:18px; font-size:0.82rem; line-height:1.7; color:var(--text-muted);">
              ${plan.common_signs.map(s => `<li>${s}</li>`).join('')}
            </ul>
          </div>

          <!-- 背景にある問題 -->
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:8px; color:${plan.color};">🔍 背景にある問題</div>
            <ul style="margin:0; padding-left:18px; font-size:0.82rem; line-height:1.7; color:var(--text-muted);">
              ${plan.background.map(s => `<li>${s}</li>`).join('')}
            </ul>
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:8px;">
              ${[plan.problem_main, ...(plan.problem_sub || [])].map(code =>
                `<span class="attr-badge" style="background:${plan.color}10;color:${plan.color};border:1px solid ${plan.color}30;">${code}: ${getProblemLabel(code)}</span>`
              ).join('')}
            </div>
          </div>

          <!-- 改善目標 -->
          <div style="padding:12px 16px; background:${plan.color}08; border-radius:10px; border:1px solid ${plan.color}20;">
            <div style="font-weight:700; font-size:0.82rem; color:${plan.color};">🎯 改善目標</div>
            <div style="font-size:0.92rem; font-weight:600; margin-top:4px;">${plan.improvement_goal}</div>
          </div>
        </div>

        <!-- 右列 -->
        <div>
          <!-- 解決プラン（ステップ） -->
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:10px; color:${plan.color};">📋 解決プラン</div>
            ${plan.training_steps.map((step, i) => `
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

          <!-- 評価ポイント -->
          <div style="margin-bottom:16px;">
            <div style="font-weight:700; font-size:0.88rem; margin-bottom:8px; color:${plan.color};">✅ 評価ポイント</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
              ${plan.eval_points.map(ep => `
                <div style="padding:8px 10px; background:var(--bg); border-radius:8px; font-size:0.78rem; display:flex; align-items:center; gap:6px;">
                  <span style="color:${plan.color};">●</span> ${ep}
                </div>
              `).join('')}
            </div>
          </div>

          <!-- コーチングメモ -->
          <div style="padding:10px 14px; background:#fffbeb; border-radius:10px; border:1px solid #fcd34d;">
            <div style="font-size:0.75rem; font-weight:700; color:#92400e;">💡 コーチングメモ</div>
            <div style="font-size:0.82rem; color:#78350f; margin-top:3px;">${plan.coaching_note}</div>
          </div>

          <!-- 選手向けメモ -->
          <div style="padding:10px 14px; background:#f0fdf4; border-radius:10px; border:1px solid #86efac; margin-top:8px;">
            <div style="font-size:0.75rem; font-weight:700; color:#065f46;">🏃 選手への説明</div>
            <div style="font-size:0.82rem; color:#064e3b; margin-top:3px;">${plan.note_for_player}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Scroll to detail
  detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ═══════════════════════════════════════════════════════════
// 選手別カスタムメニュー（旧機能維持）
// ═══════════════════════════════════════════════════════════
let _currentPlayerId = '';
let _currentIndTab = 'rehab';

function loadPlayerList() {
  const select = document.getElementById('ind-player-select');
  if (!select) return;
  const players = getPlayers();
  const prevVal = select.value;
  select.innerHTML = '<option value="">-- 選手を選択 --</option>';
  players.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name}（${p.position}）`;
    select.appendChild(opt);
  });
  if (prevVal) select.value = prevVal;
}

function getPlayers() {
  try { return JSON.parse(localStorage.getItem('fep_players') || '[]'); } catch(e) { return []; }
}
function savePlayers(players) {
  localStorage.setItem('fep_players', JSON.stringify(players));
}

function addNewPlayer() {
  document.getElementById('ind-new-player-modal').style.display = 'flex';
  document.getElementById('ind-np-name').value = '';
  document.getElementById('ind-np-notes').value = '';
}

function saveNewPlayer() {
  const name = document.getElementById('ind-np-name')?.value?.trim();
  if (!name) { alert('選手名を入力してください。'); return; }
  const players = getPlayers();
  const player = { id: 'p_' + Date.now(), name, position: document.getElementById('ind-np-position')?.value || 'MF', notes: document.getElementById('ind-np-notes')?.value || '', createdAt: new Date().toISOString() };
  players.push(player);
  savePlayers(players);
  document.getElementById('ind-new-player-modal').style.display = 'none';
  loadPlayerList();
  document.getElementById('ind-player-select').value = player.id;
  onPlayerSelect();
}

function onPlayerSelect() {
  const select = document.getElementById('ind-player-select');
  _currentPlayerId = select?.value || '';
  if (!_currentPlayerId) {
    document.getElementById('ind-empty').style.display = 'block';
    document.getElementById('ind-content').style.display = 'none';
    return;
  }
  document.getElementById('ind-empty').style.display = 'none';
  document.getElementById('ind-content').style.display = 'block';
  const players = getPlayers();
  const player = players.find(p => p.id === _currentPlayerId);
  if (player) {
    document.getElementById('ind-player-name').textContent = player.name;
    document.getElementById('ind-player-info').textContent = `${player.position} | ${player.notes || '特記事項なし'} | 登録: ${player.createdAt?.slice(0, 10) || '--'}`;
  }
  renderIndMenus();
}

function switchIndTab(tab, btn) {
  _currentIndTab = tab;
  document.querySelectorAll('[id^="ind-tab-"]').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderIndMenus();
}

function getIndMenus(playerId) {
  try { return JSON.parse(localStorage.getItem('fep_ind_menus_' + playerId) || '[]'); } catch(e) { return []; }
}
function saveIndMenus(playerId, menus) {
  localStorage.setItem('fep_ind_menus_' + playerId, JSON.stringify(menus));
}

function renderIndMenus() {
  const container = document.getElementById('ind-menu-list');
  if (!container || !_currentPlayerId) return;
  const menus = getIndMenus(_currentPlayerId).filter(m => m.category === _currentIndTab);
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
  if (!_currentPlayerId) { alert('選手を選択してください。'); return; }
  const purpose = Array.from(document.querySelectorAll('#ind-new-purpose .sf-chip.active')).map(c => c.dataset.value);
  const menu = { name, category: document.getElementById('ind-new-category')?.value || 'custom', layer: document.querySelector('input[name="ind-new-layer"]:checked')?.value || 'L1', purpose, duration: parseInt(document.getElementById('ind-new-duration')?.value ?? 15), notes: document.getElementById('ind-new-notes')?.value || '', createdAt: new Date().toISOString() };
  const menus = getIndMenus(_currentPlayerId);
  menus.push(menu);
  saveIndMenus(_currentPlayerId, menus);
  closeAddIndMenu();
  renderIndMenus();
}

function deleteIndMenu(index) {
  if (!confirm('このメニューを削除しますか？')) return;
  const menus = getIndMenus(_currentPlayerId);
  const filtered = menus.filter(m => m.category === _currentIndTab);
  const globalIndex = menus.indexOf(filtered[index]);
  if (globalIndex >= 0) { menus.splice(globalIndex, 1); saveIndMenus(_currentPlayerId, menus); renderIndMenus(); }
}
