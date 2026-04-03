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
