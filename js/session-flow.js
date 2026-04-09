// ══════════════════════════════════════════════════════════════
// SESSION-FLOW.JS — セッションフロー管理
// ══════════════════════════════════════════════════════════════
//
// 3ステップのセッションフローを管理:
//   ① MTG後チェック → ② 練習後チェック（VFE + F'） → ③ 結果・提案
//
// 別ページ（フロー外）:
//   - コーチ記録（session-coach-record）
//   - EFE月次記録（session-efe）
//
// セッションデータは sessionState に一時保存し、
// 各ステップ完了時に Supabase へ永続化する。
// ══════════════════════════════════════════════════════════════

const SessionFlow = (() => {
  'use strict';

  // ── ステップ定義 ──────────────────────────────────────────
  const STEPS = [
    { id: 'pre-check',   label: 'MTG後チェック',   icon: '📋', page: 'session-pre-check' },
    { id: 'record',      label: '練習後チェック',  icon: '▶️', page: 'session-record' },
    { id: 'result',      label: '結果・提案',     icon: '📊', page: 'session-result' },
  ];

  // ── セッション状態 ────────────────────────────────────────
  let sessionState = createEmptyState();

  function createEmptyState() {
    return {
      id: null,
      groupId: null,
      memberId: null,
      startedAt: null,
      currentStep: 0,

      // ① MTG後チェック
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

      // ③ 振り返り（F'コンポーネント）— セッション記録ページで入力
      postEval: {
        dr: 5,              // 成長実感 (0-10) → F' component
        uh: 5,              // 満足感 (0-10) → F' component
        fh: 5,              // 次回期待 (0-10) → F' component
        enjoyment: 5,       // 楽しさ (0-10) → F' Q2（互換用）
        satisfaction: 5,    // 納得感 (0-10) → F' Q3（互換用）
      },

      // ③ 次回提案 (結果ページで計算)
      recommendation: null,

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

  // updateFollowup removed — followup merged into postEval (dr/uh/fh)

  // ── 計算の再実行 ──────────────────────────────────────────

  function recompute() {
    const s = sessionState;
    const c = s.computed;

    // ── 神経修飾系 ──
    c.sigmaModifier  = FepCalc.serotoninToSigma(s.preCheck.condition);
    c.lambdaModifier = FepCalc.oxytocinToLambda(s.record.coachingType);

    // ── EFE 計算 (加算モデル v3) ──
    // 全設問: 0=良い, 10=悪い に統一
    // q1=不明確さ, q2=情報を求めなさ, q3=目標優先度の低さ, q4=取り組みにくさ
    c.efe = FepCalc.calcEFE(
      s.preCheck.epiQ1,       // q1: 高い=不明確
      s.preCheck.epiQ2,       // q2: 高い=情報を求めない
      s.preCheck.praQ3,       // q3: 高い=目標が低い
      s.preCheck.praQ4,       // q4: 高い=取り組みにくい
    );

    // ── EFE 中間値 (F' の u_state 計算に使用) ──
    const efeInter = FepCalc.calcEFEIntermediate(
      s.preCheck.epiQ1,
      s.preCheck.epiQ2,
      s.preCheck.praQ3,
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
    sessionState.groupId = typeof GroupContext !== 'undefined' ? GroupContext.getActiveGroupId() : null;
    sessionState.memberId = typeof getActiveUserId === 'function' ? getActiveUserId() : null;
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
    recompute,
    renderProgressHtml,
  };
})();
