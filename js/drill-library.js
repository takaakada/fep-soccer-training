// ══════════════════════════════════════════════════════════
// DRILL LIBRARY  (js/drill-library.js)
// ══════════════════════════════════════════════════════════
// プリセットドリル一覧 — レベル別メニュー・ポジション別で共有
//
// ※ このファイルはハードコードのフォールバックデータです。
//    アプリ起動時に data-loader.js が Google Sheets から最新データを取得し、
//    DRILL_PRESETS / POS_PRESETS を上書きします。

const CAT_LABEL = {
  warm:   'ウォームアップ',
  tech:   '技術',
  tactic: '戦術',
  phys:   'フィジカル',
  cool:   'クールダウン',
};

// ── 汎用プリセットライブラリ（レベル別メニュー用）─────────
const DRILL_PRESETS = [
  // ウォームアップ
  { name: 'ランニング', cat: 'warm', scope: 'team', layer: 'L1', purpose: '安定化', channels: '視覚,体性感覚', coaching: 'safe', vfe_target: 'low', time: 10, desc: '軽いジョグでウォームアップ。フォームを意識しながら走る。', fep: '単調リズム運動によりセロトニン系を活性化しσを安定させる。' },
  { name: 'ダイナミックストレッチ', cat: 'warm', scope: 'team', layer: 'L1', purpose: '安定化', channels: '体性感覚,前庭覚', coaching: 'safe', vfe_target: 'low', time: 10, desc: '動きながら股関節・肩甲骨などをほぐすストレッチ。' },
  { name: 'ミラーリング遊び', cat: 'warm', scope: 'team', layer: 'L1', purpose: '探索', channels: '視覚,体性感覚', coaching: 'safe', vfe_target: 'low', time: 10, desc: '2人1組、前の子の動きを後ろが真似する。身体感覚の入口。' },
  { name: '鬼ごっこ変形版', cat: 'warm', scope: 'team', layer: 'L2', purpose: '探索', channels: '視覚,体性感覚', coaching: 'explore', vfe_target: 'low', time: 10, desc: 'タグ鬼。逃げる際のルート選択・方向転換を意識させる。' },
  { name: 'ボールタッチ（足裏・インサイド）', cat: 'warm', scope: 'team', layer: 'L1', purpose: '安定化', channels: '体性感覚,呼吸・心拍', coaching: 'safe', vfe_target: 'low', time: 8, desc: '止まった状態でリズミカルにボールタッチ。感覚を研ぎ澄ます。' },
  { name: 'パス＆ムーブ（2人組）', cat: 'warm', scope: 'team', layer: 'L2', purpose: '安定化', channels: '視覚,体性感覚', coaching: 'explore', vfe_target: 'low', time: 10, desc: 'パスを出したら動く。動き続けることを習慣化。' },

  // 技術
  { name: 'ドリブルコース', cat: 'tech', scope: 'team', layer: 'L2', purpose: '修正', channels: '視覚,体性感覚', coaching: 'explore', vfe_target: 'mid', time: 15, desc: 'コーンを使ったジグザグドリブル。スピードと正確さのバランスを学ぶ。' },
  { name: '的当てパス', cat: 'tech', scope: 'team', layer: 'L2', purpose: '修正', channels: '視覚,体性感覚', coaching: 'positive', vfe_target: 'mid', time: 15, desc: '近・中・遠の距離にマーカー。予測してから蹴り、誤差を確認。' },
  { name: 'ファーストタッチ練習', cat: 'tech', scope: 'team', layer: 'L2', purpose: '修正', channels: '体性感覚,前庭覚', coaching: 'explore', vfe_target: 'mid', time: 15, desc: '投げてもらったボールを次のプレーにつながるトラップ。' },
  { name: 'シュート精度トレーニング', cat: 'tech', scope: 'team', layer: 'L3', purpose: '強化', channels: '視覚,体性感覚', coaching: 'positive', vfe_target: 'mid', time: 20, desc: '枠内シュートの精度向上。コース・高さを意識して蹴る。' },
  { name: '1v1ドリブル突破', cat: 'tech', scope: 'team', layer: 'L3', purpose: '強化', channels: '視覚,体性感覚', coaching: 'challenge', vfe_target: 'high', time: 15, desc: '対面DF相手にドリブルで突破する。フェイントと方向転換。' },
  { name: 'ヘディング練習', cat: 'tech', scope: 'team', layer: 'L2', purpose: '修正', channels: '視覚,前庭覚', coaching: 'safe', vfe_target: 'mid', time: 12, desc: 'クロスボールへのヘディング。タイミングと方向を意識。' },
  { name: 'インステップキック', cat: 'tech', scope: 'team', layer: 'L2', purpose: '修正', channels: '体性感覚,視覚', coaching: 'positive', vfe_target: 'mid', time: 15, desc: '正確なインステップでの中長距離パス・シュート練習。' },
  { name: 'ターン練習（クライフ・マシュー）', cat: 'tech', scope: 'team', layer: 'L2', purpose: '探索', channels: '体性感覚,視覚', coaching: 'explore', vfe_target: 'mid', time: 12, desc: '各種ターンを反復練習。次の動きへの素早い転換を身につける。' },

  // 戦術
  { name: 'ポジショニング確認', cat: 'tactic', scope: 'team', layer: 'L3', purpose: '修正', channels: '視覚,体性感覚', coaching: 'explore', vfe_target: 'mid', time: 20, desc: '攻守それぞれのポジショニングを確認・修正するシャドートレーニング。' },
  { name: '3対3ゲーム', cat: 'tactic', scope: 'team', layer: 'L3', purpose: '統合', channels: '視覚,体性感覚', coaching: 'challenge', vfe_target: 'mid', time: 15, desc: '小さいコートで条件を1つ変えて（例：3タッチ制限）行う。' },
  { name: '4対2ロンド', cat: 'tactic', scope: 'team', layer: 'L3', purpose: '探索', channels: '視覚,体性感覚', coaching: 'explore', vfe_target: 'mid', time: 20, desc: 'パスコースを予測する。ポゼッション練習の定番。' },
  { name: 'ビルドアップ練習', cat: 'tactic', scope: 'team', layer: 'L3', purpose: '統合', channels: '視覚,体性感覚', coaching: 'explore', vfe_target: 'mid', time: 20, desc: '後方からのボール前進。パスコースの作り方を学ぶ。' },
  { name: 'プレッシング練習', cat: 'tactic', scope: 'team', layer: 'L3', purpose: '強化', channels: '視覚,体性感覚', coaching: 'challenge', vfe_target: 'high', time: 15, desc: 'ボールを奪いに行くタイミングとコースを全体で合わせる。' },
  { name: 'ポジション鬼', cat: 'tactic', scope: 'team', layer: 'L2', purpose: '探索', channels: '視覚,体性感覚', coaching: 'safe', vfe_target: 'mid', time: 15, desc: '「ゴールの前を守る人」など役割を言語化。空間認知の訓練。' },
  { name: 'セットプレー確認', cat: 'tactic', scope: 'team', layer: 'L3', purpose: '修正', channels: '視覚,体性感覚', coaching: 'positive', vfe_target: 'mid', time: 15, desc: 'コーナー・フリーキックの動きを確認。役割分担を共有。' },
  { name: '縦パスのタイミング練習', cat: 'tactic', scope: 'team', layer: 'L3', purpose: '強化', channels: '視覚,体性感覚', coaching: 'explore', vfe_target: 'mid', time: 15, desc: '「いつ・どこへ」縦パスを入れるかタイミングを反復練習。' },

  // フィジカル
  { name: 'スプリント練習', cat: 'phys', scope: 'team', layer: 'L2', purpose: '強化', channels: '体性感覚,呼吸・心拍', coaching: 'challenge', vfe_target: 'mid', time: 15, desc: '短距離ダッシュを繰り返す。最大加速から減速までのコントロール。' },
  { name: 'アジリティラダー', cat: 'phys', scope: 'team', layer: 'L1', purpose: '安定化', channels: '体性感覚,前庭覚', coaching: 'positive', vfe_target: 'low', time: 12, desc: 'ラダーを使ったステップワーク。足の速さと正確さを鍛える。' },
  { name: '予測ダッシュ', cat: 'phys', scope: 'team', layer: 'L2', purpose: '探索', channels: '体性感覚,呼吸・心拍', coaching: 'explore', vfe_target: 'mid', time: 10, desc: '何秒で行けるか予測→実走→誤差確認。自己認知精度を上げる。' },
  { name: 'コアトレーニング', cat: 'phys', scope: 'team', layer: 'L1', purpose: '安定化', channels: '体性感覚,呼吸・心拍', coaching: 'safe', vfe_target: 'low', time: 10, desc: 'プランク・体幹系種目。軸の安定性を高める。' },
  { name: 'ジャンプ力強化', cat: 'phys', scope: 'team', layer: 'L2', purpose: '強化', channels: '体性感覚,前庭覚', coaching: 'challenge', vfe_target: 'mid', time: 10, desc: 'ボックスジャンプ・連続ジャンプ。ヘディングや競り合いに活きる。' },
  { name: 'インターバルランニング', cat: 'phys', scope: 'team', layer: 'L3', purpose: '強化', channels: '体性感覚,呼吸・心拍', coaching: 'challenge', vfe_target: 'high', time: 15, desc: '高強度と低強度を交互に繰り返す。試合体力を養う。' },

  // クールダウン
  { name: 'スタティックストレッチ', cat: 'cool', scope: 'team', layer: 'L1', purpose: '安定化', channels: '体性感覚,呼吸・心拍', coaching: 'safe', vfe_target: 'low', time: 10, desc: '静的ストレッチ。主要筋群をゆっくり伸ばす。' },
  { name: '振り返りシェア', cat: 'cool', scope: 'team', layer: 'L1', purpose: '安定化', channels: '視覚,体性感覚', coaching: 'safe', vfe_target: 'low', time: 10, desc: '「今日一番驚いたこと」をチームでシェア。FEP的学習の定着。' },
  { name: 'クールダウンジョグ', cat: 'cool', scope: 'team', layer: 'L1', purpose: '安定化', channels: '体性感覚,呼吸・心拍', coaching: 'safe', vfe_target: 'low', time: 8, desc: '軽いジョグで体を冷ます。心拍数を段階的に下げる。' },
  { name: '次回テーマ確認', cat: 'cool', scope: 'team', layer: 'L1', purpose: '探索', channels: '視覚,体性感覚', coaching: 'safe', vfe_target: 'low', time: 5, desc: '次回の練習テーマを共有。予測を立てておく。' },
];

// ── ポジション別プリセット ────────────────────────────────
const POS_PRESETS = {
  gk: [
    { name: '意思決定前宣言シュートストップ', desc: 'シュートを受ける前に「どこへ来るか」を声に出して宣言し、予測精度を可視化する。' },
    { name: 'クロス着地点予測', desc: 'クロスボールが上がった瞬間に着地点を宣言し、落下予測の精度を高める。' },
    { name: 'PK期待値判断練習', desc: 'キッカーの助走・目線・体の向きから傾向データを収集し、飛ぶ方向を論理的に判断。' },
    { name: 'ハイボール処理', desc: 'クロスボールへの飛び出しタイミングとキャッチング精度を磨く。' },
    { name: '1v1シュートストップ', desc: '至近距離からの1対1場面での反応と身体の使い方を練習。' },
    { name: 'コーチング練習', desc: 'DFへの的確な声かけ。情報発信役としてのGKの機能を高める。' },
    { name: 'ディストリビューション', desc: '素早い展開を意識したスロー・キックによる配球練習。' },
    { name: 'ポジショニング（角度最小化）', desc: 'シューターの角度を消すポジション取り。期待自由エネルギーを最小化する動き。' },
  ],
  df: [
    { name: 'ステップワーク（バックペダル）', desc: '相手に対して後退しながら身体の向きを保つステップ練習。' },
    { name: '1v1ディフェンス', desc: 'コースを切りながら相手の選択肢を制限する守備。' },
    { name: 'カバーリングポジション', desc: 'DFラインのカバーシャドウと連動する動きを反復。' },
    { name: 'ラインコントロール', desc: '組織的なオフサイドトラップとDFラインの押し上げを練習。' },
    { name: 'インターセプト練習', desc: 'パスコースを予測して先読みカット。予測精度を高める。' },
    { name: 'ビルドアップ参加', desc: 'GKとの連携を含めた後方からのパス回し練習。' },
    { name: 'ヘディング競り合い', desc: 'クロスボールへの競り合いでポジション取りと跳ぶタイミングを練習。' },
    { name: 'クリアリング精度', desc: '危険なエリアから安全にボールをクリアするキックの練習。' },
  ],
  mf: [
    { name: 'ボールリテンション（ロンド）', desc: 'ポゼッションを維持しながらパスコースを作り続ける練習。' },
    { name: 'ターンとリリース', desc: 'プレッシャーを受けながら素早くターンして展開する技術。' },
    { name: 'プレッシング誘導', desc: 'ボールを持ちながら相手を誘導し、プレッシングのスイッチを入れる。' },
    { name: '縦パスの差し込み', desc: '「いつ・どこへ」縦パスを入れるか、タイミングの練習。' },
    { name: 'デュエル（1v1中盤）', desc: 'インターセプトと球際の強さ。予測とフィジカルを融合。' },
    { name: '展開パス（サイドチェンジ）', desc: '逆サイドへの素早い展開でフィールドを広く使う。' },
    { name: 'セカンドボール回収', desc: 'こぼれ球への素早い予測反応と回収能力を高める。' },
    { name: 'ゲームリード練習', desc: '試合のテンポをコントロールする意識を持ったボール保持練習。' },
  ],
  fw: [
    { name: '抜け出しタイミング', desc: 'DFの背後への抜け出し。オフサイドギリギリのタイミングを反復。' },
    { name: 'シュート前の1タッチ', desc: 'ゴール前での素早いシュート準備とコース選択を練習。' },
    { name: 'ポストプレー', desc: '身体を当ててキープしながらの落としのタイミングと強さ。' },
    { name: 'クロスへの入り方', desc: 'ファー・ニアへの動き出しと入り方のパターン練習。' },
    { name: '1v1突破（FW版）', desc: '正面・サイドからのドリブル突破。シュートまで一連の動き。' },
    { name: 'ダイレクトシュート', desc: 'クロス・パスをダイレクトで打つシュート練習。予測と合わせ。' },
    { name: 'プレッシング始動', desc: 'FWからのプレスで相手を困らせる。チームの守備のスイッチ。' },
    { name: 'スペースメイキング', desc: 'パスを受ける前の動き出しでDFをずらし、味方のスペースを作る。' },
  ],
};

// ══════════════════════════════════════════════════════════
// ADD MODAL (共有コンポーネント)
// ══════════════════════════════════════════════════════════

let _modalTarget = null;   // { type: 'level'|'pos', id: string }
let _activeLibCat = 'all'; // モーダル内カテゴリフィルター

function openAddModal(type, id) {
  _modalTarget = { type, id };
  _activeLibCat = 'all';

  const modal = document.getElementById('drill-add-modal');
  if (!modal) { _buildModal(); }

  _renderModalContent();
  document.getElementById('drill-add-modal').classList.add('open');
}

function closeAddModal() {
  const modal = document.getElementById('drill-add-modal');
  if (modal) modal.classList.remove('open');
}

function _buildModal() {
  const el = document.createElement('div');
  el.id = 'drill-add-modal';
  el.className = 'drill-modal-overlay';
  el.innerHTML = `
    <div class="drill-modal-box" onclick="event.stopPropagation()">
      <div class="drill-modal-header">
        <span class="drill-modal-title">＋ メニューを追加</span>
        <button class="drill-modal-close" onclick="closeAddModal()">✕</button>
      </div>
      <div id="drill-modal-inner"></div>
    </div>`;
  el.addEventListener('click', closeAddModal);
  document.body.appendChild(el);
}

function _renderModalContent() {
  const { type, id } = _modalTarget;
  const inner = document.getElementById('drill-modal-inner');
  if (!inner) return;

  // プリセット一覧（ALL_MENU_PRESETS から取得、フォールバックで旧データ）
  let presets;
  if (type === 'pos') {
    presets = (window.ALL_MENU_PRESETS && window.ALL_MENU_PRESETS.length > 0)
      ? window.ALL_MENU_PRESETS.filter(m => m.scope === id)
      : (POS_PRESETS[id] || []).map(d => ({ ...d, cat: 'pos' }));
  } else {
    presets = (window.ALL_MENU_PRESETS && window.ALL_MENU_PRESETS.length > 0)
      ? window.ALL_MENU_PRESETS.filter(m => m.scope === 'team' || m.scope === 'all')
      : DRILL_PRESETS;
  }

  // カテゴリフィルター（レベル用のみ）
  const catBar = type === 'pos' ? '' : `
    <div class="drill-modal-cats">
      <button class="drill-cat-btn ${_activeLibCat==='all'?'active':''}" onclick="_setLibCat('all')">すべて</button>
      ${Object.entries(CAT_LABEL).map(([k,v]) =>
        `<button class="drill-cat-btn ${_activeLibCat===k?'active':''}" onclick="_setLibCat('${k}')">${v}</button>`
      ).join('')}
    </div>`;

  const filtered = type === 'pos'
    ? presets
    : presets.filter(d => _activeLibCat === 'all' || d.cat === _activeLibCat);

  const listItems = filtered.map((d, i) => `
    <div class="drill-lib-item">
      <div class="drill-lib-info">
        <div class="drill-lib-name">${escLibHtml(d.name)}</div>
        ${d.cat && d.cat !== 'pos'
          ? `<span class="drill-lib-cat">${CAT_LABEL[d.cat] || d.cat}</span>`
          : ''}
        ${d.time ? `<span class="drill-lib-time">${d.time}分</span>` : ''}
        ${d.desc ? `<div class="drill-lib-desc">${escLibHtml(d.desc)}</div>` : ''}
      </div>
      <button class="drill-lib-add-btn" onclick="_addFromLibrary(${i})">＋ 追加</button>
    </div>`).join('');

  inner.innerHTML = `
    <div class="drill-modal-tabs">
      <button class="drill-modal-tab active" id="tab-library" onclick="_switchModalTab('library')">📋 リストから選ぶ</button>
      <button class="drill-modal-tab" id="tab-custom" onclick="_switchModalTab('custom')">✏️ カスタムで追加</button>
    </div>

    <div id="drill-tab-library" class="drill-modal-section">
      ${catBar}
      <div class="drill-lib-search">
        <input type="text" id="drill-lib-search-input" placeholder="🔍 ドリル名で検索..." oninput="_filterLibSearch()" autocomplete="off">
      </div>
      <div class="drill-lib-list" id="drill-lib-list">
        ${listItems || '<div class="drill-lib-empty">該当するドリルがありません</div>'}
      </div>
    </div>

    <div id="drill-tab-custom" class="drill-modal-section" style="display:none;">
      <div class="drill-custom-form">
        <div class="menu-edit-row">
          <label>メニュー名 <span style="color:#dc2626">*</span></label>
          <input type="text" id="custom-drill-name" placeholder="例：3対3ゲーム">
        </div>
        ${type === 'level' ? `
        <div class="menu-edit-row">
          <label>カテゴリ</label>
          <select id="custom-drill-cat">
            ${Object.entries(CAT_LABEL).map(([k,v]) => `<option value="${k}">${v}</option>`).join('')}
          </select>
        </div>
        <div class="menu-edit-row">
          <label>時間（分）</label>
          <input type="number" id="custom-drill-time" placeholder="15" min="1" max="120" value="15">
        </div>` : ''}
        <div class="menu-edit-row">
          <label>説明・内容</label>
          <textarea id="custom-drill-desc" rows="3" placeholder="ドリルの内容・目的を入力..."></textarea>
        </div>
        <button class="btn btn-primary" style="width:100%;margin-top:4px;" onclick="_addCustomDrill()">＋ 追加する</button>
      </div>
    </div>`;

  // 現在のフィルター済みリストを _filteredPresets に保持
  window._filteredPresetsCache = filtered;
}

function _setLibCat(cat) {
  _activeLibCat = cat;
  _renderModalContent();
}

function _switchModalTab(tab) {
  document.getElementById('drill-tab-library').style.display = tab === 'library' ? 'block' : 'none';
  document.getElementById('drill-tab-custom').style.display  = tab === 'custom'  ? 'block' : 'none';
  document.getElementById('tab-library').classList.toggle('active', tab === 'library');
  document.getElementById('tab-custom').classList.toggle('active', tab === 'custom');
}

function _filterLibSearch() {
  const q = document.getElementById('drill-lib-search-input')?.value?.toLowerCase() || '';
  const { type, id } = _modalTarget;
  let presets;
  if (type === 'pos') {
    presets = (window.ALL_MENU_PRESETS && window.ALL_MENU_PRESETS.length > 0)
      ? window.ALL_MENU_PRESETS.filter(m => m.scope === id)
      : (POS_PRESETS[id] || []).map(d => ({ ...d, cat: 'pos' }));
  } else {
    const base = (window.ALL_MENU_PRESETS && window.ALL_MENU_PRESETS.length > 0)
      ? window.ALL_MENU_PRESETS.filter(m => m.scope === 'team' || m.scope === 'all')
      : DRILL_PRESETS;
    presets = base.filter(d => _activeLibCat === 'all' || d.cat === _activeLibCat);
  }
  const filtered = q ? presets.filter(d => d.name.toLowerCase().includes(q) || (d.desc||'').toLowerCase().includes(q)) : presets;
  window._filteredPresetsCache = filtered;
  const list = document.getElementById('drill-lib-list');
  if (!list) return;
  list.innerHTML = filtered.map((d, i) => `
    <div class="drill-lib-item">
      <div class="drill-lib-info">
        <div class="drill-lib-name">${escLibHtml(d.name)}</div>
        ${d.cat && d.cat !== 'pos' ? `<span class="drill-lib-cat">${CAT_LABEL[d.cat]||d.cat}</span>` : ''}
        ${d.time ? `<span class="drill-lib-time">${d.time}分</span>` : ''}
        ${d.desc ? `<div class="drill-lib-desc">${escLibHtml(d.desc)}</div>` : ''}
      </div>
      <button class="drill-lib-add-btn" onclick="_addFromLibrary(${i})">＋ 追加</button>
    </div>`).join('') || '<div class="drill-lib-empty">該当するドリルがありません</div>';
}

function _addFromLibrary(idx) {
  const preset = (window._filteredPresetsCache || [])[idx];
  if (!preset || !_modalTarget) return;
  const { type, id } = _modalTarget;
  if (type === 'level') {
    addMenuItemFromPreset(id, preset);
  } else {
    addPosItemFromPreset(id, preset);
  }
  // ボタンを一時的に「✅ 追加済み」に変更
  const btn = document.querySelectorAll('.drill-lib-add-btn')[idx];
  if (btn) { btn.textContent = '✅ 追加済み'; btn.disabled = true; btn.style.background = '#059669'; }
}

function _addCustomDrill() {
  const name = document.getElementById('custom-drill-name')?.value?.trim() || '';
  if (!name) { alert('メニュー名を入力してください'); return; }
  const { type, id } = _modalTarget;
  const preset = {
    name,
    cat:  document.getElementById('custom-drill-cat')?.value  || 'tech',
    time: parseInt(document.getElementById('custom-drill-time')?.value) || 15,
    desc: document.getElementById('custom-drill-desc')?.value?.trim() || '',
  };
  if (type === 'level') {
    addMenuItemFromPreset(id, preset);
  } else {
    addPosItemFromPreset(id, preset);
  }
  closeAddModal();
}

function escLibHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
