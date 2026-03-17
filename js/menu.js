// ══════════════════════════════════════════════════════════
// LEVEL MENU FUNCTIONS  (js/menu.js)
// ══════════════════════════════════════════════════════════

const LEVEL_KEYS = ['l1', 'l2', 'l3', 'custom'];

// ─── 年代グループ管理 ───────────────────────────────────────
let currentAgeGroup = 'elem'; // 'elem' | 'junior' | 'pro'

function switchAgeGroup(ageId, btn) {
  // 現在のデータを保存してから切り替え
  LEVEL_KEYS.forEach(lvl => _saveLevelMenuSilent(lvl));

  currentAgeGroup = ageId;

  document.querySelectorAll('.age-tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  loadSavedLevelMenus();
  normalizeAllMenuCards();
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

// ─── レベル名 ───────────────────────────────────────────────
function loadLevelNames() {
  try {
    const saved = JSON.parse(localStorage.getItem('fep_level_names') || '{}');
    const defaults = { l1: 'Level 1', l2: 'Level 2', l3: 'Level 3', custom: 'カスタム' };
    LEVEL_KEYS.forEach(k => {
      const el = document.getElementById('lname-' + k);
      if (el) el.textContent = saved[k] || defaults[k];
    });
  } catch(e) { console.error('loadLevelNames:', e); }
}

function editLevelName(key) {
  const el = document.getElementById('lname-' + key);
  if (!el) return;
  const current = el.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.style.cssText = 'width:80px;padding:3px 7px;font-size:0.85rem;border:1.5px solid #93c5fd;border-radius:6px;font-family:inherit;';
  el.replaceWith(input);
  input.focus(); input.select();

  const commit = () => {
    const val = input.value.trim() || current;
    const span = document.createElement('span');
    span.className = 'level-label'; span.id = 'lname-' + key;
    span.textContent = val;
    input.replaceWith(span);
    try {
      const saved = JSON.parse(localStorage.getItem('fep_level_names') || '{}');
      saved[key] = val;
      localStorage.setItem('fep_level_names', JSON.stringify(saved));
    } catch(e) {}
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
}

// ─── レベルタブ切替 ─────────────────────────────────────────
function switchLevelTab(levelId, btn) {
  document.querySelectorAll('.level-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('#level-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('#level-tabs .level-tab-wrapper').forEach(w => w.classList.remove('active'));
  const el = document.getElementById('level-' + levelId);
  if (el) el.style.display = 'block';
  if (btn) {
    btn.classList.add('active');
    btn.closest('.level-tab-wrapper')?.classList.add('active');
  }
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
  const presetOptsHtml = (typeof DRILL_PRESETS !== 'undefined')
    ? DRILL_PRESETS.map(p => {
        const label = (typeof CAT_LABEL !== 'undefined' && CAT_LABEL[p.cat]) ? CAT_LABEL[p.cat] : p.cat;
        return `<option value="${escHtml(p.name)}">${escHtml(p.name)}（${label}）</option>`;
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
  loadLevelNames();
  loadSavedLevelMenus();
  normalizeAllMenuCards();

  // Level タブ初期化
  const firstLevelBtn = document.querySelector('#level-tabs .tab-btn');
  if (firstLevelBtn) switchLevelTab('l1', firstLevelBtn);

  // Age タブ初期化
  const firstAgeBtn = document.querySelector('.age-tab-btn');
  if (firstAgeBtn) {
    document.querySelectorAll('.age-tab-btn').forEach(b => b.classList.remove('active'));
    firstAgeBtn.classList.add('active');
  }
}
