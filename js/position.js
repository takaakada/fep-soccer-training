// ══════════════════════════════════════════════════════════
// POSITION MENU FUNCTIONS  (js/position.js)
// ══════════════════════════════════════════════════════════

const POS_KEYS = ['gk', 'df', 'mf', 'fw'];

// ─── HTML エスケープ（menu.js と共有、念のため再定義）──────
function escPosHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── ポジションタブ切替 ─────────────────────────────────
function switchPosTab(posId, btn) {
  document.querySelectorAll('.pos-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('#pos-tabs .pos-tab-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('pos-' + posId);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ─── カードの正規化（既存カードに data属性 と 編集ボタンを付与）──
function normalizeAllPosCards() {
  document.querySelectorAll('.drill-card').forEach(card => {
    if (!card.dataset.posInit) {
      const titleEl = card.querySelector('.drill-title');
      const descEl  = card.querySelector('p');
      const stepsEl = card.querySelector('.drill-steps');
      const fepEl   = card.querySelector('.drill-fep');
      const numEl   = card.querySelector('.drill-num');

      card.dataset.posTitle = titleEl ? titleEl.textContent.trim() : '';
      card.dataset.posDesc  = descEl  ? descEl.textContent.trim()  : '';
      card.dataset.posFep   = fepEl   ? fepEl.textContent.trim()   : '';
      card.dataset.posNum   = numEl   ? numEl.textContent.trim()   : '';

      // <li> をテキスト配列として保存
      const items = stepsEl
        ? Array.from(stepsEl.querySelectorAll('li')).map(li => li.textContent.trim())
        : [];
      card.dataset.posItems = JSON.stringify(items);
      card.dataset.posInit  = '1';
    }

    // 編集ボタンがなければ追加
    if (!card.querySelector('.menu-edit-btn')) {
      const editBtn = document.createElement('button');
      editBtn.className = 'menu-edit-btn';
      editBtn.title = '編集';
      editBtn.textContent = '✏️';
      editBtn.onclick = () => editPosItem(editBtn);
      card.style.position = 'relative';
      const delBtn = card.querySelector('.menu-delete-btn');
      if (delBtn) delBtn.insertAdjacentElement('afterend', editBtn);
      else card.prepend(editBtn);
    }
  });
}

// ─── カード編集開始 ─────────────────────────────────────
function editPosItem(btn) {
  const card = btn.closest('.drill-card');
  if (!card || card.querySelector('.menu-edit-form')) return;

  const title = card.dataset.posTitle || '';
  const desc  = card.dataset.posDesc  || '';
  const fep   = card.dataset.posFep   || '';
  const items = JSON.parse(card.dataset.posItems || '[]');

  // このカードのポジション（gk/df/mf/fw）を特定
  const posId = POS_KEYS.find(p => card.classList.contains(p)) || 'gk';

  card.dataset.originalHtml = card.innerHTML;

  // 既存ステップのHTML
  const itemsHtml = items.map(item => `
    <div class="item-row">
      <span class="item-text">${escPosHtml(item)}</span>
      <button class="item-del-btn" type="button" onclick="removeItemRow(this)" title="削除">✕</button>
    </div>
  `).join('');

  // ポジション別プリセット（drill-library.js の POS_PRESETS）
  const posPresets = (typeof POS_PRESETS !== 'undefined' && POS_PRESETS[posId]) ? POS_PRESETS[posId] : [];
  const posPresetOpts = posPresets.map(p =>
    `<option value="${escPosHtml(p.name)}">${escPosHtml(p.name)}</option>`
  ).join('');

  // 汎用ドリルプリセット（drill-library.js の DRILL_PRESETS）
  const genPresetOpts = (typeof DRILL_PRESETS !== 'undefined')
    ? DRILL_PRESETS.map(p => {
        const label = (typeof CAT_LABEL !== 'undefined' && CAT_LABEL[p.cat]) ? CAT_LABEL[p.cat] : p.cat;
        return `<option value="${escPosHtml(p.name)}">${escPosHtml(p.name)}（${label}）</option>`;
      }).join('')
    : '';

  // 選択肢：ポジション別を先に、次に汎用
  const allPresetOpts = [
    posPresets.length ? `<optgroup label="ポジション別（${posId.toUpperCase()}）">${posPresetOpts}</optgroup>` : '',
    genPresetOpts ? `<optgroup label="汎用ドリル">${genPresetOpts}</optgroup>` : '',
  ].join('');

  card.innerHTML = `
    <div class="menu-edit-form">
      <div class="menu-edit-row">
        <label>ドリル名</label>
        <input type="text" class="edit-pos-title" value="${escPosHtml(title)}" placeholder="例: シュートストップ宣言">
      </div>
      <div class="menu-edit-row">
        <label>概要説明</label>
        <input type="text" class="edit-pos-desc" value="${escPosHtml(desc)}" placeholder="ドリルの概要をひとことで">
      </div>
      <div class="menu-edit-row">
        <label>ステップ・内容リスト</label>
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
                ${allPresetOpts}
              </select>
              <button class="btn btn-accent" type="button" onclick="addItemFromPreset(this)">＋</button>
            </div>
            <div class="items-tab-content items-tab-custom" style="display:none;">
              <input type="text" class="items-custom-input" placeholder="例: 着地点を宣言してからジャンプ（10分）">
              <button class="btn btn-accent" type="button" onclick="addCustomItem(this)">＋</button>
            </div>
          </div>
        </div>
      </div>
      <div class="menu-edit-row">
        <label>FEP的ポイント</label>
        <input type="text" class="edit-pos-fep" value="${escPosHtml(fep)}" placeholder="🧠 FEP的ポイント：予測誤差を最小化する...">
      </div>
      <div style="display:flex;gap:8px;margin-top:4px;">
        <button class="btn btn-primary" onclick="savePosEdit(this)">💾 保存</button>
        <button class="btn btn-secondary" onclick="cancelPosEdit(this)">キャンセル</button>
      </div>
    </div>
  `;
  card.querySelector('.edit-pos-title')?.focus();
}

// ─── 編集保存 ────────────────────────────────────────────
function savePosEdit(btn) {
  const form = btn.closest('.menu-edit-form');
  const card = btn.closest('.drill-card');
  if (!form || !card) return;

  const title = form.querySelector('.edit-pos-title')?.value?.trim() || '';
  const desc  = form.querySelector('.edit-pos-desc')?.value?.trim()  || '';
  const fep   = form.querySelector('.edit-pos-fep')?.value?.trim()   || '';

  // items-list から項目を収集
  const itemEls = form.querySelectorAll('.item-row .item-text');
  const items   = Array.from(itemEls).map(el => el.textContent.trim()).filter(Boolean);

  if (!title) { alert('ドリル名を入力してください'); return; }

  const posId = POS_KEYS.find(p => card.classList.contains(p)) || 'gk';

  card.dataset.posTitle = title;
  card.dataset.posDesc  = desc;
  card.dataset.posFep   = fep;
  card.dataset.posItems = JSON.stringify(items);
  card.dataset.posInit  = '1';

  const stepsHtml = items.length
    ? `<ul class="drill-steps">${items.map(i => `<li>${escPosHtml(i)}</li>`).join('')}</ul>`
    : '';

  card.innerHTML = `
    <button class="menu-delete-btn" onclick="deleteMenuItem(this)" title="削除">✕</button>
    <button class="menu-edit-btn" onclick="editPosItem(this)" title="編集">✏️</button>
    <div class="drill-header">
      <span class="drill-num ${posId}">${escPosHtml(card.dataset.posNum || '')}</span>
      <div class="drill-title">${escPosHtml(title)}</div>
    </div>
    ${desc ? `<p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px">${escPosHtml(desc)}</p>` : ''}
    ${stepsHtml}
    ${fep ? `<div class="drill-fep ${posId}">🧠 ${escPosHtml(fep)}</div>` : ''}
  `;
}

// ─── 編集キャンセル ─────────────────────────────────────
function cancelPosEdit(btn) {
  const card = btn.closest('.drill-card');
  if (card?.dataset.originalHtml) {
    card.innerHTML = card.dataset.originalHtml;
    delete card.dataset.originalHtml;
  }
}

// ─── カード削除（menu.js の deleteMenuItem を共有）────────
// deleteMenuItem(btn) は menu.js で定義済み

// ─── ライブラリからカードを追加（drill-library.js から呼ばれる）────
function addPosItemFromPreset(posId, preset) {
  const container = document.getElementById('pos-' + posId);
  if (!container) return;

  const existingCards = container.querySelectorAll('.drill-card');
  const nextNum = existingCards.length + 1;

  // steps: POS_PRESETS の steps 配列（data-loader.js で設定）
  const steps = Array.isArray(preset.steps) ? preset.steps : [];
  const stepsHtml = steps.length
    ? `<ul class="drill-steps">${steps.map(s => `<li>${escPosHtml(s)}</li>`).join('')}</ul>`
    : '';

  // FEP解説
  const fepText = preset.fep || '';
  const fepHtml = fepText
    ? `<details class="drill-fep-details">
         <summary>解説</summary>
         <div class="drill-fep ${posId}">${escPosHtml(fepText)}</div>
       </details>`
    : '';

  const card = document.createElement('div');
  card.className = `drill-card ${posId}`;
  card.style.position = 'relative';
  card.dataset.posTitle = preset.name;
  card.dataset.posDesc  = preset.desc || '';
  card.dataset.posFep   = fepText;
  card.dataset.posNum   = `Drill ${nextNum}`;
  card.dataset.posItems = JSON.stringify(steps);
  card.dataset.posInit  = '1';

  card.innerHTML = `
    <button class="menu-delete-btn pos-del-btn" onclick="deleteMenuItem(this)" title="削除">✕</button>
    <button class="menu-edit-btn pos-edit-item-btn" onclick="editPosItem(this)" title="編集">✏️</button>
    <div class="drill-header">
      <span class="drill-num ${posId}">Drill ${nextNum}</span>
      <div class="drill-title">${escPosHtml(preset.name)}</div>
    </div>
    ${preset.desc ? `<p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px">${escPosHtml(preset.desc)}</p>` : ''}
    ${stepsHtml}
    ${fepHtml}
  `;

  // add-menu-section（編集エリア）の直前に挿入
  const addSection = container.querySelector('.pos-edit-section');
  if (addSection) container.insertBefore(card, addSection);
  else container.appendChild(card);
}

// ─── ポジションメニュー保存（localStorage）──────────────
function savePosMenu(posId) {
  const container = document.getElementById('pos-' + posId);
  if (!container) return;

  normalizeAllPosCards();

  const cards = Array.from(container.querySelectorAll('.drill-card'));
  const data = cards.map(card => ({
    title: card.dataset.posTitle || '',
    desc:  card.dataset.posDesc  || '',
    items: JSON.parse(card.dataset.posItems || '[]'),
    fep:   card.dataset.posFep   || '',
    num:   card.dataset.posNum   || '',
    pos:   posId,
  }));

  localStorage.setItem('fep_pos_' + posId, JSON.stringify(data));

  const btn = document.querySelector(`[onclick*="savePosMenu('${posId}')"]`);
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✅ 保存しました';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
  }
}

// ─── 保存済みドリルを DOM に復元 ────────────────────────
function loadSavedPosMenus() {
  POS_KEYS.forEach(posId => {
    const raw = localStorage.getItem('fep_pos_' + posId);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const container = document.getElementById('pos-' + posId);
      if (!container) return;

      container.querySelectorAll('.drill-card').forEach(c => c.remove());

      data.forEach(item => {
        const card = document.createElement('div');
        card.className = `drill-card ${item.pos || posId}`;
        card.style.position = 'relative';
        card.dataset.posTitle = item.title || '';
        card.dataset.posDesc  = item.desc  || '';
        card.dataset.posItems = JSON.stringify(item.items || []);
        card.dataset.posFep   = item.fep   || '';
        card.dataset.posNum   = item.num   || '';
        card.dataset.posInit  = '1';

        const items = item.items || [];
        const stepsHtml = items.length
          ? `<ul class="drill-steps">${items.map(i => `<li>${escPosHtml(i)}</li>`).join('')}</ul>`
          : '';

        card.innerHTML = `
          <button class="menu-delete-btn" onclick="deleteMenuItem(this)" title="削除">✕</button>
          <button class="menu-edit-btn" onclick="editPosItem(this)" title="編集">✏️</button>
          <div class="drill-header">
            <span class="drill-num ${item.pos || posId}">${escPosHtml(item.num || '')}</span>
            <div class="drill-title">${escPosHtml(item.title || '')}</div>
          </div>
          ${item.desc ? `<p style="font-size:0.88rem;color:var(--text-muted);margin-bottom:8px">${escPosHtml(item.desc)}</p>` : ''}
          ${stepsHtml}
          ${item.fep  ? `<div class="drill-fep ${item.pos || posId}">🧠 ${escPosHtml(item.fep)}</div>` : ''}
        `;
        container.appendChild(card);
      });
    } catch(e) { console.error('loadSavedPosMenus:', posId, e); }
  });
}

// ─── 編集モード切替 ──────────────────────────────────────
let isPosEditMode = false;

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

// ─── 初期化 ──────────────────────────────────────────────
function initPositionPage() {
  loadSavedPosMenus();
  normalizeAllPosCards();
  const firstBtn = document.querySelector('#pos-tabs .pos-tab-btn');
  if (firstBtn) switchPosTab('gk', firstBtn);
}
