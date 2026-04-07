// ══════════════════════════════════════════════════════════
// INDIVIDUAL ERROR PLANS  (js/individual-plans.js)
// ══════════════════════════════════════════════════════════
// 5つの典型的エラーパターンと解決プラン
// Google Sheets「individual_error_master」と同じ構造

// ─── 問題番号マスター ────────────────────────────────────────
const PROBLEM_MASTER = {
  P1:  '予測はズレる',
  P2:  '感覚は不正確',
  P3:  '情報が多すぎる',
  P4:  '反応は遅い',
  P5:  'どこを直すか分からない',
  P6:  '1つ変えると他も変わる',
  P7:  '状況変化で更新が必要',
  P8:  '複雑さを単純化しにくい',
  P9:  '報酬・コストが行動を左右する',
  P10: '感情変化が邪魔する',
  P11: '他者と完全理解できない',
};

// ─── 5つの典型エラーパターン（フォールバック：スプレッドシートが取得できない時に使用）──
// data-loader.js が CSV から取得成功すると window.INDIVIDUAL_ERROR_PLANS を上書きする
const INDIVIDUAL_ERROR_PLANS_FALLBACK = [
  {
    plan_id: 'IND-001',
    plan_name: '反応遅れ型プラン',
    error_type: 'reaction_delay',
    ui_label: '反応が遅れる',
    icon: '⏱️',
    color: '#dc2626',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: 'シュート予測・ポジショニング',
      df: '初動対応・インターセプト',
      mf: '受ける前準備・体の向き',
      fw: '動き出し・裏抜けタイミング',
    },
    problem_main: 'P4',
    problem_sub: ['P1', 'P7'],
    summary: '見てから動くため初動が遅れる',
    common_signs: [
      'ボールが来てから慌てる',
      '相手が動いてから追いかける',
      '1対1で後手になる',
      'パスが出てからやっと動く',
    ],
    background: [
      '感覚入力を待ちすぎている',
      '事前予測が弱い',
      '「見てから判断」が中心になっている',
    ],
    improvement_goal: '先に予測を持って動けるようにする',
    training_steps: [
      {
        title: '予測宣言ドリル',
        desc: 'ボールを受ける前に「次は右」「次は前」など宣言する。GKなら「右低い」、FWなら「今出る」で動き出し。',
        layer: 'L1',
        duration: 10,
      },
      {
        title: '予備動作観察トレーニング',
        desc: '相手の腰、肩、視線、足の向きを見る。「何を見て予測したか」を毎回言葉にする。',
        layer: 'L2',
        duration: 15,
      },
      {
        title: '時間制限付き判断練習',
        desc: '1タッチ、2秒以内など制限をつける。見てからではなく、準備しておく習慣を作る。',
        layer: 'L3',
        duration: 15,
      },
    ],
    eval_points: [
      '動く前に予測できているか',
      '予備動作を見ているか',
      '初動が早くなっているか',
      '後手の場面が減っているか',
    ],
    coaching_note: '反応速度ではなく予測準備を褒める',
    note_for_player: '先に予測して動く練習です',
    difficulty: 'basic',
    duration_total: 40,
    is_active: true,
    sort_order: 1,
  },
  {
    plan_id: 'IND-002',
    plan_name: '情報過多型プラン',
    error_type: 'information_overload',
    ui_label: '情報が多いと混乱する',
    icon: '🌀',
    color: '#d97706',
    target_age: 'all',
    target_position: ['mf', 'df'],
    position_examples: {
      gk: 'クロス対応時の優先判断',
      df: 'ライン統率時の優先情報',
      mf: '中盤でのプレー選択',
      fw: '前線での動き出し判断',
    },
    problem_main: 'P3',
    problem_sub: ['P5', 'P8'],
    summary: '情報が多いと判断が止まる',
    common_signs: [
      '周りを見ようとして逆に止まる',
      'MFで判断が遅れる',
      '選択肢が多いと迷う',
      '何を優先していいか分からない',
    ],
    background: [
      '情報の取捨選択が苦手',
      '複雑さを整理できていない',
      '全部見ようとしてオーバーフロー',
    ],
    improvement_goal: '優先情報を絞って判断を速くする',
    training_steps: [
      {
        title: '3つの選択肢準備ドリル',
        desc: '受ける前に第1、第2、第3の選択肢を持つ。声に出して確認する。',
        layer: 'L1',
        duration: 10,
      },
      {
        title: '優先情報限定トレーニング',
        desc: '今日は「相手の足の向きだけ見る」「味方の動き出しだけ見る」のように、見る情報を限定する。',
        layer: 'L2',
        duration: 15,
      },
      {
        title: '条件付きポゼッション',
        desc: '前向きなら前進、背負ったら落とすなど簡単なルールを先に持ってプレーする。',
        layer: 'L3',
        duration: 15,
      },
    ],
    eval_points: [
      '止まる回数が減るか',
      '判断が早くなるか',
      '優先情報を言語化できるか',
      'プレッシャー下でも混乱しすぎないか',
    ],
    coaching_note: '全部見ろではなく何を見るかを限定する',
    note_for_player: '見るものを絞って判断を速くする練習です',
    difficulty: 'basic',
    duration_total: 40,
    is_active: true,
    sort_order: 2,
  },
  {
    plan_id: 'IND-003',
    plan_name: '修正迷子型プラン',
    error_type: 'correction_confusion',
    ui_label: '修正点が分からない',
    icon: '🔄',
    color: '#7c3aed',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: 'セーブミス後の修正箇所特定',
      df: '抜かれた後の原因分析',
      mf: 'パスミス後の改善ポイント',
      fw: '決定機逸後の修正',
    },
    problem_main: 'P5',
    problem_sub: ['P6'],
    summary: 'ミス後に何を直せばいいか分からない',
    common_signs: [
      'ミスした後も何を変えればいいか分からない',
      '毎回「次は頑張る」だけになる',
      '技術・判断・位置・気持ちのどこが問題か整理できない',
      '同じ失敗が続く',
    ],
    background: [
      '修正の優先順位がついていない',
      '一つを変えると全体が変わるので整理しにくい',
      '振り返りの軸がない',
    ],
    improvement_goal: '修正点を1つに絞って改善する',
    training_steps: [
      {
        title: 'ミス分類シート',
        desc: 'そのミスは「技術」「判断」「位置」「タイミング」「感情」のどれかを選ぶ。',
        layer: 'L1',
        duration: 5,
      },
      {
        title: '1修正のみルール',
        desc: '一度に全部直さない。次のプレーでは1つだけ直す。',
        layer: 'L2',
        duration: 15,
      },
      {
        title: '連続試行ドリル',
        desc: '同じ課題を5本続ける。毎回「今回は何を変えるか」を決める。',
        layer: 'L2',
        duration: 15,
      },
    ],
    eval_points: [
      '自分で原因を分類できるか',
      '修正点を1つに絞れるか',
      '同じミスの再発率が下がるか',
      '修正の言語化ができるか',
    ],
    coaching_note: '一度に全部直させない',
    note_for_player: 'ミスの原因を整理して、1つずつ直す練習です',
    difficulty: 'basic',
    duration_total: 35,
    is_active: true,
    sort_order: 3,
  },
  {
    plan_id: 'IND-004',
    plan_name: '変化停止型プラン',
    error_type: 'change_freeze',
    ui_label: '状況変化で固まる',
    icon: '🧊',
    color: '#2563eb',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: '急な展開変更への対応',
      df: '数的不利時の切り替え',
      mf: 'フォーメーション変更への適応',
      fw: 'マーク変更時の対応',
    },
    problem_main: 'P7',
    problem_sub: ['P1'],
    summary: '状況変化で思考と動きが止まる',
    common_signs: [
      'ルール変更で急にプレーが悪くなる',
      '相手の強度が上がると固まる',
      '予定外のことが起きると止まる',
      '試合になると練習通りにできない',
    ],
    background: [
      '予測更新が苦手',
      '信念の切り替えが遅い',
      '「いつもの形」に依存しやすい',
    ],
    improvement_goal: '変化後も予測を更新して動けるようにする',
    training_steps: [
      {
        title: 'ルールチェンジゲーム',
        desc: '30秒ごとに条件変更（利き足制限、タッチ数制限、得点条件変更など）。',
        layer: 'L2',
        duration: 15,
      },
      {
        title: '想定外対応ドリル',
        desc: 'コーチがランダムに合図を出して変更（人数変更、スペース変更、方向転換）。',
        layer: 'L3',
        duration: 15,
      },
      {
        title: '変更後の最初の1プレー確認',
        desc: '変化した直後に何を選んだか振り返る。最初の修正速度を見る。',
        layer: 'L2',
        duration: 10,
      },
    ],
    eval_points: [
      '変化後に止まらないか',
      '更新が早いか',
      '条件変更後の最初の判断が改善するか',
      '「変わる前提」で準備できるか',
    ],
    coaching_note: '正解固定ではなく切り替えを評価する',
    note_for_player: '変化に慣れて、すぐ動ける力をつける練習です',
    difficulty: 'basic',
    duration_total: 40,
    is_active: true,
    sort_order: 4,
  },
  {
    plan_id: 'IND-005',
    plan_name: '感情引きずり型プラン',
    error_type: 'emotional_drag',
    ui_label: 'ミス後に崩れる',
    icon: '💔',
    color: '#059669',
    target_age: 'all',
    target_position: ['fw', 'gk'],
    position_examples: {
      gk: '失点後の切り替え',
      df: '抜かれた後のリカバリー意識',
      mf: 'ロスト後の切り替え',
      fw: 'シュートミス後の次のアクション',
    },
    problem_main: 'P10',
    problem_sub: ['P9'],
    summary: 'ミス後に次のプレーへ移れない',
    common_signs: [
      'シュートを外した後に消極的になる',
      '失点後に声が減る',
      'ミスの後に次の判断が遅くなる',
      '1回の失敗で流れが悪くなる',
    ],
    background: [
      '感情変化が認知や行動を邪魔している',
      'コストや失敗回避が強く出ている',
      '結果に執着しすぎている',
    ],
    improvement_goal: 'ミス後の再安定化を身につける',
    training_steps: [
      {
        title: 'リセットルーティン作成',
        desc: '深呼吸、手を叩く、一言決める、視線を上げるなど、次に戻る動作を決める。',
        layer: 'L1',
        duration: 5,
      },
      {
        title: 'ミス直後限定ドリル',
        desc: 'わざと失敗場面を作る。次の1本だけを見る。次の行動を素早く選ぶ練習をする。',
        layer: 'L2',
        duration: 15,
      },
      {
        title: '次プレー重視評価',
        desc: '成功失敗ではなく、ミス後の次プレーを評価対象にする。',
        layer: 'L2',
        duration: 15,
      },
    ],
    eval_points: [
      'ミス後の次プレーが早いか',
      '声や動きが止まらないか',
      'リセット行動を自分でできるか',
      '失敗後の消極性が減るか',
    ],
    coaching_note: '結果より次の1プレーを評価する',
    note_for_player: 'ミスを引きずらず、次に切り替える練習です',
    difficulty: 'basic',
    duration_total: 35,
    is_active: true,
    sort_order: 5,
  },
];

// フォールバックを初期値として設定（CSV取得で上書きされる）
if (typeof window.INDIVIDUAL_ERROR_PLANS === 'undefined') {
  window.INDIVIDUAL_ERROR_PLANS = INDIVIDUAL_ERROR_PLANS_FALLBACK;
}

// ─── ヘルパー関数 ───────────────────────────────────────────
function getActivePlans() {
  const plans = window.INDIVIDUAL_ERROR_PLANS || INDIVIDUAL_ERROR_PLANS_FALLBACK;
  return plans.filter(p => p.is_active).sort((a, b) => a.sort_order - b.sort_order);
}

function getPlanById(planId) {
  const plans = window.INDIVIDUAL_ERROR_PLANS || INDIVIDUAL_ERROR_PLANS_FALLBACK;
  return plans.find(p => p.plan_id === planId) || null;
}

function getPlansByPosition(posId) {
  return getActivePlans().filter(p =>
    p.target_position.includes('all') || p.target_position.includes(posId)
  );
}

function getProblemLabel(code) {
  return PROBLEM_MASTER[code] || code;
}
