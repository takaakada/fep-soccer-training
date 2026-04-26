// ══════════════════════════════════════════════════════════════
// DATA LOADER  (js/data-loader.js)
// ══════════════════════════════════════════════════════════════
// Google Sheets → /api/menus → localStorage キャッシュ → DRILL_PRESETS / POS_PRESETS
//
// 優先順位:
//   1. localStorage キャッシュ（30分以内）  → 即座に反映、バックグラウンドで更新
//   2. /api/menus（オンライン時）           → 取得成功したらキャッシュ更新
//   3. localStorage キャッシュ（期限切れ）  → オフライン時の保険
//   4. drill-library.js のハードコード値   → 最終フォールバック
// ══════════════════════════════════════════════════════════════

const MENU_CACHE_KEY = 'fep_menu_master_cache';
const INDIV_CACHE_KEY = 'fep_indiv_plan_cache';
const MENU_CACHE_TTL = 1000 * 60 * 30;  // 30分

// 個別プラン Google Sheets CSV URL
const INDIV_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTMK9I8caCEpPT6c2AO6QHY3H3yaIOaVy0lekXkJQyp6CixAOzYLeZQioFY0hzYC0eJ6VXb6GOzLiNi/pub?output=csv';

// ── ローカルキャッシュの読み書き ─────────────────────────────
function _readCache() {
  try {
    const raw = localStorage.getItem(MENU_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);  // { data: [...], ts: number }
  } catch {
    return null;
  }
}

function _writeCache(data) {
  try {
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {
    console.warn('[data-loader] localStorage write failed:', e);
  }
}

// ══════════════════════════════════════════════════════════════
// 統制語彙 → 表示ラベル
// 新テンプレート CSV の vfe_target / efe_target / eu_target 等を
// UI で日本語表示するためのマップ
// ══════════════════════════════════════════════════════════════
const MENU_LABELS = {
  vfe_target: {
    low_stable:    '低値安定',
    optimal:       '最適域',
    high_confused: '高値混乱',
  },
  efe_target: {
    settled:        '定着',
    exploratory:    '探索',
    goal_ambiguous: '目標曖昧',
    cost_sensitive: 'コスト高',
  },
  eu_target: {
    low_fixed:      '低値固定',
    optimal_stable: '適度安定',
    high_anxious:   '不安型',
  },
  menu_status: {
    draft:     'ドラフト',
    tested:    '試行済',
    validated: '検証済',
  },
  purpose_domain: {
    '感覚':     '感覚',
    '認知':     '認知',
    '相互作用': '相互作用',
    '長期目標': '長期目標',
  },
  modality: {
    prop:    '体性感覚',
    vision:  '視覚',
    vest:    '前庭覚',
    respi:   '呼吸・心拍',
    haptic:  '触覚',
  },
};

// pipe (|) 区切りの文字列 → 配列（空要素は除外）
function _splitList(s) {
  if (!s) return [];
  if (Array.isArray(s)) return s.filter(Boolean).map(x => String(x).trim());
  return String(s).split('|').map(x => x.trim()).filter(Boolean);
}

// menu_id から layer / sub_level / modality を抽出（CSV 列が空のときの fallback）
// 例: "L1-2-prop-001" → { layer: "L1", sub_level: 2, modality: "prop" }
//     "L2-tech-001"   → { layer: "L2", sub_level: null, modality: null }
function _parseMenuId(menuId) {
  if (!menuId) return { layer: '', sub_level: null, modality: '' };
  // 4-part: L{n}-{sub}-{modality}-{seq}
  let m = String(menuId).match(/^L(\d+)-(\d+)-([a-z]+)-\d+$/i);
  if (m) return { layer: 'L' + m[1], sub_level: Number(m[2]), modality: m[3].toLowerCase() };
  // 3-part: L{n}-{anything}-{seq}
  m = String(menuId).match(/^L(\d+)-([a-z]+)-\d+$/i);
  if (m) return { layer: 'L' + m[1], sub_level: null, modality: '' };
  return { layer: '', sub_level: null, modality: '' };
}

// ── Sheet データを正規化 ─────────────────────────────────────
function _normalizeMenu(m) {
  // 新テンプレート検出: session_phase / sensory_channels / coaching_tone / menu_status のいずれかが存在
  const isNew = ('session_phase' in m) ||
                ('sensory_channels' in m) ||
                ('coaching_tone' in m) ||
                ('menu_status' in m) ||
                ('target_scope' in m);

  if (isNew) {
    return _normalizeNewMenu(m);
  }
  return _normalizeLegacyMenu(m);
}

// 新テンプレート（training_menu_template.csv 準拠）
function _normalizeNewMenu(m) {
  const sessionPhase = m.session_phase || m.cat || '';
  const targetScope  = m.target_scope  || m.scope || 'team';
  const sensoryChRaw = m.sensory_channels || m.channels || '';
  const coachingTone = m.coaching_tone || m.coaching || '';

  // menu_id から layer / sub_level / modality を補完（CSV 列が空のとき）
  const parsed = _parseMenuId(m.menu_id);
  const layer = m.layer || parsed.layer || '';
  const subLevel = (m.sub_level !== '' && m.sub_level != null)
    ? Number(m.sub_level)
    : parsed.sub_level;
  const modality = m.modality || parsed.modality || '';

  return {
    // 識別子
    menu_id:     m.menu_id || '',
    menu_status: m.menu_status || 'draft',

    // 基本情報
    menu_name:   m.menu_name || m.name || '',
    category:    m.category || '',           // grade level (中学生/U15)
    age_group:   m.age_group || m.age || 'all',
    layer:       layer,
    sub_level:   subLevel,                   // 1-4 or null
    modality:    modality,                   // prop / vision / vest / etc

    // 分類
    session_phase: sessionPhase,
    target_scope:  targetScope,

    // 目的
    purpose_domain:       m.purpose_domain || '',
    purpose_detail:       m.purpose_detail || '',
    purpose_detail_list:  _splitList(m.purpose_detail),

    // 感覚チャネル / コーチング
    sensory_channels:      sensoryChRaw,
    sensory_channels_list: _splitList(sensoryChRaw),
    coaching_tone:         coachingTone,

    // FEP ターゲット
    vfe_target: m.vfe_target || '',
    efe_target: m.efe_target || '',
    eu_target:  m.eu_target  || '',

    // 設計パラメータ
    difficulty_level:     m.difficulty_level ? Number(m.difficulty_level) : null,
    success_rate_target:  m.success_rate_target ? Number(m.success_rate_target) : null,
    group_format:         m.group_format || '',
    time:                 parseInt(m.time || m.duration_min) || 0,

    // 運用（list 型: 配列。_raw に元の文字列を保持）
    equipment:         _splitList(m.equipment),
    equipment_raw:     m.equipment || '',
    constraints:       _splitList(m.constraints),
    constraints_raw:   m.constraints || '',

    // 内容
    desc:                    m.desc || m.summary || '',
    fep:                     m.fep  || m.fep_focus || '',
    steps:                   _splitList(m.steps),
    steps_raw:               m.steps || '',
    coaching_points:         _splitList(m.coaching_points),
    coaching_points_raw:     m.coaching_points || '',
    evaluation_points:       _splitList(m.evaluation_points),
    evaluation_points_raw:   m.evaluation_points || '',
    progression:             _splitList(m.progression),
    progression_raw:         m.progression || '',
    regression:              _splitList(m.regression),
    regression_raw:          m.regression || '',

    // ── 旧コード互換エイリアス（既存画面が参照）────────
    name:          m.menu_name || m.name || '',
    cat:           sessionPhase,                 // 旧: warm/tech/...
    scope:         targetScope,
    age:           m.age_group || m.age || 'all',
    channels:      sensoryChRaw,
    channels_list: _splitList(sensoryChRaw),
    coaching:      coachingTone,
    purpose:       m.purpose_domain || m.purpose || '',
    purpose_list:  _splitList(m.purpose_detail),
  };
}

// 旧テンプレート（scope, name, cat, position_group 互換）
function _normalizeLegacyMenu(m) {
  const cat = m.cat || m.category || '';
  const scope = m.scope || m.position_group || 'team';
  const channels = m.channels || '';
  const coaching = m.coaching || '';
  const parsed = _parseMenuId(m.menu_id);

  return {
    // 新スキーマ側のフィールドも同時に埋める
    menu_id:     m.menu_id || '',
    menu_status: 'draft',
    menu_name:   m.name || m.menu_name || '',
    category:    '',  // 旧テンプレートには grade 情報なし
    age_group:   m.age || m.age_group || 'all',
    layer:       m.layer || parsed.layer || '',
    sub_level:   parsed.sub_level,
    modality:    parsed.modality,
    session_phase: cat,
    target_scope:  scope,

    purpose_domain:       '',
    purpose_detail:       m.purpose || m.purpose_group || '',
    purpose_detail_list:  _splitList(m.purpose || m.purpose_group),

    sensory_channels:      channels,
    sensory_channels_list: _splitList(channels.replace(/,/g, '|')),
    coaching_tone:         coaching,

    vfe_target: m.vfe_target || '',
    efe_target: '',
    eu_target:  '',

    difficulty_level: null,
    success_rate_target: null,
    group_format: '',
    time: parseInt(m.time || m.duration_min) || 0,

    equipment: [], equipment_raw: '',
    constraints: [], constraints_raw: '',

    desc: m.desc || m.summary || '',
    fep:  m.fep  || m.fep_focus || '',
    steps: m.steps_list || [],
    steps_raw: '',
    coaching_points: m.coaching_points_list || [],
    coaching_points_raw: '',
    evaluation_points: [], evaluation_points_raw: '',
    progression: [], progression_raw: '',
    regression: [], regression_raw: '',

    // 旧エイリアス
    name:        m.name || m.menu_name || '',
    cat:         cat,
    scope:       scope,
    age:         m.age || m.age_group || 'all',
    channels:    channels,
    channels_list: _splitList(channels.replace(/,/g, '|')),
    coaching:    coaching,
    purpose:     m.purpose || m.purpose_group || '',
    purpose_list: m.purpose_list || [],
    theme:       m.theme || '',
    level:       m.level || '',
  };
}

// グローバル公開（他スクリプトから参照）
window.MENU_LABELS = MENU_LABELS;
window._normalizeMenu = _normalizeMenu;

function _applyMenuData(menus) {
  if (!menus || menus.length === 0) return;

  // 全メニューを正規化
  const normalized = menus.map(_normalizeMenu);

  // 汎用メニュー（scope = 'team' or position_group = 'all'）→ DRILL_PRESETS
  const generalMenus = normalized.filter(m => m.scope === 'team' || m.scope === 'all');
  if (generalMenus.length > 0) {
    window.DRILL_PRESETS = generalMenus;
  }

  // ポジション別メニュー → POS_PRESETS
  const positions = ['gk', 'df', 'mf', 'fw'];
  const posUpdates = {};
  positions.forEach(pos => {
    const posMenus = normalized.filter(m => m.scope === pos);
    if (posMenus.length > 0) {
      posUpdates[pos] = posMenus;
    }
  });

  if (Object.keys(posUpdates).length > 0) {
    if (typeof window.POS_PRESETS === 'undefined') window.POS_PRESETS = {};
    Object.assign(window.POS_PRESETS, posUpdates);
  }

  // 全メニュー統合リストも保持（セッション記録のピッカー用）
  window.ALL_MENU_PRESETS = normalized;

  console.log(`[data-loader] Applied: ${generalMenus.length} team + ${
    Object.values(posUpdates).reduce((s, a) => s + a.length, 0)} position menus`);
}

// ── API からフェッチ ─────────────────────────────────────────
async function _fetchFromAPI() {
  const res = await fetch('/api/menus', { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.menus || [];
}

// ── メイン：メニューデータを読み込む ───────────────────────
async function loadMenuData() {
  const cached = _readCache();
  const cacheAge = cached ? Date.now() - cached.ts : Infinity;
  const cacheValid = cacheAge < MENU_CACHE_TTL;

  // キャッシュが有効なら即座に適用（UXを阻害しない）
  if (cacheValid && cached.data) {
    _applyMenuData(cached.data);
  }

  // オンラインならバックグラウンドで更新試行
  try {
    const fresh = await _fetchFromAPI();
    if (fresh.length > 0) {
      _writeCache(fresh);
      _applyMenuData(fresh);
      console.log('[data-loader] Updated from Google Sheets');
      // ページ上のコンテンツを再描画（既に開いているページがあれば）
      _refreshCurrentPage();
    }
  } catch (e) {
    if (!cacheValid && cached?.data) {
      // 期限切れキャッシュをフォールバックとして使う
      _applyMenuData(cached.data);
      console.warn('[data-loader] Offline: using stale cache');
    } else if (!cached) {
      console.warn('[data-loader] Offline and no cache: using hardcoded defaults');
    }
  }

  // ALL_MENU_PRESETS がまだ空なら、ハードコードの DRILL_PRESETS + POS_PRESETS から構築
  if (!window.ALL_MENU_PRESETS || window.ALL_MENU_PRESETS.length === 0) {
    _buildAllMenuFromHardcoded();
  }
}

function _buildAllMenuFromHardcoded() {
  const all = [];
  // DRILL_PRESETS（汎用）
  if (typeof DRILL_PRESETS !== 'undefined' && Array.isArray(DRILL_PRESETS)) {
    DRILL_PRESETS.forEach(m => all.push(_normalizeMenu({ ...m, scope: m.scope || 'team' })));
  }
  // POS_PRESETS（ポジション別）
  if (typeof POS_PRESETS !== 'undefined' && POS_PRESETS) {
    ['gk', 'df', 'mf', 'fw'].forEach(pos => {
      if (Array.isArray(POS_PRESETS[pos])) {
        POS_PRESETS[pos].forEach(m => all.push(_normalizeMenu({ ...m, scope: pos, cat: m.cat || 'tech' })));
      }
    });
  }
  if (all.length > 0) {
    window.ALL_MENU_PRESETS = all;
    console.log(`[data-loader] Built ALL_MENU_PRESETS from hardcoded: ${all.length} menus`);
  }
}

// ══════════════════════════════════════════════════════════════
// INDIVIDUAL PLANS LOADER  — Google Sheets CSV → INDIVIDUAL_ERROR_PLANS
// ══════════════════════════════════════════════════════════════

function _readIndivCache() {
  try {
    const raw = localStorage.getItem(INDIV_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function _writeIndivCache(data) {
  try {
    localStorage.setItem(INDIV_CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) { console.warn('[data-loader] indiv cache write failed:', e); }
}

// ── CSV テキストをパース（タブ or カンマ対応）─────────────────
function _parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  // delimiter 自動検出（ヘッダー行にタブが多ければTSV）
  const delim = (lines[0].split('\t').length > lines[0].split(',').length) ? '\t' : ',';
  const headers = lines[0].split(delim).map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = _splitCSVLine(lines[i], delim);
    if (vals.length < headers.length) continue;
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (vals[idx] || '').trim().replace(/^"|"$/g, ''); });
    rows.push(obj);
  }
  return rows;
}

function _splitCSVLine(line, delim) {
  // 簡易CSV/TSVパーサ（ダブルクォート対応）
  const result = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === delim && !inQuote) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ── CSV行 → INDIVIDUAL_ERROR_PLANS 形式に変換 ─────────────────
function _normalizeIndivPlan(row) {
  return {
    plan_id:        row.plan_id || '',
    plan_name:      row.plan_name || '',
    error_type:     row.error_type || 'unclassified',
    ui_label:       row.ui_label || row.plan_name || '',
    icon:           row.icon || '📋',
    color:          row.color || '#666',
    target_age:     row.target_age || 'all',
    target_position: (row.target_position || 'all').split(',').map(s => s.trim()),
    position_examples: {
      gk: row.position_example_gk || '',
      df: row.position_example_df || '',
      mf: row.position_example_mf || '',
      fw: row.position_example_fw || '',
    },
    problem_main:   row.problem_main || '',
    problem_sub:    (row.problem_sub || '').split(',').map(s => s.trim()).filter(Boolean),
    summary:        row.summary || '',
    common_signs:   (row.common_signs || '').split('|').map(s => s.trim()).filter(Boolean),
    background:     (row.background || '').split('|').map(s => s.trim()).filter(Boolean),
    improvement_goal: row.improvement_goal || '',
    training_steps: [
      { title: row.step1_title || '', desc: row.step1_desc || '', layer: row.step1_layer || 'L1', duration: parseInt(row.step1_duration) || 10 },
      { title: row.step2_title || '', desc: row.step2_desc || '', layer: row.step2_layer || 'L2', duration: parseInt(row.step2_duration) || 15 },
      { title: row.step3_title || '', desc: row.step3_desc || '', layer: row.step3_layer || 'L3', duration: parseInt(row.step3_duration) || 15 },
      { title: row.step4_title || '', desc: row.step4_desc || '', layer: row.step4_layer || 'L2', duration: parseInt(row.step4_duration) || 10 },
    ].filter(s => s.title),  // タイトルが空のステップは除外
    eval_points: [
      row.eval_point_1, row.eval_point_2, row.eval_point_3, row.eval_point_4
    ].filter(Boolean),
    coaching_note:  row.coaching_note || '',
    note_for_player: row.note_for_player || '',
    difficulty:     row.difficulty || 'basic',
    duration_total: parseInt(row.duration_total) || 40,
    is_active:      (row.is_active || 'true').toLowerCase() !== 'false',
    sort_order:     parseInt(row.sort_order) || 99,
  };
}

function _applyIndivData(plans) {
  if (!plans || plans.length === 0) return;
  // INDIVIDUAL_ERROR_PLANS をスプレッドシートのデータで上書き
  window.INDIVIDUAL_ERROR_PLANS = plans;
  console.log(`[data-loader] Applied ${plans.length} individual error plans from spreadsheet`);
  // 現在のページが individual なら再描画
  _refreshCurrentPage();
}

// ── 個別プランをCSV URLから取得 ──────────────────────────────
async function _fetchIndivCSV() {
  const res = await fetch(INDIV_CSV_URL, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = await res.text();
  const rows = _parseCSV(text);
  return rows.map(_normalizeIndivPlan).filter(p => p.plan_id);
}

async function loadIndivData() {
  const cached = _readIndivCache();
  const cacheAge = cached ? Date.now() - cached.ts : Infinity;
  const cacheValid = cacheAge < MENU_CACHE_TTL;

  // キャッシュが有効なら即座に適用
  if (cacheValid && cached.data && cached.data.length > 0) {
    _applyIndivData(cached.data);
  }

  // オンラインならCSVを取得
  try {
    const fresh = await _fetchIndivCSV();
    if (fresh.length > 0) {
      _writeIndivCache(fresh);
      _applyIndivData(fresh);
      console.log('[data-loader] Individual plans updated from Google Sheets');
    }
  } catch (e) {
    console.warn('[data-loader] Individual CSV fetch failed:', e.message);
    if (!cacheValid && cached?.data && cached.data.length > 0) {
      _applyIndivData(cached.data);
      console.warn('[data-loader] Offline: using stale indiv cache');
    } else {
      // individual-plans.js のハードコード値がフォールバック
      console.log('[data-loader] Using hardcoded INDIVIDUAL_ERROR_PLANS as fallback');
    }
  }
}

// ── 現在開いているページを再描画（拡張）────────────────────────
function _refreshCurrentPage() {
  const page = (typeof currentPage !== 'undefined') ? currentPage : null;
  if (!page) return;
  if (page === 'menu' && typeof initMenuPage === 'function') {
    initMenuPage();
  } else if (page === 'position' && typeof initPositionPage === 'function') {
    initPositionPage();
  } else if (page === 'individual' && typeof initIndividualPage === 'function') {
    initIndividualPage();
  }
}

// ── アプリ起動時に自動実行 ──────────────────────────────────
// DOMContentLoaded より後に drill-library.js が読まれているので
// window.onload または DOMContentLoaded 後に実行する
function _initAllData() {
  loadMenuData();
  loadIndivData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _initAllData);
} else {
  _initAllData();
}
