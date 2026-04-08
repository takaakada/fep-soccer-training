// ══════════════════════════════════════════════════════════
// INDIVIDUAL ERROR PLANS  (js/individual-plans.js)
// ══════════════════════════════════════════════════════════
// 9つの問題パターンと解決プラン（P1〜P9 に 1:1 対応）
// Google Sheets「individual_error_master」と同じ構造

// ─── 問題番号マスター（9パターン）────────────────────────────
const PROBLEM_MASTER = {
  P1: '運動予測のズレ',
  P2: 'その場の感覚に頼りすぎ',
  P3: '反応スピードの遅さ',
  P4: 'するべきトレーニングが混乱',
  P5: '戦術、タスク、情報が混乱',
  P6: '考え方が強情・固執',
  P7: '"やりたくない"が勝つ',
  P8: '感情コントロールが苦手',
  P9: 'チーム・コーチとの相互理解が不足',
};

// ─── 9つの個別トレーニングプラン（フォールバック）──────────────
// data-loader.js が CSV から取得成功すると window.INDIVIDUAL_ERROR_PLANS を上書きする
const INDIVIDUAL_ERROR_PLANS_FALLBACK = [
  // ── IND-001: 運動予測ズレ改善プラン ─────────────────────────
  {
    plan_id: 'IND-001',
    plan_name: '運動予測ズレ改善プラン',
    error_type: 'motor_prediction',
    ui_label: '運動予測がズレる',
    icon: '🎯',
    color: '#dc2626',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: 'キックの飛距離・パントの精度予測',
      df: 'クリアの飛距離・スライディングの距離感',
      mf: 'パスの強度・走り込みタイミング',
      fw: 'シュートの強度・ヘディングの位置感覚',
    },
    problem_main: 'P1',
    problem_sub: [],
    summary: '自分の身体出力の予測と実際がズレる',
    common_signs: [
      '思った場所にボールを届けられない',
      '動いたつもりでも位置やタイミングがズレる',
      'キック・トラップ・移動速度の見積もりが合わない',
      '自分の身体能力を正確に把握できていない',
    ],
    background: [
      '身体の出力感覚が未発達',
      '距離・時間・強さの見積もりが不正確',
      '疲労による変化に気づけていない',
    ],
    improvement_goal: '自分の身体とボール出力の予測精度を高める',
    training_steps: [
      { title: '予想ダッシュ', desc: 'A地点からB地点まで何秒で行けるか予想し、実際に走って誤差を記録する。', layer: 'L1', duration: 10 },
      { title: 'パス到達時間予測', desc: '蹴る前に「何秒で届くか」を予想し、実際とのズレを確認する。', layer: 'L1', duration: 10 },
      { title: 'キック強度マッピング', desc: '近距離・中距離・遠距離で同じターゲットを狙い、強さと誤差の関係を整理する。', layer: 'L2', duration: 15 },
      { title: '疲労後の再測定', desc: '少し疲れた後に同じ課題を行い、疲労で予測がどうズレるか確認する。', layer: 'L2', duration: 10 },
    ],
    eval_points: [
      '予測と実測の差が小さくなるか',
      '距離感・時間感覚が安定するか',
      '疲労後でも大きく崩れないか',
      '自分のズレを言語化できるか',
    ],
    coaching_note: '結果の成否ではなく予測との一致度を評価する',
    note_for_player: '自分の身体を正確に知る練習です',
    difficulty: 'basic',
    duration_total: 45,
    is_active: true,
    sort_order: 1,
  },

  // ── IND-002: 感覚依存改善プラン ────────────────────────────
  {
    plan_id: 'IND-002',
    plan_name: '感覚依存改善プラン',
    error_type: 'sensory_dependence',
    ui_label: '感覚に頼りすぎ',
    icon: '👁️',
    color: '#ea580c',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: 'シュート予測・ポジション先取り',
      df: '初動対応・インターセプト準備',
      mf: '受ける前準備・体の向き',
      fw: '動き出し・裏抜けタイミング',
    },
    problem_main: 'P2',
    problem_sub: [],
    summary: '見てから動くため初動が遅れる',
    common_signs: [
      'ボールが来てから考える',
      '相手が動いてから対応する',
      '先読みが少ない',
      '毎回「見てから」になって遅れる',
    ],
    background: [
      '感覚入力を待ちすぎている',
      '事前予測が弱い',
      '「見てから判断」が中心になっている',
    ],
    improvement_goal: '感覚入力の前に予測を持つ習慣をつける',
    training_steps: [
      { title: '予測宣言ドリル', desc: '受ける前に「右」「前」「落とす」など次の行動を声に出す。GKなら「左低い」などコース予測でも良い。', layer: 'L1', duration: 10 },
      { title: '予備動作観察', desc: '相手の視線、肩、腰、軸足を見る。何を見て予測したかを言葉にする。', layer: 'L2', duration: 15 },
      { title: '受ける前スキャン練習', desc: 'ボールを受ける前に最低2回周囲を見る。受ける前に第1選択肢を準備する。', layer: 'L2', duration: 10 },
      { title: '視覚制限準備ドリル', desc: '情報を少し制限した状態で予測を先に立て、見えた後にどう修正したか確認する。', layer: 'L3', duration: 10 },
    ],
    eval_points: [
      '受ける前に準備があるか',
      '「見てから」だけで動いていないか',
      '予備動作を手がかりにできるか',
      '予測を持った上で修正できるか',
    ],
    coaching_note: '反応速度ではなく予測準備を褒める',
    note_for_player: '先に予測して動く練習です',
    difficulty: 'basic',
    duration_total: 45,
    is_active: true,
    sort_order: 2,
  },

  // ── IND-003: 反応スピード改善プラン ─────────────────────────
  {
    plan_id: 'IND-003',
    plan_name: '反応スピード改善プラン',
    error_type: 'reaction_speed',
    ui_label: '反応が遅い',
    icon: '⏱️',
    color: '#d97706',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: 'シュートストップの一歩目',
      df: 'プレス開始・1対1の初動',
      mf: 'インターセプト・切り替え',
      fw: 'プレスバック・抜け出し',
    },
    problem_main: 'P3',
    problem_sub: [],
    summary: '一歩目が遅く後手に回る',
    common_signs: [
      '一歩目が遅い',
      'プレス開始が遅い',
      '1対1で後手に回る',
      '分かっていても身体が出ない',
    ],
    background: [
      '構えや準備が不十分',
      '判断から行動までの時間が長い',
      '反応前の準備姿勢が整っていない',
    ],
    improvement_goal: '初動を早くし、一歩目の質を上げる',
    training_steps: [
      { title: '初動1歩目ドリル', desc: '5m以内の短いスタートを反復。1歩目だけに集中する。', layer: 'L1', duration: 10 },
      { title: '合図反応＋予測スタート', desc: '合図で動くが、完全なランダムではなく予測も持たせる。どの方向が来そうかを考えて構える。', layer: 'L2', duration: 15 },
      { title: 'プレス開始タイミング練習', desc: '相手のコントロールが大きい瞬間を見て出る。行く/待つを声に出す。', layer: 'L2', duration: 10 },
      { title: 'ミニゲーム初動強調', desc: '最初の3秒だけを評価対象にする。その場の結果より一歩目の質を見る。', layer: 'L3', duration: 10 },
    ],
    eval_points: [
      '一歩目が速いか',
      '出るべき場面で遅れないか',
      '構えが準備されているか',
      '動き出しに迷いが減るか',
    ],
    coaching_note: '結果ではなく初動の質を評価する',
    note_for_player: '一歩目を速くする練習です',
    difficulty: 'basic',
    duration_total: 45,
    is_active: true,
    sort_order: 3,
  },

  // ── IND-004: 修正迷子改善プラン ────────────────────────────
  {
    plan_id: 'IND-004',
    plan_name: '修正迷子改善プラン',
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
    problem_main: 'P4',
    problem_sub: [],
    summary: '何を直せばいいか分からない',
    common_signs: [
      '何を直せばいいか分からない',
      '練習の目的がぼやける',
      'ミスしても「次がんばる」で終わる',
      '似た課題ばかりやって整理できない',
    ],
    background: [
      '修正の優先順位がついていない',
      '振り返りの軸がない',
      '課題の分類ができていない',
    ],
    improvement_goal: '修正点を明確にし、1つに絞って改善する',
    training_steps: [
      { title: 'ミス分類シート', desc: 'そのミスは「技術」「判断」「位置」「タイミング」「感情」のどれかを選ぶ。', layer: 'L1', duration: 5 },
      { title: '1テーマ固定練習', desc: '今日の練習で直すものを1つだけ決める。例：今日は一歩目だけ、今日は受ける前の確認だけ。', layer: 'L2', duration: 15 },
      { title: '1修正ルール', desc: '一度に複数を直さない。次の1プレーでは1点だけ変える。', layer: 'L2', duration: 10 },
      { title: '練習後の目的確認', desc: 'この練習は何を良くするためかを選手自身が書く。', layer: 'L1', duration: 5 },
    ],
    eval_points: [
      '練習目的を言えるか',
      '修正点を1つに絞れるか',
      '課題がぼやけず継続できるか',
      '同じ混乱が減るか',
    ],
    coaching_note: '一度に全部直させない',
    note_for_player: 'ミスの原因を整理して、1つずつ直す練習です',
    difficulty: 'basic',
    duration_total: 35,
    is_active: true,
    sort_order: 4,
  },

  // ── IND-005: 情報整理改善プラン ────────────────────────────
  {
    plan_id: 'IND-005',
    plan_name: '情報整理改善プラン',
    error_type: 'information_overload',
    ui_label: '情報が混乱する',
    icon: '🌀',
    color: '#0891b2',
    target_age: 'all',
    target_position: ['mf', 'df'],
    position_examples: {
      gk: 'クロス対応時の優先判断',
      df: 'ライン統率時の優先情報',
      mf: '中盤でのプレー選択',
      fw: '前線での動き出し判断',
    },
    problem_main: 'P5',
    problem_sub: [],
    summary: '情報が多いと判断が止まる',
    common_signs: [
      '情報が多いと止まる',
      'MFで判断が遅れる',
      '優先順位がつけられない',
      'どこを見るべきか分からない',
    ],
    background: [
      '情報の取捨選択が苦手',
      '複雑さを整理できていない',
      '全部見ようとしてオーバーフロー',
    ],
    improvement_goal: '優先情報を絞って判断を速くする',
    training_steps: [
      { title: '優先情報限定ドリル', desc: '今日は「相手の足元だけ見る」「味方の動き出しだけ見る」など見る対象を絞る。', layer: 'L1', duration: 10 },
      { title: '3つの選択肢準備', desc: '受ける前に第1、第2、第3選択肢を持つ。声に出して確認する。', layer: 'L2', duration: 15 },
      { title: '条件付きポゼッション', desc: '前向きなら前進、背負ったら落とすなど簡単な判断軸を設定する。', layer: 'L3', duration: 15 },
      { title: 'ヘッドスキャン習慣化', desc: '受ける前に何回見たかを評価対象にする。', layer: 'L2', duration: 5 },
    ],
    eval_points: [
      '止まる場面が減るか',
      '優先情報を言えるか',
      '選択肢を複数持てるか',
      '判断が速くなるか',
    ],
    coaching_note: '全部見ろではなく何を見るかを限定する',
    note_for_player: '見るものを絞って判断を速くする練習です',
    difficulty: 'basic',
    duration_total: 45,
    is_active: true,
    sort_order: 5,
  },

  // ── IND-006: 固執改善プラン ────────────────────────────────
  {
    plan_id: 'IND-006',
    plan_name: '固執改善プラン',
    error_type: 'rigid_thinking',
    ui_label: '考えが固い',
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
    problem_main: 'P6',
    problem_sub: [],
    summary: '同じやり方にこだわり状況変化に対応できない',
    common_signs: [
      '同じやり方にこだわる',
      '状況が変わってもやり方を変えない',
      '指摘されても更新しにくい',
      '「自分はこうする」が強すぎる',
    ],
    background: [
      '予測更新が苦手',
      '信念の切り替えが遅い',
      '「いつもの形」に依存しやすい',
    ],
    improvement_goal: '複数のやり方を持ち、状況に応じて選び直す',
    training_steps: [
      { title: 'ルールチェンジゲーム', desc: '30秒ごとに条件変更（利き足制限、タッチ数制限、人数変更など）。', layer: 'L2', duration: 15 },
      { title: '別解提示ドリル', desc: '1つの局面で3通りの解決策を出す。どれも成立することを体験する。', layer: 'L2', duration: 10 },
      { title: 'あえて逆選択練習', desc: '普段選ばない選択肢を実行してみる。その結果を比較する。', layer: 'L3', duration: 10 },
      { title: '更新振り返り', desc: 'どの瞬間に考え方を変えたかを確認する。', layer: 'L1', duration: 5 },
    ],
    eval_points: [
      '1つのやり方に固執しすぎないか',
      '条件変化で更新できるか',
      '別の選択肢を持てるか',
      '指摘後の修正が早いか',
    ],
    coaching_note: '正解固定ではなく切り替えを評価する',
    note_for_player: '変化に慣れて、すぐ動ける力をつける練習です',
    difficulty: 'basic',
    duration_total: 40,
    is_active: true,
    sort_order: 6,
  },

  // ── IND-007: 動機づけ改善プラン ───────────────────────────
  {
    plan_id: 'IND-007',
    plan_name: '動機づけ改善プラン',
    error_type: 'low_motivation',
    ui_label: 'やりたくない',
    icon: '😤',
    color: '#ca8a04',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: '地味な基礎練への取り組み',
      df: '守備練習への積極性',
      mf: '走力系トレーニングへの姿勢',
      fw: 'プレスバック・守備タスクの意欲',
    },
    problem_main: 'P7',
    problem_sub: [],
    summary: '必要だと分かっていても取り組めない',
    common_signs: [
      '必要なのは分かるが取り組まない',
      '苦手課題を避ける',
      '失敗しそうな練習を嫌がる',
      '受け身になりやすい',
    ],
    background: [
      '本人にとっての意味づけが不足',
      '成功体験が少ない',
      '行動のハードルが高く感じている',
    ],
    improvement_goal: '本人にとっての意味づけを作り、行動を引き出す',
    training_steps: [
      { title: '目的共有ミニ面談', desc: 'なぜこの練習をするのかを本人の言葉で確認する。自分ごと化する。', layer: 'L1', duration: 5 },
      { title: '成功率調整ドリル', desc: '少し頑張れば達成できる難易度にする。小さな成功体験を積ませる。', layer: 'L2', duration: 15 },
      { title: '選択式メニュー', desc: '2〜3個の中から自分で選ばせる。自律感を持たせる。', layer: 'L2', duration: 15 },
      { title: '達成チェック形式', desc: 'ToDo形式で終わった項目を見える化する。', layer: 'L1', duration: 5 },
    ],
    eval_points: [
      '自分から取り組めるか',
      '苦手課題を避けすぎないか',
      '練習の意味を言えるか',
      '継続率が上がるか',
    ],
    coaching_note: '強制せず自律感を育てる',
    note_for_player: '自分で選んで、自分で達成する練習です',
    difficulty: 'basic',
    duration_total: 40,
    is_active: true,
    sort_order: 7,
  },

  // ── IND-008: 感情コントロール改善プラン ─────────────────────
  {
    plan_id: 'IND-008',
    plan_name: '感情コントロール改善プラン',
    error_type: 'emotional_control',
    ui_label: '感情に振り回される',
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
    problem_main: 'P8',
    problem_sub: [],
    summary: 'ミス後に焦り、次のプレーに集中できない',
    common_signs: [
      'ミス後に焦る',
      'イライラが続く',
      '落ち込みから戻れない',
      '次のプレーに集中できない',
    ],
    background: [
      '感情変化が認知や行動を邪魔している',
      'コストや失敗回避が強く出ている',
      '結果に執着しすぎている',
    ],
    improvement_goal: 'ミス後の再安定化を身につける',
    training_steps: [
      { title: 'リセットルーティン作成', desc: '深呼吸、視線を上げる、手を叩く、一言決めるなど、次に戻る動作を決める。', layer: 'L1', duration: 5 },
      { title: 'ミス直後限定ドリル', desc: 'わざと失敗場面を作り、次の1本だけを評価する。', layer: 'L2', duration: 15 },
      { title: '感情記録', desc: '練習後に感情の波を簡単に記録する。どこで崩れたかを把握する。', layer: 'L1', duration: 5 },
      { title: '回復速度評価', desc: '上手くいったかではなく、ミスから戻る速さを見る。成功ではなく回復を評価。', layer: 'L2', duration: 15 },
    ],
    eval_points: [
      'ミス後の次プレーが早いか',
      '崩れが長引かないか',
      'リセット行動を自分でできるか',
      '表情・声・動きが戻るか',
    ],
    coaching_note: '結果より次の1プレーを評価する',
    note_for_player: 'ミスを引きずらず、次に切り替える練習です',
    difficulty: 'basic',
    duration_total: 40,
    is_active: true,
    sort_order: 8,
  },

  // ── IND-009: 相互理解改善プラン ────────────────────────────
  {
    plan_id: 'IND-009',
    plan_name: '相互理解改善プラン',
    error_type: 'poor_communication',
    ui_label: '相互理解が不足',
    icon: '🤝',
    color: '#6b7280',
    target_age: 'all',
    target_position: ['all'],
    position_examples: {
      gk: 'DFラインへのコーチング',
      df: 'ラインの上げ下げの声かけ',
      mf: '中盤の連携・パスコース共有',
      fw: '前線からの守備スイッチ共有',
    },
    problem_main: 'P9',
    problem_sub: [],
    summary: 'チームやコーチとの意図共有ができていない',
    common_signs: [
      '意図が共有されない',
      '声かけがかみ合わない',
      '連携ミスが多い',
      'コーチの指示と選手の理解がずれる',
    ],
    background: [
      '共通言語がない',
      '伝達と確認の精度が低い',
      '味方やコーチとの予測共有が不足',
    ],
    improvement_goal: '共通言語を作り、予測共有を増やす',
    training_steps: [
      { title: '共通ワード設定', desc: '「行く」「待つ」「背後」「落とす」など短い言葉を統一する。', layer: 'L1', duration: 5 },
      { title: '宣言付き連携ドリル', desc: '出す側・受ける側・守る側が意図を声に出して行う。', layer: 'L2', duration: 15 },
      { title: '振り返りの一致確認', desc: '同じ場面を見て、選手はどう考えたか、コーチはどう見たかを比べる。', layer: 'L2', duration: 10 },
      { title: '役割明確化ゲーム', desc: '誰が何を見るか、誰が何を伝えるかを明確にした上でプレーする。', layer: 'L3', duration: 10 },
    ],
    eval_points: [
      '声かけが機能しているか',
      '意図共有による連携改善があるか',
      'コーチと選手の理解差が減るか',
      '誤解後の修正が早いか',
    ],
    coaching_note: '選手の理解を先に聞いてから指導する',
    note_for_player: 'チームで同じイメージを持つ練習です',
    difficulty: 'basic',
    duration_total: 40,
    is_active: true,
    sort_order: 9,
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

function getPlansByErrorType(errorType) {
  const plans = window.INDIVIDUAL_ERROR_PLANS || INDIVIDUAL_ERROR_PLANS_FALLBACK;
  return plans.find(p => p.error_type === errorType) || null;
}

function getProblemLabel(code) {
  return PROBLEM_MASTER[code] || code;
}
