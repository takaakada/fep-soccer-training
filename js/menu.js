// ══════════════════════════════════════════════════════════
// LEVEL MENU FUNCTIONS  (js/menu.js)
// ══════════════════════════════════════════════════════════

const LEVEL_KEYS = ['l1', 'l2', 'l3', 'custom'];

// ─── プランラベル（年代別）───────────────────────────────────
const PLAN_LABELS = {
  elem:   ['あそびながら', 'しっかり基礎', '試合につながる', 'カスタム'],
  junior: ['基礎再現',     '判断強化',     '実戦発展',       'カスタム'],
  pro:    ['ベース調整',   '実戦最適化',   '高強度対応',     'カスタム'],
};

// ─── 年代グループ管理 ───────────────────────────────────────
let currentAgeGroup = 'elem'; // 'elem' | 'junior' | 'pro'
let currentLevelId  = 'l1';
let isEditMode      = false;

function switchAgeGroup(ageId, btn) {
  // 現在のデータを保存してから切り替え
  LEVEL_KEYS.forEach(lvl => _saveLevelMenuSilent(lvl));

  currentAgeGroup = ageId;
  currentLevelId  = 'l1';

  document.querySelectorAll('.age-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  loadSavedLevelMenus();
  normalizeAllMenuCards();
  updateLevelTabLabels();

  // Level タブをリセット
  switchLevelTab('l1', document.querySelector('#level-tabs .tab-btn[data-level="l1"]'));

  renderPlanSelector();
  renderSessionList();
}

// ─── カテゴリ定義 ───────────────────────────────────────────
const CAT_OPTIONS = [
  { v: 'warm',   l: 'ウォームアップ' },
  { v: 'tech',   l: '技術' },
  { v: 'tactic', l: '戦術' },
  { v: 'phys',   l: 'フィジカル' },
  { v: 'cool',   l: 'クールダウン' },
];

function catSelectHtml(selected) {
  return CAT_OPTIONS.map(c => {
    const sel = (c.l === selected || c.v === selected) ? ' selected' : '';
    return `<option value="${c.v}"${sel}>${c.l}</option>`;
  }).join('');
}

function catLabelFromValue(val) {
  const found = CAT_OPTIONS.find(c => c.v === val);
  return found ? found.l : val;
}

// ─── HTML エスケープ ────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── レベルタブラベル更新 ────────────────────────────────────
function updateLevelTabLabels() {
  const labels = PLAN_LABELS[currentAgeGroup] || PLAN_LABELS.elem;
  LEVEL_KEYS.forEach((key, i) => {
    const el = document.getElementById('lname-' + key);
    if (el) el.textContent = labels[i];
  });
}

// ─── レベル名（後方互換 - 使用しなくなったが残す）──────────────
function loadLevelNames() {
  updateLevelTabLabels();
}

// ─── レベルタブ切替 ─────────────────────────────────────────
function switchLevelTab(levelId, btn) {
  document.querySelectorAll('.level-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('#level-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('level-' + levelId);
  if (el) el.style.display = 'block';
  // activate the clicked button (or find by data-level)
  const targetBtn = btn || document.querySelector(`#level-tabs .tab-btn[data-level="${levelId}"]`);
  if (targetBtn) targetBtn.classList.add('active');
}

// ─── 編集モード切替 ─────────────────────────────────────────
function toggleEditMode() {
  isEditMode = !isEditMode;
  const wrapper = document.getElementById('menu-page-wrapper');
  const btn     = document.getElementById('edit-mode-btn');
  if (!wrapper || !btn) return;

  if (isEditMode) {
    wrapper.classList.add('edit-mode');
    btn.textContent = '✓ 完了';
    btn.classList.add('is-active');
    // 編集エリアをカレントレベルに合わせる
    switchLevelTab(currentLevelId, null);
  } else {
    wrapper.classList.remove('edit-mode');
    btn.textContent = '✏️ 編集';
    btn.classList.remove('is-active');
    // 閲覧ビューをリフレッシュ
    normalizeAllMenuCards();
    renderSessionList();
  }
}

// ─── プランセレクター描画 ────────────────────────────────────
function renderPlanSelector() {
  const container = document.getElementById('plan-selector');
  if (!container) return;

  const labels = PLAN_LABELS[currentAgeGroup] || PLAN_LABELS.elem;

  // おすすめ（l1）
  const recKey   = 'l1';
  const recLabel = labels[0];
  const recSel   = currentLevelId === recKey ? ' selected' : '';

  // その他のプラン
  const otherKeys   = ['l2', 'l3', 'custom'];
  const otherCards  = otherKeys.map((key, i) => {
    const label = labels[i + 1];
    const sel   = currentLevelId === key ? ' plan-card-selected' : '';
    return `<div class="plan-card${sel}" onclick="selectPlan('${key}')">${label}</div>`;
  }).join('');

  // 展開状態を保持
  const wasExpanded = container.querySelector('.other-plans-grid')?.style.display === 'grid';

  container.innerHTML = `
    <div class="plan-selector-wrapper">
      <div class="plan-recommended-card${recSel}" onclick="selectPlan('${recKey}')">
        <span class="plan-recommended-badge">おすすめ</span>
        <div class="plan-recommended-name">${recLabel}</div>
        <div class="plan-recommended-hint">${currentLevelId === recKey ? '✓ 選択中' : 'このプランを使う →'}</div>
      </div>
      <button class="other-plans-toggle" onclick="toggleOtherPlans(this)">
        他のプランを見る ${wasExpanded ? '▲' : '▾'}
      </button>
      <div class="other-plans-grid" style="display:${wasExpanded ? 'grid' : 'none'};">
        ${otherCards}
      </div>
    </div>
  `;
}

// ─── プラン選択 ─────────────────────────────────────────────
function selectPlan(levelId) {
  currentLevelId = levelId;
  // 編集エリアのタブも同期
  switchLevelTab(levelId, null);
  renderPlanSelector();
  renderSessionList();
}

// ─── 他のプラン展開/折りたたみ ──────────────────────────────
function toggleOtherPlans(btn) {
  const grid = btn.nextElementSibling;
  if (!grid) return;
  const isOpen = grid.style.display === 'grid';
  grid.style.display = isOpen ? 'none' : 'grid';
  btn.innerHTML = isOpen ? '他のプランを見る ▾' : '閉じる ▲';
}

// ─── セッションリスト描画（コンパクト表示）───────────────────
function renderSessionList() {
  const container = document.getElementById('session-list');
  if (!container) return;

  const levelEl = document.getElementById('level-' + currentLevelId);
  if (!levelEl) { container.innerHTML = ''; return; }

  normalizeAllMenuCards();
  const cards = Array.from(levelEl.querySelectorAll('.menu-item-card'));

  if (cards.length === 0) {
    container.innerHTML = `<div class="session-list-empty">セッションがまだありません。<br>編集モード（✏️ 編集）で追加できます。</div>`;
    return;
  }

  const cardsHtml = cards.map((card) => {
    const name  = card.dataset.menuName  || '';
    const cat   = card.dataset.menuCat   || '';
    const time  = card.dataset.menuTime  || '';
    const theme = card.dataset.menuTheme || '';
    const items = JSON.parse(card.dataset.menuItems || '[]');

    const preview   = items.slice(0, 3);
    const remaining = items.slice(3);

    const previewHtml   = preview.map(i => `<li>${escHtml(i)}</li>`).join('');
    const remainingHtml = remaining.map(i => `<li>${escHtml(i)}</li>`).join('');

    const moreBtn = remaining.length > 0
      ? `<div class="session-card-detail" style="display:none;"><ul class="session-card-more-list">${remainingHtml}</ul></div>
         <button class="session-detail-btn" onclick="toggleSessionDetail(this)">詳細を見る ▾</button>`
      : '';

    return `
      <div class="session-card-compact">
        <div class="session-card-header">
          <div class="session-card-title">${escHtml(name)}</div>
          <div class="session-card-tags">
            ${cat  ? `<span class="tag">${escHtml(cat)}</span>`       : ''}
            ${time ? `<span class="tag">${escHtml(time)}分</span>` : ''}
          </div>
        </div>
        ${theme ? `<div class="session-card-theme">${escHtml(theme)}</div>` : ''}
        ${previewHtml ? `<ul class="session-card-preview">${previewHtml}</ul>` : ''}
        ${moreBtn}
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="session-list-wrapper">${cardsHtml}</div>`;
}

// ─── セッション詳細 展開/折りたたみ ─────────────────────────
function toggleSessionDetail(btn) {
  const card   = btn.closest('.session-card-compact');
  const detail = card?.querySelector('.session-card-detail');
  if (!detail) return;
  const isOpen = detail.style.display !== 'none';
  detail.style.display = isOpen ? 'none' : 'block';
  btn.textContent = isOpen ? '詳細を見る ▾' : '閉じる ▲';
}

// ─── カードの正規化（data属性 + 編集ボタン付与）─────────────
function normalizeAllMenuCards() {
  document.querySelectorAll('.menu-item-card').forEach(card => {
    if (!card.dataset.menuInit) {
      const h3 = card.querySelector('h3');
      const nameText = h3
        ? Array.from(h3.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .filter(Boolean)
            .join(' ')
            .trim()
        : '';
      const tags = Array.from(h3?.querySelectorAll('.tag') || []).map(t => t.textContent.trim());
      const time  = (tags.find(t => t.endsWith('分')) || '').replace('分', '');
      const cat   = tags.find(t => !t.endsWith('分')) || '';

      // テーマ（<p>タグ）
      const pEl   = card.querySelector('p');
      const theme = pEl ? pEl.textContent.replace(/^テーマ[：:]\s*/, '').trim() : '';

      // 内容リスト（<li>タグ）
      const items = Array.from(card.querySelectorAll('li')).map(li => li.textContent.trim());

      card.dataset.menuName  = nameText;
      card.dataset.menuCat   = cat;
      card.dataset.menuTime  = time;
      card.dataset.menuTheme = theme;
      card.dataset.menuItems = JSON.stringify(items);
      card.dataset.menuInit  = '1';
    }

    // 編集ボタンがなければ追加
    if (!card.querySelector('.menu-edit-btn')) {
      const editBtn = document.createElement('button');
      editBtn.className = 'menu-edit-btn';
      editBtn.title = '編集';
      editBtn.textContent = '✏️';
      editBtn.onclick = () => editMenuItem(editBtn);
      card.style.position = 'relative';
      const delBtn = card.querySelector('.menu-delete-btn');
      if (delBtn) delBtn.insertAdjacentElement('afterend', editBtn);
      else card.prepend(editBtn);
    }
  });
}

// ─── カード編集開始 ─────────────────────────────────────────
function editMenuItem(btn) {
  const card = btn.closest('.menu-item-card');
  if (!card || card.querySelector('.menu-edit-form')) return;

  const name  = card.dataset.menuName  || '';
  const cat   = card.dataset.menuCat   || '';
  const time  = card.dataset.menuTime  || '';
  const theme = card.dataset.menuTheme || '';
  const items = JSON.parse(card.dataset.menuItems || '[]');

  card.dataset.originalHtml = card.innerHTML;

  // 内容リストのHTML
  const itemsHtml = items.map(item => `
    <div class="item-row">
      <span class="item-text">${escHtml(item)}</span>
      <button class="item-del-btn" type="button" onclick="removeItemRow(this)" title="削除">✕</button>
    </div>
  `).join('');

  // プリセット選択肢（drill-library.js の DRILL_PRESETS を利用）
  // value = "name（time分）: desc" 形式（そのままli テキストになる）
  const presetOptsHtml = (typeof DRILL_PRESETS !== 'undefined')
    ? DRILL_PRESETS.map(p => {
        const label   = (typeof CAT_LABEL !== 'undefined' && CAT_LABEL[p.cat]) ? CAT_LABEL[p.cat] : p.cat;
        const timeStr = p.time ? `${p.time}分` : '';
        const paren   = timeStr ? `（${timeStr}）` : '';
        const descPart = p.desc ? `: ${p.desc}` : '';
        const itemText = `${p.name}${paren}${descPart}`;
        const display  = `${p.name}（${label}${timeStr ? '・' + timeStr : ''}）`;
        return `<option value="${escHtml(itemText)}">${escHtml(display)}</option>`;
      }).join('')
    : '';

  card.innerHTML = `
    <div class="menu-edit-form">
      <div class="menu-edit-row">
        <label>メニュー名</label>
        <input type="text" class="edit-name" value="${escHtml(name)}" placeholder="例: セッション 1">
      </div>
      <div class="menu-edit-row" style="display:flex;gap:10px;">
        <div style="flex:1;">
          <label>カテゴリ</label>
          <select class="edit-cat">${catSelectHtml(cat)}</select>
        </div>
        <div style="width:90px;">
          <label>時間（分）</label>
          <input type="number" class="edit-time" value="${escHtml(time)}" min="1" max="180" placeholder="60">
        </div>
      </div>
      <div class="menu-edit-row">
        <label>テーマ</label>
        <input type="text" class="edit-theme" value="${escHtml(theme)}" placeholder="例: 「思った通りに動けるかな？」— 自分の身体を知る">
      </div>
      <div class="menu-edit-row">
        <label>内容リスト</label>
        <div class="items-editor">
          <div class="items-list">
            ${itemsHtml || '<div class="items-empty">内容がありません。下から追加してください。</div>'}
          </div>
          <div class="items-add-panel">
            <div class="items-add-tabs">
              <button class="items-tab-btn active" type="button" onclick="switchItemAddTab(this,'from-list')">リストから選ぶ</button>
              <button class="items-tab-btn" type="button" onclick="switchItemAddTab(this,'custom')">カスタムで追加</button>
            </div>
            <div class="items-tab-content items-tab-from-list">
              <select class="items-preset-select">
                <option value="">── ドリルを選択 ──</option>
                ${presetOptsHtml}
              </select>
              <button class="btn btn-accent" type="button" onclick="addItemFromPreset(this)">＋</button>
            </div>
            <div class="items-tab-content items-tab-custom" style="display:none;">
              <input type="text" class="items-custom-input" placeholder="例: ミラーリング遊び（10分）">
              <button class="btn btn-accent" type="button" onclick="addCustomItem(this)">＋</button>
            </div>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn btn-primary" onclick="saveMenuEdit(this)">💾 保存</button>
        <button class="btn btn-secondary" onclick="cancelMenuEdit(this)">キャンセル</button>
      </div>
    </div>
  `;
  card.querySelector('.edit-name')?.focus();
}

// ─── アイテム追加タブ切替 ─────────────────────────────────
function switchItemAddTab(btn, tabId) {
  const panel = btn.closest('.items-add-panel');
  if (!panel) return;
  panel.querySelectorAll('.items-tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  panel.querySelectorAll('.items-tab-content').forEach(c => c.style.display = 'none');
  const target = panel.querySelector('.items-tab-' + tabId);
  if (target) target.style.display = 'flex';
}

// ─── アイテム削除 ─────────────────────────────────────────
function removeItemRow(btn) {
  const row = btn.closest('.item-row');
  if (row) row.remove();
}

// ─── プリセットからアイテム追加 ──────────────────────────
function addItemFromPreset(btn) {
  const panel  = btn.closest('.items-add-panel');
  const select = panel?.querySelector('.items-preset-select');
  const val    = select?.value?.trim();
  if (!val) return;
  const list = btn.closest('.items-editor')?.querySelector('.items-list');
  if (!list) return;

  // 空メッセージがあれば削除
  list.querySelector('.items-empty')?.remove();

  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `<span class="item-text">${escHtml(val)}</span><button class="item-del-btn" type="button" onclick="removeItemRow(this)" title="削除">✕</button>`;
  list.appendChild(row);
  select.value = '';
}

// ─── カスタムアイテム追加 ──────────────────────────────────
function addCustomItem(btn) {
  const panel = btn.closest('.items-add-panel');
  const input = panel?.querySelector('.items-custom-input');
  const val   = input?.value?.trim();
  if (!val) return;
  const list = btn.closest('.items-editor')?.querySelector('.items-list');
  if (!list) return;

  // 空メッセージがあれば削除
  list.querySelector('.items-empty')?.remove();

  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `<span class="item-text">${escHtml(val)}</span><button class="item-del-btn" type="button" onclick="removeItemRow(this)" title="削除">✕</button>`;
  list.appendChild(row);
  input.value = '';
  input.focus();
}

// ─── 編集保存 ───────────────────────────────────────────────
function saveMenuEdit(btn) {
  const form = btn.closest('.menu-edit-form');
  const card = btn.closest('.menu-item-card');
  if (!form || !card) return;

  const name     = form.querySelector('.edit-name')?.value?.trim()  || '';
  const catVal   = form.querySelector('.edit-cat')?.value           || 'tech';
  const catLabel = catLabelFromValue(catVal);
  const time     = form.querySelector('.edit-time')?.value?.trim()  || '';
  const theme    = form.querySelector('.edit-theme')?.value?.trim() || '';

  // 内容リストを収集
  const itemEls = form.querySelectorAll('.item-row .item-text');
  const items   = Array.from(itemEls).map(el => el.textContent.trim()).filter(Boolean);

  if (!name) { alert('メニュー名を入力してください'); return; }

  card.dataset.menuName  = name;
  card.dataset.menuCat   = catLabel;
  card.dataset.menuTime  = time;
  card.dataset.menuTheme = theme;
  card.dataset.menuItems = JSON.stringify(items);
  card.dataset.menuInit  = '1';

  const itemsUlHtml = items.length
    ? `<ul style="margin:8px 0 0 18px; font-size:0.88rem; color:var(--text-muted);">${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>`
    : '';

  card.innerHTML = `
    <button class="menu-delete-btn" onclick="deleteMenuItem(this)" title="削除">✕</button>
    <button class="menu-edit-btn" onclick="editMenuItem(this)" title="編集">✏️</button>
    <h3>${escHtml(name)}
      ${catLabel ? `<span class="tag">${escHtml(catLabel)}</span>` : ''}
      ${time     ? `<span class="tag">${escHtml(time)}分</span>`   : ''}
    </h3>
    ${theme ? `<p><strong>テーマ：</strong>${escHtml(theme)}</p>` : ''}
    ${itemsUlHtml}
  `;
}

// ─── 編集キャンセル ─────────────────────────────────────────
function cancelMenuEdit(btn) {
  const card = btn.closest('.menu-item-card');
  if (card?.dataset.originalHtml) {
    card.innerHTML = card.dataset.originalHtml;
    delete card.dataset.originalHtml;
  }
}

// ─── メニュー削除 ───────────────────────────────────────────
function deleteMenuItem(btn) {
  if (!confirm('このメニューを削除しますか？')) return;
  const card = btn.closest('.menu-item-card');
  if (card) card.remove();
}

// ─── 追加モーダルを開く（drill-library.js の openAddModal を呼ぶ）────
function toggleAddMenuForm(levelId) {
  if (typeof openAddModal === 'function') {
    openAddModal('level', levelId);
  }
}

// ─── ライブラリからカードを追加（drill-library.js から呼ばれる）────
function addMenuItemFromPreset(levelId, preset) {
  const catLabel = (typeof CAT_LABEL !== 'undefined' && CAT_LABEL[preset.cat])
    ? CAT_LABEL[preset.cat]
    : (catLabelFromValue(preset.cat) || preset.cat || '');
  const container = document.getElementById('level-' + levelId)?.querySelector('.level-menu-list');
  if (!container) return;

  // 空メッセージがあれば削除
  container.querySelector('.empty-level-msg')?.remove();

  const card = document.createElement('div');
  card.className = 'concept-card menu-item-card';
  card.style.position = 'relative';
  card.dataset.menuName  = preset.name;
  card.dataset.menuCat   = catLabel;
  card.dataset.menuTime  = preset.time || '';
  card.dataset.menuTheme = '';
  card.dataset.menuItems = '[]';
  card.dataset.menuInit  = '1';
  card.innerHTML = `
    <button class="menu-delete-btn" onclick="deleteMenuItem(this)" title="削除">✕</button>
    <button class="menu-edit-btn" onclick="editMenuItem(this)" title="編集">✏️</button>
    <h3>${escHtml(preset.name)}
      ${catLabel   ? `<span class="tag">${escHtml(catLabel)}</span>` : ''}
      ${preset.time ? `<span class="tag">${preset.time}分</span>`    : ''}
    </h3>
    ${preset.desc ? `<p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px">${escHtml(preset.desc)}</p>` : ''}
  `;
  container.appendChild(card);
}

// ─── 新規メニュー追加（旧フォーム経由 — 後方互換のため残す）────
function addMenuItem(levelId) {
  const nameEl = document.getElementById('new-menu-name-' + levelId);
  const catEl  = document.getElementById('new-menu-cat-'  + levelId);
  const descEl = document.getElementById('new-menu-desc-' + levelId);
  const timeEl = document.getElementById('new-menu-time-' + levelId);

  const name = nameEl?.value?.trim() || '';
  if (!name) { alert('メニュー名を入力してください'); return; }

  const catVal   = catEl?.value || 'tech';
  const catLabel = catLabelFromValue(catVal);
  const desc     = descEl?.value?.trim() || '';
  const time     = timeEl?.value?.trim() || '';

  const container = document.getElementById('level-' + levelId)?.querySelector('.level-menu-list');
  if (!container) return;

  container.querySelector('.empty-level-msg')?.remove();

  const card = document.createElement('div');
  card.className = 'concept-card menu-item-card';
  card.style.position = 'relative';
  card.dataset.menuName  = name;
  card.dataset.menuCat   = catLabel;
  card.dataset.menuTime  = time;
  card.dataset.menuTheme = '';
  card.dataset.menuItems = '[]';
  card.dataset.menuInit  = '1';
  card.innerHTML = `
    <button class="menu-delete-btn" onclick="deleteMenuItem(this)" title="削除">✕</button>
    <button class="menu-edit-btn" onclick="editMenuItem(this)" title="編集">✏️</button>
    <h3>${escHtml(name)}
      ${catLabel ? `<span class="tag">${escHtml(catLabel)}</span>` : ''}
      ${time     ? `<span class="tag">${escHtml(time)}分</span>`   : ''}
    </h3>
    ${desc ? `<div class="menu-item-desc">${escHtml(desc)}</div>` : ''}
  `;
  container.appendChild(card);

  if (nameEl) nameEl.value = '';
  if (catEl)  catEl.selectedIndex = 0;
  if (descEl) descEl.value = '';
  if (timeEl) timeEl.value = '';
  toggleAddMenuForm(levelId);
}

// ─── レベルメニュー保存（localStorage）─────────────────────
function saveLevelMenu(levelId) {
  _saveLevelMenuSilent(levelId);

  const btn = document.querySelector(`[onclick*="saveLevelMenu('${levelId}')"]`);
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✅ 保存しました';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
  }
}

function _saveLevelMenuSilent(levelId) {
  const container = document.getElementById('level-' + levelId);
  if (!container) return;
  normalizeAllMenuCards();
  const cards = Array.from(container.querySelectorAll('.menu-item-card'));
  const data = cards.map(card => ({
    name:  card.dataset.menuName  || '',
    cat:   card.dataset.menuCat   || '',
    time:  card.dataset.menuTime  || '',
    theme: card.dataset.menuTheme || '',
    items: JSON.parse(card.dataset.menuItems || '[]'),
  }));
  const key = `fep_menus_${currentAgeGroup}_${levelId}`;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── 保存済みメニューをDOM に復元 ───────────────────────────
function loadSavedLevelMenus() {
  LEVEL_KEYS.forEach(levelId => {
    const key       = `fep_menus_${currentAgeGroup}_${levelId}`;
    const raw       = localStorage.getItem(key);
    // 旧キー（elem の後方互換）
    const legacyRaw = (currentAgeGroup === 'elem')
      ? localStorage.getItem('fep_menus_level_' + levelId)
      : null;

    const container = document.getElementById('level-' + levelId)?.querySelector('.level-menu-list');
    if (!container) return;

    if (!raw && !legacyRaw) {
      // elem 以外かつデータなし → 既存カードを消してプレースホルダー
      if (currentAgeGroup !== 'elem') {
        container.querySelectorAll('.menu-item-card').forEach(c => c.remove());
        if (!container.querySelector('.empty-level-msg')) {
          const msg = document.createElement('div');
          msg.className = 'empty-level-msg';
          msg.innerHTML = '「＋ メニューを追加」からメニューを追加してください';
          container.appendChild(msg);
        }
      }
      return;
    }

    try {
      const data = JSON.parse(raw || legacyRaw);

      // 既存カード & プレースホルダーをクリア
      container.querySelectorAll('.menu-item-card').forEach(c => c.remove());
      container.querySelectorAll('.empty-level-msg').forEach(c => c.remove());

      data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'concept-card menu-item-card';
        card.style.position = 'relative';
        card.dataset.menuName  = item.name  || '';
        card.dataset.menuCat   = item.cat   || '';
        card.dataset.menuTime  = item.time  || '';
        card.dataset.menuTheme = item.theme || '';
        card.dataset.menuItems = JSON.stringify(item.items || []);
        card.dataset.menuInit  = '1';

        const items = item.items || [];
        const itemsUlHtml = items.length
          ? `<ul style="margin:8px 0 0 18px; font-size:0.88rem; color:var(--text-muted);">${items.map(i => `<li>${escHtml(i)}</li>`).join('')}</ul>`
          : '';

        card.innerHTML = `
          <button class="menu-delete-btn" onclick="deleteMenuItem(this)" title="削除">✕</button>
          <button class="menu-edit-btn" onclick="editMenuItem(this)" title="編集">✏️</button>
          <h3>${escHtml(item.name)}
            ${item.cat  ? `<span class="tag">${escHtml(item.cat)}</span>`   : ''}
            ${item.time ? `<span class="tag">${escHtml(item.time)}分</span>` : ''}
          </h3>
          ${item.theme ? `<p><strong>テーマ：</strong>${escHtml(item.theme)}</p>` : ''}
          ${itemsUlHtml}
        `;
        container.appendChild(card);
      });
    } catch(e) { console.error('loadSavedLevelMenus:', levelId, e); }
  });
}

// ─── 初期化 ─────────────────────────────────────────────────
function initMenuPage() {
  currentAgeGroup = 'elem';
  currentLevelId  = 'l1';
  isEditMode      = false;

  // 編集モードをリセット
  const wrapper = document.getElementById('menu-page-wrapper');
  if (wrapper) wrapper.classList.remove('edit-mode');
  const editBtn = document.getElementById('edit-mode-btn');
  if (editBtn) { editBtn.textContent = '✏️ 編集'; editBtn.classList.remove('is-active'); }

  // データ復元とラベル設定
  loadSavedLevelMenus();
  normalizeAllMenuCards();
  updateLevelTabLabels();

  // 編集エリアのLevel タブを l1 に合わせる
  switchLevelTab('l1', document.querySelector('#level-tabs .tab-btn[data-level="l1"]'));

  // Age タブ初期化
  document.querySelectorAll('.age-tab-btn').forEach(b => b.classList.remove('active'));
  const firstAgeBtn = document.querySelector('.age-tab-btn');
  if (firstAgeBtn) firstAgeBtn.classList.add('active');

  // 閲覧ビューを描画
  renderPlanSelector();
  renderSessionList();
}
