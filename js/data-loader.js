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
const MENU_CACHE_TTL = 1000 * 60 * 30;  // 30分

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
function _applyMenuData(menus) {
  if (!menus || menus.length === 0) return;

  // 汎用メニュー（position_group = 'all'）→ DRILL_PRESETS
  const generalMenus = menus.filter(m => m.position_group === 'all');
  if (generalMenus.length > 0) {
    window.DRILL_PRESETS = generalMenus
      .sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0))
      .map(m => ({
        menu_id:  m.menu_id,
        name:     m.menu_name,
        cat:      m.category,
        time:     parseInt(m.duration_min) || 0,
        desc:     m.summary,
        theme:    m.theme || '',
        purpose:  m.purpose_group || '',
        problem:  m.problem_main || '',
        level:    m.level || '',
        steps:    m.steps_list || [],
        coaching: m.coaching_points || '',
        fep:      m.fep_focus || '',
      }));
  }

  // ポジション別メニュー → POS_PRESETS
  const positions = ['gk', 'df', 'mf', 'fw'];
  const posUpdates = {};
  positions.forEach(pos => {
    const posMenus = menus
      .filter(m => m.position_group === pos)
      .sort((a, b) => (parseInt(a.sort_order) || 0) - (parseInt(b.sort_order) || 0));
    if (posMenus.length > 0) {
      posUpdates[pos] = posMenus.map(m => ({
        menu_id:  m.menu_id,
        name:     m.menu_name,
        desc:     m.summary,
        theme:    m.theme || '',
        purpose:  m.purpose_group || '',
        problem:  m.problem_main || '',
        level:    m.level || '',
        steps:    m.steps_list || [],
        coaching: m.coaching_points || '',
        eval:     m.evaluation_points || '',
        fep:      m.fep_focus || '',
      }));
    }
  });

  if (Object.keys(posUpdates).length > 0) {
    // 既存の POS_PRESETS をベースに上書き
    if (typeof window.POS_PRESETS === 'undefined') window.POS_PRESETS = {};
    Object.assign(window.POS_PRESETS, posUpdates);
  }

  console.log(`[data-loader] Applied: ${generalMenus.length} general + ${
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
}

// ── 現在開いているページを再描画 ────────────────────────────
function _refreshCurrentPage() {
  // core.js の currentPage 変数を参照して再init
  const page = (typeof currentPage !== 'undefined') ? currentPage : null;
  if (!page) return;
  if (page === 'menu' && typeof initMenuPage === 'function') {
    initMenuPage();
  } else if (page === 'position' && typeof initPositionPage === 'function') {
    initPositionPage();
  }
}

// ── アプリ起動時に自動実行 ──────────────────────────────────
// DOMContentLoaded より後に drill-library.js が読まれているので
// window.onload または DOMContentLoaded 後に実行する
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadMenuData);
} else {
  // すでにDOM準備完了の場合
  loadMenuData();
}
