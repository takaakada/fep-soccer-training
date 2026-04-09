// ══════════════════════════════════════════════════════════════
// GROUP-CONTEXT.JS — グループ選択状態の管理
// ══════════════════════════════════════════════════════════════
//
// グループ = team + category + subcategory の組み合わせ
// 全データ入力の共通コンテキストとして使用する
//
// 依存: sbFep (core.js で初期化済み)
// ══════════════════════════════════════════════════════════════

const GroupContext = (() => {
  'use strict';

  const STORAGE_KEY = 'fep_active_group';
  let _cachedGroups = null;

  // ── グループ一覧取得 ────────────────────────────────────
  async function loadGroups() {
    if (!sbFep) return [];
    const { data, error } = await sbFep
      .from('groups')
      .select('*')
      .order('team')
      .order('category')
      .order('subcategory');
    if (error) {
      console.error('GroupContext.loadGroups:', error);
      return [];
    }
    _cachedGroups = data || [];
    return _cachedGroups;
  }

  function getCachedGroups() {
    return _cachedGroups || [];
  }

  // ── アクティブグループ管理 ──────────────────────────────

  function getActiveGroup() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function getActiveGroupId() {
    const g = getActiveGroup();
    return g ? g.id : null;
  }

  function setActiveGroup(group) {
    if (group) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(group));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }

  function clearActiveGroup() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  // ── グループ Upsert ────────────────────────────────────
  // team + category + subcategory で既存を探し、なければ作成
  async function upsertGroup(team, category, subcategory) {
    if (!sbFep) return null;
    const cat = category || '';
    const sub = subcategory || '';

    // 既存チェック
    const { data: existing, error: selErr } = await sbFep
      .from('groups')
      .select('*')
      .eq('team', team)
      .eq('category', cat)
      .eq('subcategory', sub)
      .maybeSingle();

    if (selErr) {
      console.error('GroupContext.upsertGroup select:', selErr);
      return null;
    }
    if (existing) return existing;

    // 新規作成
    const row = {
      team,
      category: cat,
      subcategory: sub,
      created_by: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null,
    };
    const { data: created, error: insErr } = await sbFep
      .from('groups')
      .insert(row)
      .select('*')
      .single();

    if (insErr) {
      console.error('GroupContext.upsertGroup insert:', insErr);
      return null;
    }
    // キャッシュ更新
    if (_cachedGroups) _cachedGroups.push(created);
    return created;
  }

  // ── プレイヤーをグループに紐付け ────────────────────────
  async function assignPlayer(groupId, playerId) {
    if (!sbFep || !groupId || !playerId) return false;

    // 既存チェック (upsert)
    const { data: existing } = await sbFep
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('player_id', playerId)
      .maybeSingle();

    if (existing) return true; // 既に登録済み

    const { error } = await sbFep
      .from('group_members')
      .insert({ group_id: groupId, player_id: playerId });

    if (error) {
      console.error('GroupContext.assignPlayer:', error);
      return false;
    }
    return true;
  }

  // ── グループ情報バナー（読み取り専用、選手用）──────────
  function renderGroupBanner(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const group = getActiveGroup();
    if (!group) {
      el.innerHTML = `
        <div class="sf-alert sf-alert-blue">
          <span class="sf-alert-icon">👥</span>
          <div>グループ情報が設定されていません</div>
        </div>`;
      return;
    }

    const parts = [group.team, group.category, group.subcategory].filter(Boolean);
    el.innerHTML = `
      <div class="sf-alert sf-alert-blue">
        <span class="sf-alert-icon">👥</span>
        <div><strong>グループ：</strong>${parts.join(' / ')}</div>
      </div>`;
  }

  // ── カスケードドロップダウン（コーチ用）────────────────
  async function renderGroupSelector(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    const groups = _cachedGroups || await loadGroups();

    // ユニークな team 一覧
    const teams = [...new Set(groups.map(g => g.team))].sort();

    el.innerHTML = `
      <div class="sf-card" style="padding:12px 16px; margin-bottom:16px;">
        <div class="sf-card-title">👥 グループ選択</div>
        <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-end;">
          <div style="flex:1; min-width:140px;">
            <label class="sf-label" style="font-size:0.78rem;">チーム</label>
            <select id="gc-team" class="sf-select" onchange="GroupContext._onTeamChange()">
              <option value="">-- 選択 --</option>
              ${teams.map(t => `<option value="${t}">${t}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1; min-width:140px;">
            <label class="sf-label" style="font-size:0.78rem;">カテゴリ</label>
            <select id="gc-category" class="sf-select" onchange="GroupContext._onCategoryChange()" disabled>
              <option value="">-- 選択 --</option>
            </select>
          </div>
          <div style="flex:1; min-width:140px;">
            <label class="sf-label" style="font-size:0.78rem;">サブカテゴリ</label>
            <select id="gc-subcategory" class="sf-select" onchange="GroupContext._onSubcategoryChange()" disabled>
              <option value="">-- 選択 --</option>
            </select>
          </div>
        </div>
        <div id="gc-selected-display" style="margin-top:8px; font-size:0.82rem; color:var(--text-muted);"></div>
      </div>`;

    // 既存選択があれば復元
    const active = getActiveGroup();
    if (active) {
      _restoreSelector(active, groups);
    }
  }

  function _restoreSelector(active, groups) {
    const teamSel = document.getElementById('gc-team');
    if (!teamSel) return;

    teamSel.value = active.team;
    _onTeamChange(); // category をポピュレート

    const catSel = document.getElementById('gc-category');
    if (catSel && active.category) {
      catSel.value = active.category;
      _onCategoryChange(); // subcategory をポピュレート

      const subSel = document.getElementById('gc-subcategory');
      if (subSel && active.subcategory) {
        subSel.value = active.subcategory;
        _onSubcategoryChange();
      }
    }
  }

  function _onTeamChange() {
    const team = document.getElementById('gc-team')?.value;
    const catSel = document.getElementById('gc-category');
    const subSel = document.getElementById('gc-subcategory');
    const display = document.getElementById('gc-selected-display');

    if (!team) {
      if (catSel) { catSel.innerHTML = '<option value="">-- 選択 --</option>'; catSel.disabled = true; }
      if (subSel) { subSel.innerHTML = '<option value="">-- 選択 --</option>'; subSel.disabled = true; }
      if (display) display.textContent = '';
      setActiveGroup(null);
      return;
    }

    const groups = getCachedGroups();
    const categories = [...new Set(groups.filter(g => g.team === team).map(g => g.category))].sort();

    if (catSel) {
      catSel.innerHTML = '<option value="">-- 選択 --</option>' +
        categories.map(c => `<option value="${c}">${c || '(なし)'}</option>`).join('');
      catSel.disabled = false;
    }
    if (subSel) { subSel.innerHTML = '<option value="">-- 選択 --</option>'; subSel.disabled = true; }
    if (display) display.textContent = '';
    setActiveGroup(null);
  }

  function _onCategoryChange() {
    const team = document.getElementById('gc-team')?.value;
    const category = document.getElementById('gc-category')?.value;
    const subSel = document.getElementById('gc-subcategory');
    const display = document.getElementById('gc-selected-display');

    if (!team || category === '') {
      if (subSel) { subSel.innerHTML = '<option value="">-- 選択 --</option>'; subSel.disabled = true; }
      if (display) display.textContent = '';
      setActiveGroup(null);
      return;
    }

    const groups = getCachedGroups();
    const subcategories = [...new Set(
      groups.filter(g => g.team === team && g.category === category).map(g => g.subcategory)
    )].sort();

    if (subSel) {
      subSel.innerHTML = '<option value="">-- 全体 --</option>' +
        subcategories.filter(Boolean).map(s => `<option value="${s}">${s}</option>`).join('');
      subSel.disabled = false;
    }

    // category まで選択されたら、subcategory なしのグループをセット
    _selectGroup(team, category, '');
  }

  function _onSubcategoryChange() {
    const team = document.getElementById('gc-team')?.value;
    const category = document.getElementById('gc-category')?.value;
    const subcategory = document.getElementById('gc-subcategory')?.value || '';

    if (!team || category === '') return;
    _selectGroup(team, category, subcategory);
  }

  function _selectGroup(team, category, subcategory) {
    const groups = getCachedGroups();
    const match = groups.find(g =>
      g.team === team && g.category === category && g.subcategory === subcategory
    );

    const display = document.getElementById('gc-selected-display');

    if (match) {
      setActiveGroup(match);
      const parts = [team, category, subcategory].filter(Boolean);
      if (display) display.innerHTML = `<span style="color:#059669;">✓ ${parts.join(' / ')} を選択中</span>`;
    } else {
      // 未登録の組み合わせ → 後で保存時に作成
      setActiveGroup({ id: null, team, category, subcategory });
      const parts = [team, category, subcategory].filter(Boolean);
      if (display) display.innerHTML = `<span style="color:#d97706;">⚡ ${parts.join(' / ')}（新規グループ）</span>`;
    }
  }

  // ── Public API ────────────────────────────────────────────

  return {
    loadGroups,
    getCachedGroups,
    getActiveGroup,
    getActiveGroupId,
    setActiveGroup,
    clearActiveGroup,
    upsertGroup,
    assignPlayer,
    renderGroupBanner,
    renderGroupSelector,
    // カスケード用（グローバルから呼ばれる）
    _onTeamChange,
    _onCategoryChange,
    _onSubcategoryChange,
  };
})();
