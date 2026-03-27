// ══════════════════════════════════════════════════════════════
// EVAL.JS  —  Inflexion Index VFE 評価シート
// ══════════════════════════════════════════════════════════════
//
// VFE計算式（既存 Inflexion Index アプリと同一）:
//   sigmoid(x) = 1 / (1 + exp(-0.8 * (x - 5)))   ← k=0.8, x0=5
//
//   weight_value による重みマップ（線形補間あり）:
//     +2 → (w_c=0.8, w_a=0.2)   イメージ偏重: complexity重視
//     +1 → (w_c=0.7, w_a=0.3)
//      0 → (w_c=0.6, w_a=0.4)   バランス
//     -1 → (w_c=0.5, w_a=0.5)
//     -2 → (w_c=0.4, w_a=0.6)   感覚偏重: accuracy重視
//
//   F_display = (w_c * sigmoid(complexity) + w_a * sigmoid(accuracy)) * 100
//
// デュアル Supabase 書き込み:
//   sb    (Inflexion Index)      → assessments（選手VFE）
//                                → estimation_uncertainty（コーチ σ/λ/τ）
//   sbFep (FEP Soccer Training)  → training_sessions（フリーテキスト）
// ══════════════════════════════════════════════════════════════

// ── タブ切り替え ────────────────────────────────────────────
function switchEvalTab(tabId, btn) {
  document.querySelectorAll('.eval-sub-content').forEach(c => c.classList.remove('active'));
  document.querySelectorAll('.eval-sub-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('eval-sub-' + tabId).classList.add('active');
  if (btn) btn.classList.add('active');
  if (tabId === 'history') loadHistory();
}

// ── VFE ユーティリティ ───────────────────────────────────────

// Sigmoid変換（Inflexion Index アプリと同一パラメータ）
function vfeSigmoid(x) {
  return 1.0 / (1.0 + Math.exp(-0.8 * (x - 5.0)));
}

// weight_value (-2〜+2) から (w_c, w_a) を線形補間で取得
const VFE_WEIGHTS_MAP = { 2: [0.8, 0.2], 1: [0.7, 0.3], 0: [0.6, 0.4], '-1': [0.5, 0.5], '-2': [0.4, 0.6] };

function interpolateVfeWeights(weight_value) {
  const floor = Math.floor(weight_value);
  const ceil  = Math.ceil(weight_value);
  if (floor === ceil) {
    return VFE_WEIGHTS_MAP[floor] || [0.6, 0.4];
  }
  const frac = weight_value - floor;
  const [wc_f, wa_f] = VFE_WEIGHTS_MAP[floor] || [0.6, 0.4];
  const [wc_c, wa_c] = VFE_WEIGHTS_MAP[ceil]  || [0.6, 0.4];
  return [wc_f + frac * (wc_c - wc_f), wa_f + frac * (wa_c - wa_f)];
}

function getVfeLabel(score) {
  if (score < 20) return '非常に安定';
  if (score < 40) return '安定';
  if (score < 60) return 'やや混乱';
  if (score < 80) return '混乱が強い';
  return '非常に混乱が強い';
}

function getVfeColor(score) {
  if (score < 20) return '#059669';
  if (score < 40) return '#10b981';
  if (score < 60) return '#f59e0b';
  if (score < 80) return '#ef4444';
  return '#991b1b';
}

function getVfeBgColor(score) {
  if (score < 40) return '#d1fae5';
  if (score < 60) return '#fef3c7';
  return '#fee2e2';
}

// ── VFEスコア表示HTML ────────────────────────────────────────
function renderVfeScoreHtml(score, components, role) {
  const label = getVfeLabel(score);
  const color = getVfeColor(score);
  const bg    = getVfeBgColor(score);
  const pct   = Math.round(score * 10) / 10;

  const compRows = components.map(c =>
    `<div class="vfe-comp-row">
      <span class="vfe-comp-name">${c.name}</span>
      <div class="vfe-comp-bar-wrap">
        <div class="vfe-comp-bar-fill" style="width:${Math.min(100, Math.round(c.pct))}%;background:${color}50"></div>
      </div>
      <span class="vfe-comp-val">${c.rawLabel}</span>
    </div>`
  ).join('');

  return `
    <div class="vfe-score-card" style="border-color:${color};background:${bg}20">
      <div class="vfe-score-top">
        <div>
          <div class="vfe-score-label-sm">${role === 'player' ? 'Player VFEスコア（F_display）' : 'Coach σ/λ/τ スコア'}</div>
          <div class="vfe-score-badge" style="color:${color};border-color:${color}">${label}</div>
        </div>
        <div class="vfe-score-number" style="color:${color}">${pct}<span style="font-size:1rem;font-weight:400"> / 100</span></div>
      </div>
      <div class="vfe-score-bar-track">
        <div class="vfe-score-bar-fill" style="width:${Math.min(100, pct)}%;background:${color}"></div>
      </div>
      <div class="vfe-comp-list" style="margin-top:12px">${compRows}</div>
      <p class="vfe-score-note">VFEスコアが高いほど混乱・不安定な状態を示します（0 = 非常に安定、100 = 非常に混乱）</p>
    </div>`;
}

// ── Player VFEスコア計算 ─────────────────────────────────────
// 既存 Inflexion Index アプリの fe_calculator.py と同一ロジック
function calcPlayerVfeScore() {
  const complexity   = parseFloat(document.getElementById('p-complexity')?.value ?? 5);
  const accuracy     = parseFloat(document.getElementById('p-accuracy')?.value ?? 5);
  const weight_value = parseFloat(document.getElementById('p-weight')?.value ?? 0);
  const dr_score     = parseFloat(document.getElementById('p-dr')?.value ?? 5);
  const uh_score     = parseFloat(document.getElementById('p-uh')?.value ?? 5);
  const fh_score     = parseFloat(document.getElementById('p-fh')?.value ?? 5);

  // Sigmoid変換
  const norm_c = vfeSigmoid(complexity);
  const norm_a = vfeSigmoid(accuracy);

  // weight_value で重み変換
  const [w_c, w_a] = interpolateVfeWeights(weight_value);

  // F_display = (w_c * norm_c + w_a * norm_a) * 100
  const F_display = (w_c * norm_c + w_a * norm_a) * 100;

  const el = document.getElementById('vfe-player-score-result');
  if (!el) return F_display;

  // F'（感情変化）表示用スコア（別途参考表示）
  const fPrimeAvg = (dr_score + uh_score + fh_score) / 3;

  const components = [
    { name: `complexity (w=${w_c.toFixed(2)})`, pct: norm_c * 100, rawLabel: `${complexity}/10` },
    { name: `accuracy   (w=${w_a.toFixed(2)})`, pct: norm_a * 100, rawLabel: `${accuracy}/10` },
    { name: 'dr 成長感 (F\'参考)',              pct: dr_score / 10 * 100, rawLabel: `${dr_score}/10` },
    { name: 'uh 満足度 (F\'参考)',              pct: uh_score / 10 * 100, rawLabel: `${uh_score}/10` },
    { name: 'fh 期待感 (F\'参考)',              pct: fh_score / 10 * 100, rawLabel: `${fh_score}/10` },
  ];

  el.innerHTML = renderVfeScoreHtml(F_display, components, 'player');
  return F_display;
}

// ── Coach σ/λ/τ スコア計算（表示用）─────────────────────────
// sigma_raw / lambda_raw は「高いほど混乱」として0-100で表示
// tau_raw は5が中心で両方向にズレるとスコア増
function calcCoachVfeScore() {
  const sigma_raw  = parseFloat(document.getElementById('c-sigma')?.value ?? 5);
  const lambda_raw = parseFloat(document.getElementById('c-lambda')?.value ?? 5);
  const tau_raw    = parseFloat(document.getElementById('c-tau')?.value ?? 5);

  // 表示用スコア（Inflexion Index アプリ内でより詳細計算が行われる）
  const sigmaC  = sigma_raw / 10 * 100;
  const lambdaC = lambda_raw / 10 * 100;
  const tauC    = Math.abs(tau_raw - 5) / 5 * 100;
  const displayScore = sigmaC * 0.5 + lambdaC * 0.3 + tauC * 0.2;

  const el = document.getElementById('vfe-coach-score-result');
  if (!el) return displayScore;

  const components = [
    { name: 'σ ばらつき (50%)', pct: sigmaC,  rawLabel: `${sigma_raw}/10` },
    { name: 'λ 修正速度 (30%)', pct: lambdaC, rawLabel: `${lambda_raw}/10` },
    { name: 'τ タイミング (20%)', pct: tauC,  rawLabel: `${tau_raw}/10` },
  ];

  el.innerHTML = renderVfeScoreHtml(displayScore, components, 'coach');
  return displayScore;
}

// ── セッション保存（デュアル Supabase）───────────────────────
async function saveVfeSession(role) {
  const isPlayer = role === 'player';

  const playerName = document.getElementById(isPlayer ? 'p-name' : 'c-name')?.value || '（未入力）';
  const date       = document.getElementById(isPlayer ? 'p-date' : 'c-date')?.value
                     || new Date().toISOString().slice(0, 10);
  const theme      = document.getElementById(isPlayer ? 'p-theme' : 'c-theme')?.value || '（未入力）';

  // ── ① Inflexion Index Supabase への書き込み ──────────────
  if (isPlayer) {
    const complexity   = parseFloat(document.getElementById('p-complexity').value);
    const accuracy     = parseFloat(document.getElementById('p-accuracy').value);
    const weight_value = parseFloat(document.getElementById('p-weight').value);
    const dr_score     = parseFloat(document.getElementById('p-dr').value);
    const uh_score     = parseFloat(document.getElementById('p-uh').value);
    const fh_score     = parseFloat(document.getElementById('p-fh').value);
    const F_display    = calcPlayerVfeScore();

    // Inflexion Index assessments テーブルへ
    await persistInflexionPlayerVfe({
      pid:          playerName,
      facility:     'soccer_training',
      input_date:   date,
      complexity, accuracy, weight_value,
      F_display:    Math.round(F_display * 10) / 10,
      dr_score, uh_score, fh_score,
    });

    // ── ② FEP Soccer Training → training_sessions（フリーテキスト）
    const notes = {
      maxZure:    document.getElementById('p-maxZure')?.value    || '',
      correction: document.getElementById('p-correction')?.value || '',
      nextTheme:  document.getElementById('p-nextTheme')?.value  || '',
      memo:       document.getElementById('p-memo')?.value       || '',
    };
    await persistSession({
      id: Date.now().toString(), sheetId: 'player-vfe',
      role: 'player', grade: 'vfe', playerName, date, theme,
      scores: { complexity, accuracy, weight_value, dr_score, uh_score, fh_score },
      total: Math.round(F_display * 10) / 10, maxScore: 100,
      notes, savedAt: new Date().toISOString(),
    });

    showVfeToast('toast-player', F_display, date);

  } else {
    const sigma_raw  = parseFloat(document.getElementById('c-sigma').value);
    const lambda_raw = parseFloat(document.getElementById('c-lambda').value);
    const tau_raw    = parseFloat(document.getElementById('c-tau').value);
    const displayScore = calcCoachVfeScore();

    // Inflexion Index estimation_uncertainty テーブルへ
    await persistInflexionCoachEval({
      pid:          playerName,
      facility:     'soccer_training',
      input_date:   date,
      sigma_raw, lambda_raw, tau_raw,
      evaluator_id: typeof currentUser !== 'undefined' && currentUser ? currentUser.email : '',
    });

    // ② FEP Soccer Training → training_sessions（コーチコメント）
    const notes = {
      good:      document.getElementById('c-good')?.value      || '',
      challenge: document.getElementById('c-challenge')?.value || '',
      nextTheme: document.getElementById('c-nextTheme')?.value || '',
    };
    await persistSession({
      id: Date.now().toString(), sheetId: 'coach-vfe',
      role: 'coach', grade: 'vfe', playerName, date, theme,
      scores: { sigma_raw, lambda_raw, tau_raw },
      total: Math.round(displayScore * 10) / 10, maxScore: 100,
      notes, savedAt: new Date().toISOString(),
    });

    showVfeToast('toast-coach', displayScore, date);
  }
}

function showVfeToast(toastId, score, date) {
  const pct   = Math.round(score * 10) / 10;
  const label = getVfeLabel(score);
  const mode  = (typeof sbFep !== 'undefined' && sbFep && typeof currentUser !== 'undefined' && currentUser)
                ? '☁ クラウドに保存' : '💾 ローカルに保存';
  const toast = document.getElementById(toastId);
  if (toast) {
    toast.innerHTML = `✅ ${mode}しました！　VFEスコア：${pct}/100（${label}）　記録日：${date}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 4500);
  }
}

// ── 履歴読み込み・表示 ───────────────────────────────────────
async function loadHistory() {
  const container = document.getElementById('history-list-container');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">読み込み中…</div>';

  const sessions = await fetchSessions();
  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="history-empty">
        <div class="big-icon">📋</div>
        <p>まだセッション記録がありません。</p>
        <p style="margin-top:8px;font-size:0.84rem">評価シートに記入後「💾 記録を保存」ボタンを押すと、ここに記録が表示されます。</p>
      </div>`;
    return;
  }

  const roleLabel = { player: '選手（自己評価）', coach: 'コーチ（観察評価）' };

  container.innerHTML = `<div class="history-list">${sessions.map(s => {
    const vfeScore = s.total;
    const color    = getVfeColor(vfeScore);
    const label    = getVfeLabel(vfeScore);
    const pct      = Math.round(vfeScore * 10) / 10;

    const scoreKeys = {
      complexity: 'complexity', accuracy: 'accuracy', weight_value: 'weight',
      dr_score: 'dr', uh_score: 'uh', fh_score: 'fh',
      sigma_raw: 'σ', lambda_raw: 'λ', tau_raw: 'τ',
    };
    let scoreDetail = '';
    if (typeof s.scores === 'object' && !Array.isArray(s.scores)) {
      scoreDetail = Object.entries(s.scores).map(([k, v]) =>
        `<span class="hist-score-chip">${scoreKeys[k] || k}: ${v}</span>`).join('');
    }

    const notesMap = { maxZure: '最大のズレ', correction: '修正方法', nextTheme: '次回テーマ', memo: 'メモ', good: 'よかった点', challenge: '課題' };
    const notesHtml = Object.entries(s.notes || {}).filter(([, v]) => v).map(([k, v]) =>
      `<div style="margin-bottom:6px"><span class="lbl">${notesMap[k] || k}</span><div class="hist-notes">${v}</div></div>`
    ).join('');

    return `
    <div class="hist-card ${s.role === 'coach' ? 'coach' : ''}" id="hcard-${s.id}">
      <div class="hist-card-header">
        <div style="flex:1;min-width:0">
          <div class="hist-card-title">${s.playerName} — ${s.theme}</div>
          <div class="hist-card-meta">${roleLabel[s.role] || s.role} ／ ${s.date}</div>
          <div class="hist-vfe-badge" style="color:${color};border-color:${color}">${label}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
          <div class="hist-card-score" style="color:${color}">${pct}/100</div>
          <div class="hist-vfe-bar-mini"><div style="width:${Math.min(100,pct)}%;background:${color}"></div></div>
          <div class="hist-card-actions">
            <button class="hist-btn" onclick="toggleHistDetail('${s.id}')">詳細</button>
            <button class="hist-btn del" onclick="deleteSession('${s.id}')">削除</button>
          </div>
        </div>
      </div>
      <div id="hdetail-${s.id}" class="hist-detail">
        <div class="hist-detail-grid">
          <div class="hist-detail-item"><span class="lbl">保存日時</span>${new Date(s.savedAt).toLocaleString('ja-JP')}</div>
          <div class="hist-detail-item"><span class="lbl">スコア内訳</span><div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px">${scoreDetail}</div></div>
        </div>
        ${notesHtml}
      </div>
    </div>`;
  }).join('')}</div>`;
}

// ── 詳細トグル ──────────────────────────────────────────────
function toggleHistDetail(id) {
  document.getElementById('hdetail-' + id)?.classList.toggle('open');
}

// ── セッション削除 ───────────────────────────────────────────
async function deleteSession(id) {
  if (!confirm('このセッション記録を削除しますか？')) return;
  await removeSession(id);
  loadHistory();
}

// ── 全データ削除 ─────────────────────────────────────────────
async function clearAllData() {
  if (!confirm('すべてのセッション記録を削除しますか？この操作は元に戻せません。')) return;
  localStorage.removeItem('fep_sessions');
  loadHistory();
}

// ── 選手フィルター ───────────────────────────────────────────
let playerFilterValue = '';

function filterByPlayer() {
  const filterInput = document.getElementById('player-filter-input');
  if (!filterInput) return;
  playerFilterValue = filterInput.value.toLowerCase().trim();
  document.querySelectorAll('#history-list-container .hist-card').forEach(card => {
    const title = card.querySelector('.hist-card-title')?.textContent?.toLowerCase() || '';
    card.style.display = (title.includes(playerFilterValue) || playerFilterValue === '') ? '' : 'none';
  });
}

function clearPlayerFilter() {
  playerFilterValue = '';
  const filterInput = document.getElementById('player-filter-input');
  if (filterInput) filterInput.value = '';
  document.querySelectorAll('#history-list-container .hist-card').forEach(card => card.style.display = '');
}

// ── ページ初期化 ─────────────────────────────────────────────
function initEvalPage() {
  const today = new Date().toISOString().slice(0, 10);
  const pDate = document.getElementById('p-date');
  const cDate = document.getElementById('c-date');
  if (pDate && !pDate.value) pDate.value = today;
  if (cDate && !cDate.value) cDate.value = today;

  calcPlayerVfeScore();
  calcCoachVfeScore();

  const activeTab = document.querySelector('.eval-sub-btn.active');
  if (activeTab?.textContent?.includes('履歴')) loadHistory();
}
