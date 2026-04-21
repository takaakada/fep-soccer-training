// ══════════════════════════════════════════════════════════
// COACH SESSIONS / PRESETS STORE
//   - Supabase が使えればそちらに書き込む
//   - テーブル未作成や未認証時は localStorage にフォールバック
//   - UI 層は同期 API (listCoachSessions / listPresets) で読める
//     ように、ロード時に内部キャッシュへ展開する
// ══════════════════════════════════════════════════════════
(function () {
  const UI_STATE_KEY = 'fep_session_ui_v2';     // 現在選択中のセッションID
  const LS_SESSIONS = 'fep_coach_sessions_v2';  // オフライン時のコーチセッション
  const LS_PRESETS = 'fep_presets_v2';          // オフライン時のプリセット

  const DEFAULT_PRESETS = [
    { id: 1, name: 'Preset 1' },
    { id: 2, name: 'Preset 2' },
    { id: 3, name: 'Preset 3' },
    { id: 4, name: 'Preset 4' },
  ];

  // 内部キャッシュ
  let cache = {
    coachSessions: [],  // { id: UUID, group_id, session_date, label, preset_id }
    presets: [],        // { id, name, description, config }
    loadedForGroup: null,
    useSupabase: false,
  };

  // ──────────────────────────────────────────────────
  // UI state（localStorage）
  // ──────────────────────────────────────────────────
  function loadUiState() {
    try { return JSON.parse(localStorage.getItem(UI_STATE_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function saveUiState(state) {
    try { localStorage.setItem(UI_STATE_KEY, JSON.stringify(state)); }
    catch (e) { /* ignore */ }
  }

  function getCurrentCoachSessionId() {
    return loadUiState().currentCoachSessionId || null;
  }
  function setCurrentCoachSessionId(id) {
    const s = loadUiState();
    s.currentCoachSessionId = id || null;
    saveUiState(s);
  }

  // ──────────────────────────────────────────────────
  // localStorage フォールバック
  // ──────────────────────────────────────────────────
  function loadLocalSessions() {
    try { return JSON.parse(localStorage.getItem(LS_SESSIONS)) || []; }
    catch (e) { return []; }
  }
  function saveLocalSessions(list) {
    try { localStorage.setItem(LS_SESSIONS, JSON.stringify(list)); }
    catch (e) { /* ignore */ }
  }
  function loadLocalPresets() {
    try {
      const raw = localStorage.getItem(LS_PRESETS);
      return raw ? JSON.parse(raw) : DEFAULT_PRESETS.slice();
    } catch (e) { return DEFAULT_PRESETS.slice(); }
  }

  // ──────────────────────────────────────────────────
  // Supabase アクセス
  // ──────────────────────────────────────────────────
  function getDb() {
    return (typeof sbFep !== 'undefined' && sbFep) ? sbFep : null;
  }

  async function fetchPresetsFromDb() {
    const db = getDb();
    if (!db) return null;
    const { data, error } = await db.from('presets').select('*').order('id');
    if (error) {
      console.warn('[sessions] presets fetch failed, falling back:', error.message);
      return null;
    }
    return data || [];
  }

  async function fetchCoachSessionsFromDb(groupId) {
    const db = getDb();
    if (!db || !groupId) return null;
    const { data, error } = await db
      .from('coach_sessions')
      .select('*')
      .eq('group_id', groupId)
      .order('session_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[sessions] coach_sessions fetch failed:', error.message);
      return null;
    }
    return data || [];
  }

  async function insertCoachSession(row) {
    const db = getDb();
    if (!db) return null;
    const { data, error } = await db
      .from('coach_sessions')
      .insert(row)
      .select('*')
      .single();
    if (error) {
      console.warn('[sessions] coach_sessions insert failed:', error.message);
      return null;
    }
    return data;
  }

  async function updateCoachSessionPreset(id, presetId) {
    const db = getDb();
    if (!db) return false;
    const { error } = await db
      .from('coach_sessions')
      .update({ preset_id: presetId })
      .eq('id', id);
    if (error) {
      console.warn('[sessions] coach_sessions update failed:', error.message);
      return false;
    }
    return true;
  }

  // ──────────────────────────────────────────────────
  // Public: ロード（グループ切替時に呼び出す）
  // ──────────────────────────────────────────────────
  async function loadForGroup(groupId) {
    // presets
    const dbPresets = await fetchPresetsFromDb();
    if (dbPresets && dbPresets.length) {
      cache.presets = dbPresets;
      cache.useSupabase = true;
    } else {
      cache.presets = loadLocalPresets();
    }

    // coach sessions
    if (groupId) {
      const dbSessions = await fetchCoachSessionsFromDb(groupId);
      if (dbSessions) {
        cache.coachSessions = dbSessions;
        cache.useSupabase = true;
      } else {
        cache.coachSessions = loadLocalSessions().filter(s => s.group_id === groupId);
      }
    } else {
      cache.coachSessions = loadLocalSessions();
    }

    cache.loadedForGroup = groupId || null;
    return cache;
  }

  // ──────────────────────────────────────────────────
  // Public: 同期読み取り
  // ──────────────────────────────────────────────────
  function listCoachSessions() { return cache.coachSessions.slice(); }
  function listPresets() { return cache.presets.slice(); }
  function getPresetById(id) {
    if (id == null) return null;
    return cache.presets.find(p => String(p.id) === String(id)) || null;
  }
  function getCoachSessionById(id) {
    if (!id) return null;
    return cache.coachSessions.find(s => s.id === id) || null;
  }

  // ──────────────────────────────────────────────────
  // Public: 新規セッション作成
  // ──────────────────────────────────────────────────
  async function createCoachSession({ groupId, date, label, presetId }) {
    const today = date || new Date().toISOString().slice(0, 10);
    const uid = (typeof getActiveUserId === 'function') ? getActiveUserId() : null;
    const row = {
      group_id:     groupId,
      session_date: today,
      label:        label || 'Session',
      preset_id:    presetId != null ? Number(presetId) : null,
      created_by:   uid,
    };

    if (getDb() && groupId) {
      const inserted = await insertCoachSession(row);
      if (inserted) {
        cache.coachSessions.unshift(inserted);
        return inserted;
      }
      // フォールバック
    }

    // ローカル保存
    const local = {
      ...row,
      id: 'local-' + Date.now(),
      created_at: new Date().toISOString(),
    };
    const list = loadLocalSessions();
    list.unshift(local);
    saveLocalSessions(list);
    cache.coachSessions.unshift(local);
    return local;
  }

  async function setPresetForCoachSession(coachSessionId, presetId) {
    if (!coachSessionId) return false;
    const target = cache.coachSessions.find(s => s.id === coachSessionId);
    if (target) target.preset_id = presetId != null ? Number(presetId) : null;

    if (getDb() && !String(coachSessionId).startsWith('local-')) {
      return await updateCoachSessionPreset(coachSessionId, presetId != null ? Number(presetId) : null);
    }
    // ローカルケース
    const list = loadLocalSessions();
    const i = list.findIndex(s => s.id === coachSessionId);
    if (i >= 0) {
      list[i].preset_id = presetId != null ? Number(presetId) : null;
      saveLocalSessions(list);
    }
    return true;
  }

  // ──────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────
  window.SessionPresets = {
    // lifecycle
    loadForGroup,

    // sync readers
    listCoachSessions,
    listPresets,
    getCoachSessionById,
    getPresetById,

    // mutations
    createCoachSession,
    setPresetForCoachSession,

    // UI state
    getCurrentCoachSessionId,
    setCurrentCoachSessionId,

    // debug
    _cache: () => cache,
  };
})();
