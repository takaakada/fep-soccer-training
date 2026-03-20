// ══════════════════════════════════════════════════════════
// POSITION MENU FUNCTIONS — ToDo-style UI  (js/position.js)
// ══════════════════════════════════════════════════════════

const POS_KEYS = ['gk', 'df', 'mf', 'fw'];

// ─── HTML エスケープ ──────────────────────────────────────
function escPosHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── ポジションデータ ─────────────────────────────────────
const positionMenus = {
  gk: {
    icon:  '🧤',
    title: 'GKメニュー',
    theme: '先読みと判断',
    tags:  ['予測のズレ', '更新速度', '声かけ'],
    items: [
      {
        title:   'シュートコース予測',
        sub:     '打たれる前にコースを予測する',
        details: [
          '左右・高さを先に宣言してから構える',
          '実際のシュートとのズレを言語化する',
          '5本連続で宣言し、予測精度を確認する',
        ],
      },
      {
        title:   'クロス落下点予測',
        sub:     'クロスの着地点を読む',
        details: [
          '蹴られた瞬間に「ファーポスト前方」などを宣言',
          '実際の落下点との誤差を確認する',
          'キャッチまたはコーチングをセットで行う',
        ],
      },
      {
        title:   'PK判断',
        sub:     '助走・体の向きから飛ぶ方向を決める',
        details: [
          '助走角度・目線・体の向きを観察する',
          '「右・左・中央」の判断根拠を宣言してから飛ぶ',
          '後から「どの手がかりが有効だったか」を振り返る',
        ],
      },
      {
        title:   '1対1の角度調整',
        sub:     '最も打ちにくい位置を取る',
        details: [
          'FWが向かってきたら「最適ポジション」を声に出す',
          'シュートコースを最も狭める位置を先に取る',
          '出るタイミングのフィードバックを受けて修正する',
        ],
      },
    ],
  },

  df: {
    icon:  '🛡️',
    title: 'DFメニュー',
    theme: '相手予測とライン調整',
    tags:  ['相手の意図', 'スペース管理', 'ライン共有'],
    items: [
      {
        title:   '方向転換予測',
        sub:     '相手がどちらに切るかを事前に読む',
        details: [
          '肩・腰・体重移動を見て「右に切る」などを宣言',
          '実際の方向との一致率を記録する（目標：10本中6本）',
          '「どの手がかりで予測したか」を毎回言語化する',
        ],
      },
      {
        title:   'パスライン先読み',
        sub:     '次のパス先を予測して先に動く',
        details: [
          '保持者を観察し「次のパス先」を指差しで宣言',
          'そのパスラインを切れる位置に先に動く',
          '予測が外れたときは「何の情報を見逃したか」を確認',
        ],
      },
      {
        title:   'プレスタイミング判断',
        sub:     '行く/待つを根拠とともに決める',
        details: [
          '相手がボールを受けた瞬間「今すぐ行く/待つ」を宣言',
          '判断根拠（「コントロールが大きかった」など）を同時に言語化',
          '成功/失敗後に「タイミングは正しかったか」を確認',
        ],
      },
      {
        title:   'ラインコントロール',
        sub:     'DF全体でタイミングを統一する',
        details: [
          'リーダーDFが「ライン上げ/下げ」を声で宣言してから動く',
          '他のDFが声なしでも合わせられるようにする',
          '「なぜそのタイミングで上げたか」を毎回説明できるようにする',
        ],
      },
    ],
  },

  mf: {
    icon:  '⚙️',
    title: 'MFメニュー',
    theme: '情報整理と選択',
    tags:  ['周囲確認', '選択肢準備', '切り替え'],
    items: [
      {
        title:   'ファーストタッチ前宣言',
        sub:     '受ける前に何をするかを決める',
        details: [
          'パスが届く前に「右足でコントロールして前へ」などを宣言',
          '宣言通りに実行できたか、変更が必要だったかを振り返る',
          '変更した場合は「何の情報が来て変えたか」を言語化する',
        ],
      },
      {
        title:   'プレス方向予測',
        sub:     '相手の来る方向を先読みする',
        details: [
          '相手の足の向きから来る方向を予測して宣言',
          '予測に基づき「体の向き」を先に作っておく',
          '逆プレスをかけられた場合の「次の手」も準備しておく',
        ],
      },
      {
        title:   '3つの選択肢準備',
        sub:     '第1〜第3の選択肢を持っておく',
        details: [
          'ボールを受ける前に周囲をスキャンして選択肢を3つ挙げる',
          '「最優先は右前方、次は左の味方」などを声で宣言',
          '使わなかった選択肢の「その時点での状況」も確認する',
        ],
      },
      {
        title:   '攻守切り替え予測',
        sub:     '切り替えのタイミングを先読みする',
        details: [
          '守備→攻撃が切り替わる瞬間を「予測」してスプリント開始',
          '「次のプレーで取れそうか」を常に3秒先まで予測する',
          '切り替えが遅れた場面で「どの情報を見落としたか」を分析',
        ],
      },
    ],
  },

  fw: {
    icon:  '🎯',
    title: 'FWメニュー',
    theme: '動き出しとフィニッシュ',
    tags:  ['動き出し', '打つ判断', 'ミス後の修正'],
    items: [
      {
        title:   'シュートゾーン選択',
        sub:     'GKの体勢を読んでコースを決める',
        details: [
          'ゴールを6ゾーンに分割し、シュート前に「どこを狙うか」を宣言',
          'GKの重心・手の位置から「空いているゾーン」を判断',
          '宣言したゾーンと実際の着弾点のズレを記録する',
        ],
      },
      {
        title:   '裏抜けタイミング',
        sub:     'パスが出るタイミングを予測して動く',
        details: [
          '出し手の「予備動作（体の向き・視線）」を観察する',
          '「今出る」と判断した根拠を声に出してから動き出す',
          'オフサイドの場合は「どのタイミングが早すぎたか」を振り返る',
        ],
      },
      {
        title:   '1対1フィニッシュ',
        sub:     'いつ打つか・どこへ打つかを判断する',
        details: [
          'GKが前に出てきた「歩数」をカウントし、打ち時を判断する',
          'GKが倒れたら→浮かせる、立っていたら→コースを狙う',
          '成功・失敗後に「その時点でのGKの状態」を言語化する',
        ],
      },
      {
        title:   'オフザボール動き出し',
        sub:     '次にボールが来る場面を予測する',
        details: [
          'ボールが味方の足元に入った瞬間、次に自分が受ける場面を予測',
          '動き出す方向を指差しで宣言し、出し手に意思を伝える',
          '「パスが来なかった場合」も原因を分析して次の動きに活かす',
        ],
      },
    ],
  },
};

// ─── ポジションタブ切替 ─────────────────────────────────
function switchPosTab(posId, btn) {
  document.querySelectorAll('.pos-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('#pos-tabs .pos-tab-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('pos-' + posId);
  if (el) el.classList.add('active');
  if (btn) btn.classList.add('active');
}

// ─── 状態の読み込み ────────────────────────────────────
function loadPosState(posId) {
  try {
    const raw = localStorage.getItem('fep_pos_state_' + posId);
    if (raw) return JSON.parse(raw);
  } catch(e) {}
  const count = positionMenus[posId]?.items?.length || 4;
  return { checks: new Array(count).fill(false), note: '' };
}

// ─── 状態の保存 ────────────────────────────────────────
function savePosState(posId) {
  const container = document.getElementById('pos-' + posId);
  if (!container) return;

  const checks = Array.from(container.querySelectorAll('.todo-list input[type="checkbox"]'))
    .map(cb => cb.checked);
  const note = document.getElementById(posId + '-note')?.value || '';

  localStorage.setItem('fep_pos_state_' + posId, JSON.stringify({ checks, note }));

  // フィードバック
  const btn = container.querySelector('.todo-actions .btn-primary');
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = '✅ 保存しました';
    btn.disabled = true;
    setTimeout(() => { btn.textContent = orig; btn.disabled = false; }, 2000);
  }
}

// ─── チェック変更時 ────────────────────────────────────
function onTodoChange(posId, idx, cb) {
  const item = cb.closest('.todo-item');
  if (item) {
    item.classList.toggle('todo-done', cb.checked);
  }
}

// ─── リセット ──────────────────────────────────────────
function resetPosState(posId) {
  if (!confirm('チェックとメモをリセットしますか？')) return;
  localStorage.removeItem('fep_pos_state_' + posId);
  renderPosContent(posId);
}

// ─── コンテンツ描画 ────────────────────────────────────
function renderPosContent(posId) {
  const container = document.getElementById('pos-' + posId);
  if (!container) return;

  const data = positionMenus[posId];
  if (!data) return;

  const state = loadPosState(posId);

  const tagsHtml = data.tags
    .map(t => `<span>${escPosHtml(t)}</span>`)
    .join('');

  const todosHtml = data.items.map((item, i) => {
    const isChecked = state.checks[i] === true;
    const checkedAttr = isChecked ? ' checked' : '';
    const doneClass   = isChecked ? ' todo-done' : '';

    const hasDetails = item.details && item.details.length > 0;
    const detailsHtml = hasDetails
      ? `<details>
           <summary>詳細を見る</summary>
           <ul>${item.details.map(d => `<li>${escPosHtml(d)}</li>`).join('')}</ul>
         </details>`
      : '';

    return `
      <div class="todo-item${doneClass}">
        <label>
          <input type="checkbox"${checkedAttr} onchange="onTodoChange('${posId}', ${i}, this)">
          <span class="todo-title">${escPosHtml(item.title)}</span>
        </label>
        <p class="todo-sub">${escPosHtml(item.sub)}</p>
        ${detailsHtml}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="simple-pos-header">
      <h3>${data.icon} ${escPosHtml(data.title)}</h3>
      <p>テーマ：${escPosHtml(data.theme)}</p>
      <div class="simple-tags">${tagsHtml}</div>
    </div>

    <div class="todo-list">
      ${todosHtml}
    </div>

    <div class="todo-note-box">
      <label for="${posId}-note">今日のメモ</label>
      <textarea id="${posId}-note" placeholder="気づいたことを記録しておきましょう">${escPosHtml(state.note || '')}</textarea>
    </div>

    <div class="todo-actions">
      <button class="btn btn-primary" onclick="savePosState('${posId}')">💾 保存</button>
      <button class="btn btn-secondary" onclick="resetPosState('${posId}')">リセット</button>
    </div>
  `;
}

// ─── 初期化 ──────────────────────────────────────────────
function initPositionPage() {
  POS_KEYS.forEach(posId => renderPosContent(posId));

  // GK タブをアクティブに
  const firstBtn = document.querySelector('#pos-tabs .pos-tab-btn');
  if (firstBtn) switchPosTab('gk', firstBtn);
}
