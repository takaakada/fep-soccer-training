// ══════════════════════════════════════════════════════════════
// SESSION-FLOW.JS — セッションフロー管理
// ══════════════════════════════════════════════════════════════
//
// 5ステップのセッションフローを管理:
//   ① 前チェック → ② セッション記録 → ③ 後評価 → ④ 次回提案 → ⑤ フォローアップ
//
// セッションデータは sessionState に一時保存し、
// 各ステップ完了時に Supabase へ永続化する。
// ══════════════════════════════════════════════════════════════

const SessionFlow = (() => {
  'use strict';

  // ── ステップ定義 ──────────────────────────────────────────
  const STEPS = [
    { id: 'pre-check',   label: '前チェック',     icon: '📋', page: 'session-pre-check' },
    { id: 'record',      label: 'セッション記録', icon: '▶️', page: 'session-record' },
    { id: 'post-eval',   label: '後評価',         icon: '📊', page: 'session-post-eval' },
    { id: 'recommend',   label: '次回提案',       icon: '🔮', page: 'session-recommend' },
    { id: 'followup',    label: 'フォローアップ', icon: '🔁', page: 'session-followup' },
  ];

  // ── セッション状態 ────────────────────────────────────────
  let sessionState = createEmptyState();

  function createEmptyState() {
    return {
      id: null,
      startedAt: null,
      currentStep: 0,

      // ① 前チェック
      preCheck: {
        condition: 5,       // コンディション (0-10) → セロトニン系 → σ
        expectation: 5,     // 期待感 (0-10) → ドーパミン系 → F' Q1
        epiQ1: 5,           // 情報理解度 (0-10) → EFE epistemic_raw
        epiQ2: 5,           // 情報の必要性 (0-10) → α 算出
        praQ3: 5,           // 目標達成見通し (0-10) → EFE pragmatic_raw
        praQ4: 5,           // 負担感 (0-10) → β 算出
      },

      // ② セッション記録
      record: {
        complexity: 5,      // VFE: 難易度 (0-10)
        accuracy: 50,       // VFE: 成功率 (0-100%)
        weightValue: 0,     // VFE: 重みバイアス (-2〜+2)
        menuName: '',
        purpose: [],        // ['安定化', '探索', ...]
        duration: 20,
        constraints: [],    // ['時間制限あり', ...]
        layer: '',          // 'L1' | 'L2' | 'L3' | 'L4'
        channels: [],       // ['視覚', '体性感覚', ...]
        coachingType: '',   // 'safe' | 'explore' | 'challenge' | 'positive'
        feedbackFreq: '',   // 'none' | 'few' | 'frequent'
      },

      // ③ 後評価
      postEval: {
        ease: 5,            // やりやすさ (0-10)
        difficulty: 5,      // 難しさの感覚 (0-10)
        enjoyment: 5,       // 楽しさ (0-10) → F' Q2
        satisfaction: 5,    // 納得感 (0-10) → F' Q3
        reproducibility: '',// 'できそう' | '少し不安' | '難しい'
      },

      // ④ 次回提案 (計算結果)
      recommendation: null,

      // ⑤ フォローアップ
      followup: {
        reproduced: '',     // 'yes' | 'partial' | 'no'
        transferable: '',   // 'yes' | 'unknown' | 'no'
        wantRepeat: '',     // 'yes' | 'no'
        anxietyChange: '',  // 'decreased' | 'same' | 'increased'
        painChange: '',     // 'gone' | 'same' | 'slight' | 'worse'
        notes: '',
      },

      // 計算結果キャッシュ
      computed: {
        vfe: null,
        efe: null,
        eu: null,
        fPrime: null,
        sigmaModifier: 0,
        lambdaModifier: 0,
      },
    };
  }

  // ── 状態管理 ──────────────────────────────────────────────

  function getState() {
    return sessionState;
  }

  function updatePreCheck(data) {
    Object.assign(sessionState.preCheck, data);
    recompute();
  }

  function updateRecord(data) {
    Object.assign(sessionState.record, data);
    recompute();
  }

  function updatePostEval(data) {
    Object.assign(sessionState.postEval, data);
    recompute();
  }

  function updateFollowup(data) {
    Object.assign(sessionState.followup, data);
  }

  // ── 計算の再実行 ──────────────────────────────────────────

  function recompute() {
    const s = sessionState;
    const c = s.computed;

    // ── 神経修飾系 ──
    c.sigmaModifier  = FepCalc.serotoninToSigma(s.preCheck.condition);
    c.lambdaModifier = FepCalc.oxytocinToLambda(s.record.coachingType);

    // ── EFE 計算 (正式版: 技術ドキュメント §4.2) ──
    // epiQ1 = 状態不確実性（理解度を反転: 理解度高い → 不確実性低い）
    // epiQ2 = 情報探索欲求
    // praQ3 = 目標の重要度（達成見通しを反転）
    // praQ4 = 実行コスト（負担感）
    c.efe = FepCalc.calcEFE(
      10 - s.preCheck.epiQ1,  // Q1: 理解度→反転して不確実性
      s.preCheck.epiQ2,       // Q2: 情報探索欲求
      10 - s.preCheck.praQ3,  // Q3: 達成見通し→反転して目標重要度
      s.preCheck.praQ4,       // Q4: 負担感（実行コスト）
    );

    // ── EFE 中間値 (F' の u_state 計算に使用) ──
    const efeInter = FepCalc.calcEFEIntermediate(
      10 - s.preCheck.epiQ1,
      s.preCheck.epiQ2,
      10 - s.preCheck.praQ3,
      s.preCheck.praQ4,
    );

    // ── σ にセロトニン修飾を適用 ──
    const effectiveSigmaRaw = FepCalc.clamp(5 + c.sigmaModifier * 2.5, 0, 10);

    // ── λ にオキシトシン修飾を適用 ──
    const effectiveLambdaRaw = FepCalc.clamp(5 + c.lambdaModifier * 2.5, 0, 10);

    // ── F' 計算 (正式版: F_prime_v2_calculation_logic) ──
    // Q1=期待感, Q2=楽しさ, Q3=納得感, + λ + EFE中間値
    c.fPrime = FepCalc.calcFPrime(
      s.preCheck.expectation,     // Q1: hope_fear（期待感）
      s.postEval.enjoyment,       // Q2: happy_unhappy（楽しさ）
      s.postEval.satisfaction,    // Q3: relief_disappoint（納得感）
      effectiveLambdaRaw,         // λ（オキシトシン修飾済み）
      efeInter.epi,               // EFE中間値 epi
      efeInter.pra,               // EFE中間値 pra
    );

    // ── VFE 計算 (正式版: 技術ドキュメント §4.3) ──
    const accuracyScale = s.record.accuracy / 10; // 0-100% → 0-10
    c.vfe = FepCalc.calcVFE(s.record.complexity, accuracyScale, s.record.weightValue);

    // ── EU 計算 (正式版: 技術ドキュメント §4.5) ──
    c.eu = FepCalc.calcEU(
      c.fPrime.f_prime_effective,  // F'_effective (-2〜+2)
      effectiveSigmaRaw,           // σ（セロトニン修飾済み）
      effectiveLambdaRaw,          // λ（オキシトシン修飾済み）
      5,                           // τ（デフォルト中央値）
    );
  }

  // ── ステップ進行 ──────────────────────────────────────────

  function getCurrentStep() {
    return STEPS[sessionState.currentStep];
  }

  function goToStep(index) {
    if (index >= 0 && index < STEPS.length) {
      sessionState.currentStep = index;
      return STEPS[index];
    }
    return null;
  }

  function nextStep() {
    return goToStep(sessionState.currentStep + 1);
  }

  function prevStep() {
    return goToStep(sessionState.currentStep - 1);
  }

  // ── セッション開始・リセット ──────────────────────────────

  function startSession() {
    sessionState = createEmptyState();
    sessionState.id = Date.now().toString();
    sessionState.startedAt = new Date().toISOString();
    return sessionState;
  }

  // ── プログレスバー HTML ───────────────────────────────────

  function renderProgressHtml(currentIndex) {
    const idx = currentIndex ?? sessionState.currentStep;
    return `<div class="sf-progress">${STEPS.map((step, i) => {
      let cls = 'sf-step';
      if (i < idx)  cls += ' done';
      if (i === idx) cls += ' active';
      const dotContent = i < idx ? '✓' : (i + 1);
      return `<div class="${cls}">
        <div class="sf-dot">${dotContent}</div>
        <span class="sf-step-label">${step.label}</span>
      </div>`;
    }).join('')}</div>`;
  }

  // ── Public API ────────────────────────────────────────────

  return {
    STEPS,
    getState,
    startSession,
    getCurrentStep,
    goToStep,
    nextStep,
    prevStep,
    updatePreCheck,
    updateRecord,
    updatePostEval,
    updateFollowup,
    recompute,
    renderProgressHtml,
  };
})();
