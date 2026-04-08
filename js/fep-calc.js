// ══════════════════════════════════════════════════════════════
// FEP-CALC.JS — VFE / EFE / F' / EU 独立計算モジュール
// ══════════════════════════════════════════════════════════════
//
// Inflexion Index V2.0 の正式な計算式を実装。
// 技術ドキュメント準拠:
//   - Inflexion_Index_技術ドキュメント.docx (V2.0)
//   - F_prime_v2_calculation_logic.docx
//   - スコア解説
//
// ── 計算フロー ─────────────────────────────────────────────
//   EFE入力 → VFE入力 → F'計算 → EU統合
//
// ── スコア命名規約 (V2.0) ─────────────────────────────────
//   _raw     : ユーザー入力からの直接計算結果
//   _adj     : パラメータ調整後の中間値
//   _display : 0-100スケールの最終表示スコア
//
// ══════════════════════════════════════════════════════════════
//
// ── VFE (Variational Free Energy) ──────────────────────────
//   sigmoid(x) = 1 / (1 + exp(-0.8 * (x - 5.0)))
//   F = w_c * sigmoid(complexity) + w_a * sigmoid(accuracy)
//   F_display = F * 100
//
// ── EFE (Expected Free Energy) ─────────────────────────────
//   epi_score = (q1 + q2) / 2       ... ambiguity（認識的負荷）
//   pra_score = (q3 + q4) / 2       ... risk（実行的負荷）
//   efe_score = (epi + pra) / 2
//   efe_display = efe_score * 10    ... 0-100, 高いほど悪い
//   epi_c = tanh((epi - 5) / 2.5)
//   pra_c = tanh((pra - 5) / 2.5)
//   EFE_raw = -alpha * epi_c - beta * pra_c
//   EFE_display = rescale(EFE_raw, [-max_raw, max_raw], [100, 0])
//
// ── F' (Emotional Reactivity) v2 ───────────────────────────
//   bipolar(x) = (x - 5) / 5
//   F'_raw = 0.25*q1 + 0.50*q2 + 0.25*q3   clip[-1, +1]
//   reactivity = min(1 + 0.3*λ_n + 0.5*u_state, 2.0)
//   F'_effective = clip(F'_raw * reactivity, -2, +2)
//
// ── EU (Estimation Uncertainty) ────────────────────────────
//   f_sigmoid = 100 / (1 + exp(1.2 * F'))
//   sigma_shift = rescale(σ, [0.01, 10.0], [-10, +10])
//   sigma_display = clip(f_sigmoid + sigma_shift, 0, 100)
//   σ更新: ln(σ_new) = ln(σ) + 0.5 * F'
//
// ── 神経修飾系マッピング ─────────────────────────────────────
//   セロトニン系 → σ (精度重み): コンディション良好 → σ↑
//   オキシトシン系 → λ (感情反応性): 安心型声かけ → λ↓
//   ドーパミン系 → F' (感情価): 期待感/楽しさ → F'↑
//
// ══════════════════════════════════════════════════════════════

const FepCalc = (() => {
  'use strict';

  // ── 定数 ──────────────────────────────────────────────────

  // VFE sigmoid パラメータ
  const SIGMOID_K  = 0.8;
  const SIGMOID_X0 = 5.0;

  // VFE weight_value (-2〜+2) → (w_c, w_a)
  const WEIGHTS_MAP = {
     2: [0.8, 0.2],
     1: [0.7, 0.3],
     0: [0.6, 0.4],
    '-1': [0.5, 0.5],
    '-2': [0.4, 0.6],
  };

  // F' v2 の設問重み
  const F_PRIME_WEIGHTS = {
    hope_fear:          0.25,  // Q1: 過去→現在
    happy_unhappy:      0.50,  // Q2: 現在の状態（最重要）
    relief_disappoint:  0.25,  // Q3: 現在→未来
  };

  // F' v2 反応性パラメータ
  const K_LAMBDA        = 0.3;   // λ（特性的反応性）の寄与係数
  const K_U             = 0.5;   // u（状態不安定性）の寄与係数
  const REACTIVITY_MAX  = 2.0;   // 反応性の上限

  // EU sigmoid パラメータ
  const EU_SIGMOID_K    = 1.2;

  // σ 更新の学習率
  const LAMBDA_NARROW   = 0.5;

  // σ スケーリング範囲
  const SIGMA_SCALED_MIN = 0.01;
  const SIGMA_SCALED_MAX = 10.0;

  // VFE スコアラベル
  const VFE_BANDS = [
    { max: 20, label: '非常に安定', color: '#059669', bg: '#d1fae5' },
    { max: 40, label: '安定',       color: '#10b981', bg: '#d1fae5' },
    { max: 60, label: 'やや混乱',   color: '#f59e0b', bg: '#fef3c7' },
    { max: 80, label: '混乱が強い', color: '#ef4444', bg: '#fee2e2' },
    { max: Infinity, label: '非常に混乱が強い', color: '#991b1b', bg: '#fee2e2' },
  ];

  // 共通スコア解釈バンド (EFE / EU にも適用)
  const SCORE_BANDS = [
    { max: 20, label: '非常に低い' },
    { max: 40, label: '低い' },
    { max: 60, label: '普通' },
    { max: 80, label: '高い' },
    { max: Infinity, label: '非常に高い' },
  ];

  // ══════════════════════════════════════════════════════════
  // ユーティリティ
  // ══════════════════════════════════════════════════════════

  function sigmoid(x) {
    return 1.0 / (1.0 + Math.exp(-SIGMOID_K * (x - SIGMOID_X0)));
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /** 線形リスケール: [inMin, inMax] → [outMin, outMax] */
  function rescale(v, inMin, inMax, outMin, outMax) {
    if (inMax === inMin) return (outMin + outMax) / 2;
    return outMin + (v - inMin) / (inMax - inMin) * (outMax - outMin);
  }

  /** バイポーラ変換: [0, 10] → [-1, +1] */
  function bipolar(x) {
    return (x - 5.0) / 5.0;
  }

  function round1(v) {
    return Math.round(v * 10) / 10;
  }

  function round2(v) {
    return Math.round(v * 100) / 100;
  }

  function interpolateWeights(weightValue) {
    const wv = clamp(weightValue, -2, 2);
    const floor = Math.floor(wv);
    const ceil  = Math.ceil(wv);
    if (floor === ceil) return [...(WEIGHTS_MAP[floor] || [0.6, 0.4])];
    const frac = wv - floor;
    const [wc_f, wa_f] = WEIGHTS_MAP[floor] || [0.6, 0.4];
    const [wc_c, wa_c] = WEIGHTS_MAP[ceil]  || [0.6, 0.4];
    return [wc_f + frac * (wc_c - wc_f), wa_f + frac * (wa_c - wa_f)];
  }

  function getBand(score) {
    return VFE_BANDS.find(b => score < b.max) || VFE_BANDS[VFE_BANDS.length - 1];
  }

  function getScoreBand(score) {
    return SCORE_BANDS.find(b => score < b.max) || SCORE_BANDS[SCORE_BANDS.length - 1];
  }

  // ══════════════════════════════════════════════════════════
  // VFE (Variational Free Energy) — 短期的ズレ
  // ══════════════════════════════════════════════════════════
  //
  // 技術ドキュメント §4.3 準拠
  // sigmoid(x) = 1 / (1 + exp(-0.8 * (x - 5)))
  // F = w_c * norm_c + w_a * norm_a
  // F_display = F * 100

  /**
   * VFE (F_display) を計算する
   * @param {number} complexity  - 難易度 (0-10)
   * @param {number} accuracy    - 精度 (0-10)
   * @param {number} weightValue - 処理バイアス (-2〜+2): +2=トップダウン, -2=ボトムアップ
   * @returns {{ vfe_raw: number, vfe_display: number, norm_c: number, norm_a: number, w_c: number, w_a: number }}
   */
  function calcVFE(complexity, accuracy, weightValue = 0) {
    const norm_c = sigmoid(complexity);
    const norm_a = sigmoid(accuracy);
    const [w_c, w_a] = interpolateWeights(weightValue);
    const vfe_raw = w_c * norm_c + w_a * norm_a;  // 0〜1
    const vfe_display = vfe_raw * 100;             // 0〜100
    return {
      vfe_raw:     round2(vfe_raw),
      vfe_display: round1(vfe_display),
      norm_c: round2(norm_c),
      norm_a: round2(norm_a),
      w_c: round2(w_c),
      w_a: round2(w_a),
      // レガシー互換
      score: round1(vfe_display),
    };
  }

  // ══════════════════════════════════════════════════════════
  // EFE (Expected Free Energy) — 将来に向けた見通しの悪さ＋動きにくさ
  // ══════════════════════════════════════════════════════════
  //
  // Active Inference の EFE を実用的に再定義:
  //   EFE = ambiguity (認識的負荷) + risk (実行的負荷)
  //
  // 設問はすべて「高いほど悪い」(0=良い, 10=悪い) に統一:
  //   q1: 不明確さ     (0=やることが見えている, 10=何も分からない)
  //   q2: 情報を求めなさ (0=積極的に知りたい, 10=求めていない)
  //   q3: 目標優先度の低さ (0=とても大切, 10=優先ではない)
  //   q4: 取り組みにくさ  (0=なんでも取り組める, 10=動けない)
  //
  // 2軸スコア:
  //   epi_score = (q1 + q2) / 2   ... ambiguity (認識的負荷)
  //   pra_score = (q3 + q4) / 2   ... risk      (実行的負荷)
  //   efe_score = (epi_score + pra_score) / 2
  //   efe_display = efe_score * 10  ... 0-100 表示
  //
  // 解釈:
  //   0-20  : とても低い（明確で前向き）
  //   21-40 : 低い
  //   41-60 : 中等度
  //   61-80 : 高い
  //   81-100: とても高い（曖昧で動きにくい）

  /**
   * EFE を計算する（加算モデル v3）
   *
   * 全入力 0-10、高いほど悪い。
   * @param {number} q1 - 不明確さ (0=見えている, 10=分からない)
   * @param {number} q2 - 情報を求めなさ (0=知りたい, 10=求めていない)
   * @param {number} q3 - 目標優先度の低さ (0=大切, 10=優先ではない)
   * @param {number} q4 - 取り組みにくさ (0=取り組める, 10=動けない)
   * @returns {{ efe_raw: number, efe_display: number, epi_score: number, pra_score: number,
   *             dominant: string, score: number }}
   */
  function calcEFE(q1, q2, q3, q4) {
    // 2軸スコア (0-10)
    const epi_score = (q1 + q2) / 2;   // ambiguity: 認識的負荷
    const pra_score = (q3 + q4) / 2;   // risk: 実行的負荷

    // 統合スコア (0-10)
    const efe_score = (epi_score + pra_score) / 2;

    // 表示スコア (0-100): 高いほど見通しが悪く動きにくい
    const efe_display = efe_score * 10;

    // どちらの負荷が大きいか
    const diff = epi_score - pra_score;
    let dominant = 'balanced';
    if (diff > 1.5)      dominant = 'epistemic';   // 認識面の課題が優位
    else if (diff < -1.5) dominant = 'pragmatic';   // 実行面の課題が優位

    return {
      efe_raw:     round2(efe_score),
      efe_display: round1(clamp(efe_display, 0, 100)),
      epi_score:   round2(epi_score),
      pra_score:   round2(pra_score),
      dominant,
      // レガシー互換
      score:       round1(clamp(efe_display, 0, 100)),
      // 旧キー互換（参照箇所があれば壊れないように）
      epi:   round2(epi_score),
      pra:   round2(pra_score),
      alpha: round2(epi_score / 10 * 1.5 + 0.5), // 参考値: 0.5-2.0 レンジに換算
      beta:  round2(pra_score / 10 * 1.5 + 0.5), // 参考値: 0.5-2.0 レンジに換算
    };
  }

  /**
   * EFE の中間値を返す（F' の u_state 計算に使用）
   *
   * 新モデルでは epi_score / pra_score をそのまま渡す。
   * u_state = 1 - certainty の計算に使われる。
   * 高い epi_score / pra_score = 高い負荷 = 低い確信 = 高い u_state。
   *
   * @param {number} q1 - 不明確さ (0-10)
   * @param {number} q2 - 情報を求めなさ (0-10)
   * @param {number} q3 - 目標優先度の低さ (0-10)
   * @param {number} q4 - 取り組みにくさ (0-10)
   * @returns {{ epi: number, pra: number, norm_epi: number, norm_pra: number }}
   */
  function calcEFEIntermediate(q1, q2, q3, q4) {
    const epi_score = (q1 + q2) / 2;
    const pra_score = (q3 + q4) / 2;
    return {
      epi:      round2(epi_score),
      pra:      round2(pra_score),
      norm_epi: round2(epi_score / 10),
      norm_pra: round2(pra_score / 10),
    };
  }

  // ══════════════════════════════════════════════════════════
  // F' (Emotional Reactivity) v2 — 感情自由エネルギー変化率
  // ══════════════════════════════════════════════════════════
  //
  // F_prime_v2_calculation_logic.docx 準拠
  //
  // Step 1: F'_raw = clip(0.25*q1 + 0.50*q2 + 0.25*q3, -1, +1)
  //   q_i = bipolar(score_i) = (score_i - 5) / 5
  //
  // Step 2: reactivity = min(1 + K_λ * λ_n + K_u * u, R_max)
  //   λ_n = lambda_raw / 10
  //   u = (norm_epi + norm_pra) / 2  ... 高負荷 = 高 u_state
  //
  // Step 3: F'_effective = clip(F'_raw * reactivity, -2, +2)

  /**
   * F' (感情反応性) を計算する — v2 加算反応性モデル
   * @param {number} hopeFear         - Q1: hope/fear (0-10)
   * @param {number} happyUnhappy     - Q2: happy/unhappy (0-10)
   * @param {number} reliefDisappoint - Q3: relief/disappoint (0-10)
   * @param {number} lambdaRaw        - λ 特性的反応性 (0-10)
   * @param {number} epi              - EFE中間値 epi (0-10)
   * @param {number} pra              - EFE中間値 pra (0-10)
   * @returns {{ f_prime_raw: number, f_prime_effective: number, reactivity: number,
   *             valence: number, arousal: number, q1: number, q2: number, q3: number,
   *             lambda_n: number, u_state: number }}
   */
  function calcFPrime(hopeFear, happyUnhappy, reliefDisappoint, lambdaRaw = 5, epi = 5, pra = 5) {
    // Step 1: F'_raw
    const q1 = bipolar(hopeFear);
    const q2 = bipolar(happyUnhappy);
    const q3 = bipolar(reliefDisappoint);
    const f_prime_raw = clamp(
      F_PRIME_WEIGHTS.hope_fear * q1
      + F_PRIME_WEIGHTS.happy_unhappy * q2
      + F_PRIME_WEIGHTS.relief_disappoint * q3,
      -1.0, 1.0
    );

    // Step 2: Reactivity (加算モデル)
    const lambda_n = clamp(lambdaRaw / 10, 0, 1);
    const norm_epi = clamp(epi / 10, 0, 1);
    const norm_pra = clamp(pra / 10, 0, 1);
    // 新EFEモデル: 高 epi/pra = 高負荷 = 低確信 → u_state は負荷そのもの
    const u_state = (norm_epi + norm_pra) / 2;
    const reactivity = Math.min(1.0 + K_LAMBDA * lambda_n + K_U * u_state, REACTIVITY_MAX);

    // Step 3: F'_effective
    const f_prime_effective = clamp(f_prime_raw * reactivity, -2.0, 2.0);

    // 派生値
    const valence = f_prime_effective;  // 感情の方向性
    const arousal = Math.abs(f_prime_effective);  // 感情の強度

    return {
      f_prime_raw:       round2(f_prime_raw),
      f_prime_effective: round2(f_prime_effective),
      f_prime_display:   round1(rescale(f_prime_effective, -2.0, 2.0, 0, 100)),
      reactivity:        round2(reactivity),
      valence:           round2(valence),
      arousal:           round2(arousal),
      q1: round2(q1),
      q2: round2(q2),
      q3: round2(q3),
      lambda_n: round2(lambda_n),
      u_state:  round2(u_state),
      // レガシー互換
      score: round2(f_prime_effective),
    };
  }

  // ══════════════════════════════════════════════════════════
  // EU (Estimation Uncertainty) — 不確実性の統合評価
  // ══════════════════════════════════════════════════════════
  //
  // 技術ドキュメント §4.5 準拠
  //
  // 個人パラメータ:
  //   σ (sigma)  : 0-10 → scaled 0.01-10.0  不確実性幅
  //   λ (lambda) : 0-10 → scaled 0.0-2.0    学習率（特性反応性）
  //   τ (tau)    : 0-10 → scaled -1.0-+1.0  バイアス（気分ベースライン）
  //
  // EU計算:
  //   f_sigmoid = 100 / (1 + exp(1.2 * F'))
  //   sigma_shift = rescale(σ_scaled, [0.01, 10.0], [-10, +10])
  //   sigma_display = clip(f_sigmoid + sigma_shift, 0, 100)
  //
  // σ更新（ベイズメタ学習）:
  //   ln(σ_new) = ln(σ) + 0.5 * F'
  //   σ_update = clip(exp(ln(σ_new)), 0.01, 10.0)

  /**
   * EU (Estimation Uncertainty) を計算する
   * @param {number} fPrimeEffective - F'_effective (-2〜+2)
   * @param {number} sigmaRaw        - σ 生値 (0-10)
   * @param {number} lambdaRaw       - λ 生値 (0-10)
   * @param {number} tauRaw          - τ 生値 (0-10)
   * @returns {{ eu_display: number, eu_raw: number, f_sigmoid: number,
   *             sigma_scaled: number, sigma_shift: number, sigma_display: number,
   *             sigma_update: number, sigma_update_raw: number,
   *             emo_display: number, mood_display: number }}
   */
  function calcEU(fPrimeEffective, sigmaRaw = 5, lambdaRaw = 5, tauRaw = 5) {
    // パラメータスケーリング
    const sigma_scaled  = rescale(sigmaRaw,  0, 10, SIGMA_SCALED_MIN, SIGMA_SCALED_MAX);
    const lambda_scaled = rescale(lambdaRaw, 0, 10, 0.0, 2.0);
    const tau_scaled    = rescale(tauRaw,    0, 10, -1.0, 1.0);

    // F' → sigmoid変換 (正のF' → 低EU, 負のF' → 高EU)
    const f_sigmoid = 100.0 / (1.0 + Math.exp(EU_SIGMOID_K * fPrimeEffective));

    // σ シフト
    const sigma_shift = rescale(sigma_scaled, SIGMA_SCALED_MIN, SIGMA_SCALED_MAX, -10, 10);

    // sigma_display (= eu_display)
    const sigma_display = clamp(f_sigmoid + sigma_shift, 0, 100);

    // σ 更新 (ベイズメタ学習)
    const ln_sigma_new = Math.log(sigma_scaled) + LAMBDA_NARROW * fPrimeEffective;
    const sigma_update = clamp(Math.exp(ln_sigma_new), SIGMA_SCALED_MIN, SIGMA_SCALED_MAX);
    // sigma_update を 0-10 生値に逆変換
    const sigma_update_raw = rescale(sigma_update, SIGMA_SCALED_MIN, SIGMA_SCALED_MAX, 0, 10);

    // 派生スコア
    // emo_score: λ と τ から感情反応性を算出
    const emo_raw = Math.tanh(lambda_scaled) * Math.exp(-Math.abs(tau_scaled));
    const emo_display = round1(rescale(clamp(emo_raw, 0.5, 3.5), 0.5, 3.5, 0, 10));

    // mood_score: τ のリスケール
    const mood_display = round1(rescale(tau_scaled, -1.0, 1.0, 0, 10));

    return {
      eu_display:       round1(sigma_display),
      eu_raw:           round2(sigma_update),
      f_sigmoid:        round1(f_sigmoid),
      sigma_scaled:     round2(sigma_scaled),
      sigma_shift:      round2(sigma_shift),
      sigma_display:    round1(sigma_display),
      sigma_update:     round2(sigma_update),
      sigma_update_raw: round1(sigma_update_raw),
      emo_display,
      mood_display,
      // レガシー互換
      score: round1(sigma_display),
    };
  }

  // ══════════════════════════════════════════════════════════
  // Coach σ/λ/τ 表示スコア
  // ══════════════════════════════════════════════════════════

  /**
   * コーチ観察の σ/λ/τ から表示スコアを計算する
   * @param {number} sigmaRaw  - σ ばらつき (0-10)
   * @param {number} lambdaRaw - λ 修正速度 (0-10)
   * @param {number} tauRaw    - τ タイミング (0-10, 5=最適)
   * @returns {{ score: number, sigmaC: number, lambdaC: number, tauC: number }}
   */
  function calcCoachScore(sigmaRaw, lambdaRaw, tauRaw) {
    const sigmaC  = sigmaRaw / 10 * 100;
    const lambdaC = lambdaRaw / 10 * 100;
    const tauC    = Math.abs(tauRaw - 5) / 5 * 100;
    const score   = sigmaC * 0.5 + lambdaC * 0.3 + tauC * 0.2;
    return {
      score:   round1(score),
      sigmaC:  round1(sigmaC),
      lambdaC: round1(lambdaC),
      tauC:    round1(tauC),
    };
  }

  // ══════════════════════════════════════════════════════════
  // 統合計算 — 全スコアを一括算出
  // ══════════════════════════════════════════════════════════

  /**
   * 全スコアを一括計算する
   * @param {object} input - 入力値
   * @param {number} input.epiQ1       - EFE Q1 (0-10)
   * @param {number} input.epiQ2       - EFE Q2 (0-10)
   * @param {number} input.praQ3       - EFE Q3 (0-10)
   * @param {number} input.praQ4       - EFE Q4 (0-10)
   * @param {number} input.complexity  - VFE complexity (0-10)
   * @param {number} input.accuracy    - VFE accuracy (0-10)
   * @param {number} input.weightValue - VFE weight (-2〜+2)
   * @param {number} input.hopeFear    - F' Q1 (0-10)
   * @param {number} input.happyUnhappy - F' Q2 (0-10)
   * @param {number} input.reliefDisappoint - F' Q3 (0-10)
   * @param {number} input.sigmaRaw    - σ (0-10)
   * @param {number} input.lambdaRaw   - λ (0-10)
   * @param {number} input.tauRaw      - τ (0-10)
   * @returns {{ vfe: object, efe: object, fPrime: object, eu: object }}
   */
  function calcAll(input) {
    const {
      epiQ1 = 5, epiQ2 = 5, praQ3 = 5, praQ4 = 5,
      complexity = 5, accuracy = 5, weightValue = 0,
      hopeFear = 5, happyUnhappy = 5, reliefDisappoint = 5,
      sigmaRaw = 5, lambdaRaw = 5, tauRaw = 5,
    } = input;

    // 1. EFE
    const efe = calcEFE(epiQ1, epiQ2, praQ3, praQ4);

    // 2. VFE
    const vfe = calcVFE(complexity, accuracy, weightValue);

    // 3. F' (EFE中間値を使用)
    const efeInter = calcEFEIntermediate(epiQ1, epiQ2, praQ3, praQ4);
    const fPrime = calcFPrime(
      hopeFear, happyUnhappy, reliefDisappoint,
      lambdaRaw, efeInter.epi, efeInter.pra
    );

    // 4. EU
    const eu = calcEU(fPrime.f_prime_effective, sigmaRaw, lambdaRaw, tauRaw);

    return { vfe, efe, fPrime, eu };
  }

  // ══════════════════════════════════════════════════════════
  // 神経修飾系 → パラメータ変換
  // ══════════════════════════════════════════════════════════

  /**
   * コンディション（セロトニン系）→ σ への影響
   * @param {number} condition - コンディション (0-10)
   * @returns {number} σ への修飾値 (-2〜+2)
   */
  function serotoninToSigma(condition) {
    return (condition - 5) / 2.5;
  }

  /**
   * 安心型声かけ（オキシトシン系）→ λ への影響
   * @param {string} coachingType - 'safe' | 'explore' | 'challenge' | 'positive'
   * @returns {number} λ の修飾値 (-2〜+2)
   */
  function oxytocinToLambda(coachingType) {
    const map = { safe: -2, explore: -1, positive: 0, challenge: 2 };
    return map[coachingType] ?? 0;
  }

  /**
   * 期待感・楽しさ（ドーパミン系）→ F' への影響
   * @param {number} expectation - 期待感 (0-10)
   * @returns {number} F' へのポジティブバイアス (0〜+2)
   */
  function dopamineToFPrime(expectation) {
    return (expectation / 10) * 2;
  }

  // ══════════════════════════════════════════════════════════
  // Public API
  // ══════════════════════════════════════════════════════════

  return {
    // 個別計算
    calcVFE,
    calcEFE,
    calcEFEIntermediate,
    calcFPrime,
    calcEU,
    calcCoachScore,

    // 統合計算
    calcAll,

    // 神経修飾系
    serotoninToSigma,
    oxytocinToLambda,
    dopamineToFPrime,

    // ユーティリティ
    sigmoid,
    clamp,
    rescale,
    bipolar,
    interpolateWeights,
    getBand,
    getScoreBand,

    // 定数
    F_PRIME_WEIGHTS,
    VFE_BANDS,
    SCORE_BANDS,
    K_LAMBDA,
    K_U,
    REACTIVITY_MAX,
    EU_SIGMOID_K,
    LAMBDA_NARROW,
  };
})();
