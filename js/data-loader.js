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

// ── Sheet データを DRILL_PRESETS / POS_PRESETS 形式に変換 ────
function _normalizeMenu(m) {
  // 新テンプレート（scope, name, cat, ...）と旧テンプレート（position_group, menu_name, category, ...）の両方に対応
  return {
    menu_id:     m.menu_id || '',
    name:        m.name || m.menu_name || '',
    cat:         m.cat || m.category || '',
    scope:       m.scope || m.position_group || 'team',
    age:         m.age || m.age_group || 'all',
    layer:       m.layer || '',
    purpose:     m.purpose || m.purpose_group || '',
    purpose_list: m.purpose_list || [],
    channels:    m.channels || '',
    channels_list: m.channels_list || [],
    coaching:    m.coaching || '',
    vfe_target:  m.vfe_target || '',
    time:        parseInt(m.time || m.duration_min) || 0,
    desc:        m.desc || m.summary || '',
    fep:         m.fep || m.fep_focus || '',
    steps:       m.steps_list || [],
    coaching_points: m.coaching_points_list || [],
    // 旧テンプレート互換
    theme:       m.theme || '',
    level:       m.level || '',
  };
}

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
