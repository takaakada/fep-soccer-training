// ══════════════════════════════════════════════════════════
// API CLIENT  (js/api-client.js)
// Inflexion Index (FE スコアアプリ) との通信モジュール
// ══════════════════════════════════════════════════════════

// ── Inflexion Index の Heroku URL ─────────────────────────
const INFLEXION_API_BASE = "https://inflexion-index-e231d56a5394.herokuapp.com";

// ── API 呼び出しの共通関数 ────────────────────────────────
/**
 * Inflexion Index API を叩く共通ヘルパー
 * @param {string} path  - 例: "/api/training/summary"
 * @param {string} method - "GET" | "POST"
 * @param {object} [body] - POST の場合のリクエストボディ
 * @returns {Promise<object>} レスポンス JSON
 */
async function callInflexionAPI(path, method = "GET", body = null) {
  // Supabase セッションからトークンを取得
  let token = null;
  if (typeof sb !== "undefined") {
    const { data } = await sb.auth.getSession();
    token = data?.session?.access_token ?? null;
  }

  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = "Bearer " + token;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(INFLEXION_API_BASE + path, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API エラー: ${res.status}`);
  }
  return res.json();
}

// ══════════════════════════════════════════════════════════
// 公開 API 関数
// ══════════════════════════════════════════════════════════

/**
 * FEP Training + Inflexion Index の統合サマリーを取得
 * 戻り値例:
 * {
 *   user_email: "user@example.com",
 *   fep_training: {
 *     total_sessions: 12,
 *     avg_score_pct: 78.5,
 *     recent_date: "2026-03-15",
 *     axis_averages: { jikoYosoku: 3.2, gosaNinshiki: 2.8, ... }
 *   },
 *   inflexion_index: {
 *     latest_score: 84,
 *     evaluated_at: "2026-02-20T10:30:00"
 *   }
 * }
 */
async function fetchTrainingSummary() {
  return callInflexionAPI("/api/training/summary");
}

/**
 * Training セッション一覧を取得
 */
async function fetchTrainingSessionsFromAPI() {
  return callInflexionAPI("/api/training/sessions");
}

/**
 * 週間まとめ一覧を取得
 */
async function fetchTrainingWeekliesFromAPI() {
  return callInflexionAPI("/api/training/weeklies");
}

// ══════════════════════════════════════════════════════════
// サマリーカードの表示（評価ページやダッシュボード用）
// ══════════════════════════════════════════════════════════

/**
 * FE スコアと Training スコアを統合表示するカードを生成して
 * 指定コンテナに挿入する
 * @param {string} containerId - 挿入先の要素 ID
 */
async function renderScoreSummaryCard(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // ローディング表示
  container.innerHTML = `
    <div class="concept-card" style="text-align:center;padding:24px;">
      <div style="font-size:1.5rem;margin-bottom:8px;">⏳</div>
      <p style="color:var(--text-muted);font-size:0.9rem;">スコアを読み込み中...</p>
    </div>`;

  try {
    const data = await fetchTrainingSummary();
    const fep  = data.fep_training      || {};
    const fe   = data.inflexion_index   || {};

    const avgPct     = fep.avg_score_pct  ?? "–";
    const totalSess  = fep.total_sessions ?? 0;
    const recentDate = fep.recent_date
      ? new Date(fep.recent_date).toLocaleDateString("ja-JP")
      : "–";
    const feScore    = fe.latest_score ?? "–";
    const feDate     = fe.evaluated_at
      ? new Date(fe.evaluated_at).toLocaleDateString("ja-JP")
      : "–";

    // 5軸の平均
    const axes = fep.axis_averages || {};
    const axisLabels = {
      jikoYosoku:    "自己予測",
      gosaNinshiki:  "誤差認識",
      shuseiryoku:   "修正力",
      tekioryoku:    "適応力",
      kyochosei:     "協調性",
    };
    const axisHtml = Object.entries(axisLabels).map(([key, label]) => {
      const val = axes[key] != null ? axes[key].toFixed(1) : "–";
      const pct = axes[key] != null ? Math.min(axes[key] / 5 * 100, 100) : 0;
      return `
        <div style="margin-bottom:6px;">
          <div style="display:flex;justify-content:space-between;font-size:0.8rem;margin-bottom:2px;">
            <span>${label}</span><span style="font-weight:700;">${val} / 5</span>
          </div>
          <div style="background:var(--border);border-radius:4px;height:6px;">
            <div style="background:var(--primary);width:${pct}%;height:6px;border-radius:4px;transition:width 0.5s;"></div>
          </div>
        </div>`;
    }).join("");

    container.innerHTML = `
      <div class="concept-card">
        <h3 style="margin-bottom:16px;">📊 スコアサマリー</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
          <div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">FEP 平均スコア</div>
            <div style="font-size:2rem;font-weight:900;color:var(--primary);">${avgPct}<span style="font-size:0.9rem;">%</span></div>
            <div style="font-size:0.72rem;color:var(--text-muted);">${totalSess} セッション｜最終: ${recentDate}</div>
          </div>
          <div style="background:var(--bg);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:4px;">FE スコア（Inflexion）</div>
            <div style="font-size:2rem;font-weight:900;color:var(--accent);">${feScore}</div>
            <div style="font-size:0.72rem;color:var(--text-muted);">評価日: ${feDate}</div>
          </div>
        </div>
        <div>
          <div style="font-size:0.8rem;font-weight:700;color:var(--text-muted);margin-bottom:8px;">5 軸 平均</div>
          ${axisHtml}
        </div>
      </div>`;
  } catch (err) {
    console.warn("スコアサマリー取得失敗:", err);
    container.innerHTML = `
      <div class="concept-card" style="text-align:center;padding:20px;">
        <div style="color:var(--text-muted);font-size:0.88rem;">
          スコアデータを取得できませんでした。<br>
          <small>（ログイン後に表示されます）</small>
        </div>
      </div>`;
  }
}
