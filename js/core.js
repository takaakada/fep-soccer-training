// ══════════════════════════════════════════════════════════
// SUPABASE CONFIG & AUTH
// ══════════════════════════════════════════════════════════
// ── Inflexion Index Supabase（認証 + VFE指標書き込み）──
const SUPABASE_URL  = 'https://wmmihubjabdvicxbceip.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbWlodWJqYWJkdmljeGJjZWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTY4ODEsImV4cCI6MjA4MDQzMjg4MX0.a0c-_RNfrWE9o3itMcxEBTy_uZPowv3bVLLFmz9XHfU';

// ── FEP Soccer Training Supabase（セッション記録・フリーテキスト）──
const FEP_URL  = 'https://gypuobgbulrmlgljjrsq.supabase.co';
const FEP_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5cHVvYmdidWxybWxnbGpqcnNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDU1NzIsImV4cCI6MjA4OTEyMTU3Mn0.dY-ADW2SC3mg05R_k4YzSEDtUtwuXQbXUEjMiJP7Vig';

const REDIRECT_URL = window.location.origin + window.location.pathname;

let sb    = null;   // Inflexion Index（認証 + VFE書き込み）
let sbFep = null;   // FEP Soccer Training（セッション記録）
let currentUser = null;
let currentRole = null;     // 'coach' | 'player'
let currentPlayer = null;   // { id, team_name, player_name, position }

// コーチ専用ページ
const COACH_ONLY_PAGES = new Set([
  'menu', 'position', 'individual', 'session-coach-record',
  'session-result', 'player-profile', 'eval', 'about', 'kadai'
]);

// ── ページ履歴管理 ───────────────────────────────────────
let currentPage = 'home';
const pageHistory = [];   // ページ遷移履歴（戻るボタン用）

// ページ名の日本語表示マップ
const PAGE_LABELS = {
  'home': '🏠 ホーム',
  'session-pre-check': '📋 MTG後チェック',
  'session-record': '▶️ 練習後チェック',
  'session-efe': '📅 EFE月次記録',
  'menu': '📋 全体トレーニング',
  'position': '⚽ ポジション別',
  'individual': '🏃 個別トレーニング',
  'session-coach-record': '📝 コーチ記録',
  'session-result': '📊 結果・提案',
  'player-profile': '👤 選手プロフィール',
  'eval': '📄 評価シート',
  'about': '📚 指導理論',
  'kadai': '🎯 課題チャレンジ',
};

// ユーザーID取得（コーチ or 選手）
function getActiveUserId() {
  if (currentRole === 'coach' && currentUser) return currentUser.id;
  if (currentRole === 'player' && currentPlayer) return currentPlayer.id;
  return null;
}

function getActiveUserName() {
  if (currentRole === 'coach' && currentUser) return currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'Coach';
  if (currentRole === 'player' && currentPlayer) return currentPlayer.player_name;
  return 'Unknown';
}

function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('app-wrapper').style.display  = 'none';
  }

  function showApp() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-wrapper').style.display  = 'block';
  }

  function initSupabase() {
    try {
      sb    = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      sbFep = supabase.createClient(FEP_URL, FEP_ANON);

      // 初回セッション確認（ちらつき防止）
      sb.auth.getSession().then(({ data: { session } }) => {
        currentUser = session ? session.user : null;
        if (currentUser) {
          // 既にコーチとしてログイン済みならページ遷移しない
          if (currentRole !== 'coach') {
            currentRole = 'coach';
            showApp();
            renderAuthBadge(currentUser);
            applySidebarVisibility();
            const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
            if (homeBtn) showPage('home', homeBtn);
          }
        } else {
          // 選手セッション復元を試行
          restorePlayerSession();
        }
      });

      // 以降の状態変化を監視
      sb.auth.onAuthStateChange(async (event, session) => {
        currentUser = session ? session.user : null;
        if (event === 'SIGNED_IN' && currentUser) {
          // 初回ログイン時のみホームに遷移（既にログイン済みならスキップ）
          if (currentRole !== 'coach') {
            currentRole = 'coach';
            showApp();
            renderAuthBadge(currentUser);
            applySidebarVisibility();
            const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
            if (homeBtn) showPage('home', homeBtn);
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // トークン更新時はユーザー情報だけ更新（ページ遷移しない）
          currentUser = session ? session.user : null;
        } else if (event === 'SIGNED_OUT') {
          currentRole = null;
          currentPlayer = null;
          sessionStorage.removeItem('fep_player_session');
          showLoginScreen();
          renderAuthBadge(null);
        }
      });
    } catch(e) {
      console.error('[FEP] Supabase 初期化エラー:', e);
      showLoginScreen();
    }
  }

function renderAuthBadge(user) {
    const area       = document.getElementById('auth-area');
    const sidebarArea = document.getElementById('sidebar-auth-area');
    const dispName  = document.getElementById('menu-display-name');
    const dispEmail = document.getElementById('menu-email');
    const roleBadge = document.getElementById('menu-role-badge');
    const historyBtn = document.getElementById('menu-history-btn');
    const logoutLabel = document.getElementById('menu-logout-label');

    if (currentRole === 'coach' && user) {
      const name   = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email  = user.email || '';
      const avatar = user.user_metadata?.avatar_url;
      const initial = name.charAt(0).toUpperCase();

      if (dispName)   dispName.textContent  = name;
      if (dispEmail)  dispEmail.textContent = email;
      if (roleBadge)  roleBadge.innerHTML = '<span class="role-badge coach">コーチ</span>';
      if (historyBtn) historyBtn.style.display = '';
      if (logoutLabel) logoutLabel.textContent = 'ログアウト';

      if (area) {
        area.innerHTML = `
          <div class="auth-badge" onclick="toggleUserMenu()">
            <div class="auth-avatar">
              ${avatar ? `<img src="${avatar}" alt="avatar">` : initial}
            </div>
            <span>${name}</span>
            <span class="role-badge coach">コーチ</span>
          </div>`;
      }
      if (sidebarArea) {
        sidebarArea.innerHTML = `
          <div class="sidebar-user-info" onclick="toggleUserMenu()">
            <div class="sidebar-user-avatar">
              ${avatar ? `<img src="${avatar}" alt="avatar">` : initial}
            </div>
            <div class="sidebar-user-text">
              <div class="sidebar-user-name">${name} <span class="role-badge coach">コーチ</span></div>
              <div class="sidebar-user-email">${email}</div>
            </div>
            <div class="sidebar-user-arrow">⌄</div>
          </div>`;
      }
    } else if (currentRole === 'player' && currentPlayer) {
      const name = currentPlayer.player_name;
      const team = currentPlayer.team_name;
      const initial = name.charAt(0);

      if (dispName)   dispName.textContent  = name;
      if (dispEmail)  dispEmail.textContent = team;
      if (roleBadge)  roleBadge.innerHTML = '<span class="role-badge player">選手</span>';
      if (historyBtn) historyBtn.style.display = 'none';
      if (logoutLabel) logoutLabel.textContent = '退出する';

      if (area) {
        area.innerHTML = `
          <div class="auth-badge" onclick="toggleUserMenu()">
            <div class="auth-avatar">${initial}</div>
            <span>${name}</span>
            <span class="role-badge player">選手</span>
          </div>`;
      }
      if (sidebarArea) {
        sidebarArea.innerHTML = `
          <div class="sidebar-user-info" onclick="toggleUserMenu()">
            <div class="sidebar-user-avatar">${initial}</div>
            <div class="sidebar-user-text">
              <div class="sidebar-user-name">${name} <span class="role-badge player">選手</span></div>
              <div class="sidebar-user-email">${team} | ${currentPlayer.position}</div>
            </div>
            <div class="sidebar-user-arrow">⌄</div>
          </div>`;
      }
    } else {
      if (area)        area.innerHTML = '';
      if (sidebarArea) sidebarArea.innerHTML = '';
    }
  }

function openLoginModal()  { /* login is required — handled by login screen */ }

function closeLoginModal() { /* no-op: cannot dismiss login */ }

function toggleUserMenu()  {
    document.getElementById('user-menu').classList.toggle('open');
    document.addEventListener('click', closeMenuOnOutside, { once: true });
  }

function closeUserMenu() { document.getElementById('user-menu').classList.remove('open'); }

function closeMenuOnOutside(e) {
    if (!document.getElementById('user-menu').contains(e.target) &&
        !document.getElementById('auth-area').contains(e.target)) {
      closeUserMenu();
    }
  }

async function loginWithGoogle() {
    if (!sb) { alert('Supabase が設定されていません。SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。'); return; }
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: REDIRECT_URL }
    });
    if (error) alert('ログインエラー: ' + error.message);
  }

async function logout() {
    closeUserMenu();
    if (currentRole === 'coach' && sb) {
      await sb.auth.signOut();
    }
    currentUser = null;
    currentRole = null;
    currentPlayer = null;
    sessionStorage.removeItem('fep_player_session');
    renderAuthBadge(null);
    showLoginScreen();
  }

// ══════════════════════════════════════════════════════════
// PLAYER LOGIN（選手ログイン — Google OAuth不要）
// ══════════════════════════════════════════════════════════

function showPlayerLoginForm() {
  document.getElementById('login-role-select').style.display = 'none';
  document.getElementById('player-login-form').style.display = 'block';
  document.getElementById('player-name-input')?.focus();
}

function hidePlayerLoginForm() {
  document.getElementById('player-login-form').style.display = 'none';
  document.getElementById('login-role-select').style.display = '';
}

async function loginAsPlayer() {
  const teamName   = document.getElementById('player-team-input')?.value?.trim();
  const playerName = document.getElementById('player-name-input')?.value?.trim();
  const position   = document.getElementById('player-position-input')?.value || 'MF';

  if (!teamName) { alert('チーム名を入力してください。'); return; }
  if (!playerName) { alert('名前を入力してください。'); return; }

  let playerRecord = null;

  // Supabase に選手レコードを upsert
  if (sbFep) {
    try {
      // 既存選手を検索
      const { data: existing } = await sbFep
        .from('players')
        .select('*')
        .eq('team_name', teamName)
        .eq('player_name', playerName)
        .limit(1);

      if (existing && existing.length > 0) {
        playerRecord = existing[0];
        // ポジション更新（変わった場合）
        if (playerRecord.position !== position) {
          await sbFep.from('players').update({ position }).eq('id', playerRecord.id);
          playerRecord.position = position;
        }
      } else {
        // 新規作成
        const { data: inserted, error } = await sbFep
          .from('players')
          .insert({ team_name: teamName, player_name: playerName, position })
          .select()
          .single();
        if (error) {
          console.error('Player insert error:', error);
          // Supabase失敗時はローカルIDで続行
          playerRecord = { id: 'local_' + Date.now(), team_name: teamName, player_name: playerName, position };
        } else {
          playerRecord = inserted;
        }
      }
    } catch(e) {
      console.error('Player login Supabase error:', e);
      playerRecord = { id: 'local_' + Date.now(), team_name: teamName, player_name: playerName, position };
    }
  } else {
    playerRecord = { id: 'local_' + Date.now(), team_name: teamName, player_name: playerName, position };
  }

  currentRole = 'player';
  currentPlayer = playerRecord;
  sessionStorage.setItem('fep_player_session', JSON.stringify(playerRecord));

  showApp();
  renderAuthBadge(null);
  applySidebarVisibility();
  const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
  if (homeBtn) showPage('home', homeBtn);
}

function restorePlayerSession() {
  const saved = sessionStorage.getItem('fep_player_session');
  if (saved) {
    try {
      currentPlayer = JSON.parse(saved);
      currentRole = 'player';
      showApp();
      renderAuthBadge(null);
      applySidebarVisibility();
      const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
      if (homeBtn) showPage('home', homeBtn);
      return;
    } catch(e) {
      sessionStorage.removeItem('fep_player_session');
    }
  }
  showLoginScreen();
}

// ══════════════════════════════════════════════════════════
// SIDEBAR VISIBILITY（ロール別表示制御）
// ══════════════════════════════════════════════════════════

function applySidebarVisibility() {
  const navItems = document.querySelectorAll('.sidebar-nav [data-role]');
  navItems.forEach(el => {
    const role = el.getAttribute('data-role');
    if (currentRole === 'coach') {
      // コーチは全部見える
      el.style.display = '';
    } else if (currentRole === 'player') {
      // 選手はplayer項目のみ
      el.style.display = (role === 'player') ? '' : 'none';
    } else {
      el.style.display = '';
    }
  });
}

function switchAgeTab(ageId, btn) {
    document.querySelectorAll('.age-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('#age-tabs .tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('age-' + ageId).style.display = 'block';
    if (btn) btn.classList.add('active');
  }

function switchDayTab(dayId, btn, groupClass) {
    document.querySelectorAll('.' + groupClass).forEach(c => c.style.display = 'none');
    if (btn && btn.parentElement) {
      btn.parentElement.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    const el = document.getElementById(dayId);
    if (el) el.style.display = 'block';
  }


// ── Sidebar Toggle ──
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// Override showPage with fetch-based version for dynamic page loading
async function showPage(id, btn) {
  // アクセス制御：選手がコーチ専用ページにアクセスしようとした場合はブロック
  if (currentRole === 'player' && COACH_ONLY_PAGES.has(id)) {
    console.warn(`[FEP] Player blocked from coach-only page: ${id}`);
    const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
    if (homeBtn) showPage('home', homeBtn);
    return;
  }

  // ── 履歴管理（戻るボタン用）────────────────────────
  if (_isNavigatingBack) {
    // 戻る操作中は履歴に追加しない
    _isNavigatingBack = false;
  } else if (currentPage && currentPage !== id) {
    pageHistory.push(currentPage);
    if (pageHistory.length > 20) pageHistory.shift();
  }
  currentPage = id;

  // Update sidebar active state
  document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // btnが渡されなかった場合、data-pageで自動検索
  if (!btn) {
    const autoBtn = document.querySelector(`.sidebar-nav-btn[data-page="${id}"]`);
    if (autoBtn) autoBtn.classList.add('active');
  }

  // Kadai page: special handling (React app already in DOM)
  const kadaiEl = document.getElementById('page-kadai');
  const containerEl = document.getElementById('page-container');

  if (id === 'kadai') {
    if (containerEl) containerEl.style.display = 'none';
    if (kadaiEl) kadaiEl.style.display = 'block';
    closeSidebar();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  // Show container, hide kadai
  if (kadaiEl) kadaiEl.style.display = 'none';
  if (containerEl) containerEl.style.display = 'block';

  // Fetch and inject page HTML
  try {
    const res = await fetch(`pages/${id}.html?v=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    // ナビバーを先頭に挿入 + ページHTML
    containerEl.innerHTML = _buildPageNavBar(id) + html;

    // ── innerHTML で挿入された <script> を手動で実行 ──────────
    // innerHTML では <script> が自動実行されないため、
    // 各スクリプトの中身を (0,eval)() でグローバルスコープで実行する
    containerEl.querySelectorAll('script').forEach(scriptEl => {
      if (scriptEl.src) {
        // 外部スクリプトの場合は新しいscript要素をheadに追加
        const ext = document.createElement('script');
        ext.src = scriptEl.src;
        document.head.appendChild(ext);
      } else if (scriptEl.textContent.trim()) {
        // インラインスクリプトはグローバルスコープで eval
        try {
          (0, eval)(scriptEl.textContent);
        } catch (e) {
          console.error('[FEP] Inline script error in page:', id, e);
        }
      }
    });

    // Run page-specific init functions
    if (id === 'eval' && typeof initEvalPage === 'function') {
      initEvalPage();
    }
    if (id === 'menu' && typeof initMenuPage === 'function') {
      initMenuPage();
    }
    if (id === 'position' && typeof initPositionPage === 'function') {
      initPositionPage();
    }
    if (id === 'individual' && typeof initIndividualPage === 'function') {
      initIndividualPage();
    }
    if (id === 'player-profile' && typeof initPlayerProfilePage === 'function') {
      initPlayerProfilePage();
    }
    // session-pre-check の初期化は pages/session-pre-check.html 内の
    // インラインスクリプトで自動実行される（initPreCheckPage()）
  } catch(e) {
    console.error('Page load error:', e);
    if (containerEl) {
      containerEl.innerHTML = `<div style="padding:40px;text-align:center;color:#666;">
        <p>⚠️ ページの読み込みに失敗しました: ${id}</p>
        <p style="font-size:0.85rem;margin-top:8px;">ローカルサーバー (python3 -m http.server) で起動してください</p>
      </div>`;
    }
  }

  // ── ホームページ時は body 背景を青に切り替え ─────────────
  if (id === 'home') {
    document.body.classList.add('home-active');
  } else {
    document.body.classList.remove('home-active');
  }

  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── ページ上部ナビゲーションバー ─────────────────────────
function _buildPageNavBar(pageId) {
  // ホーム画面では表示しない
  if (pageId === 'home') return '';

  const hasPrev = pageHistory.length > 0;
  const prevLabel = hasPrev ? (PAGE_LABELS[pageHistory[pageHistory.length - 1]] || '前のページ') : '';

  return `
    <div class="page-nav-bar" style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:16px; padding:8px 12px; background:var(--bg); border-radius:10px; border:1px solid var(--border); flex-wrap:wrap;">
      <div style="display:flex; gap:6px; align-items:center;">
        ${hasPrev ? `
          <button onclick="goBack()" class="page-nav-btn" title="${prevLabel}">
            ← 戻る
          </button>
        ` : ''}
        <button onclick="goHome()" class="page-nav-btn page-nav-home" title="ホーム画面へ">
          🏠 ホーム
        </button>
      </div>
      <button onclick="logout()" class="page-nav-btn page-nav-logout" title="ログアウト">
        🚪 ログアウト
      </button>
    </div>
  `;
}

// ── 戻るボタン ──────────────────────────────────────────
let _isNavigatingBack = false;

function goBack() {
  if (pageHistory.length === 0) {
    goHome();
    return;
  }
  const prevPage = pageHistory.pop();
  _isNavigatingBack = true;
  currentPage = prevPage;
  showPage(prevPage);
}

function goHome() {
  showPage('home');
}

// ══════════════════════════════════════════════════════════
// DATA PERSISTENCE — sessions & weeklies
// ← localStorage fallback when not logged in
// ═══════════════════════════════════════════════════════════

// ── training_sessions ───────────────────────────────────

async function fetchSessions() {
  const uid = getActiveUserId();
  if (sbFep && uid) {
    const { data, error } = await sbFep
      .from('training_sessions')
      .select('*')
      .eq('user_id', uid)
      .order('saved_at', { ascending: false });
    if (error) { console.error('fetchSessions:', error); return []; }
    // snake_case → camelCase
    return (data || []).map(r => ({
      id:         r.id,
      sheetId:    r.sheet_id,
      role:       r.role,
      grade:      r.grade,
      playerName: r.player_name,
      date:       r.session_date,
      theme:      r.theme,
      scores:     r.scores     || [],
      total:      r.total_score,
      maxScore:   r.max_score,
      notes:      r.notes      || {},
      savedAt:    r.saved_at,
    }));
  }
  // ローカル fallback
  const raw = localStorage.getItem('fep_sessions');
  return raw ? JSON.parse(raw) : [];
}

async function persistSession(record) {
  const uid = getActiveUserId();
  if (sbFep && uid) {
    const row = {
      user_id:      uid,
      sheet_id:     record.sheetId,
      role:         record.role,
      grade:        record.grade,
      player_name:  record.playerName,
      session_date: record.date,
      theme:        record.theme,
      scores:       record.scores,
      total_score:  record.total,
      max_score:    record.maxScore,
      notes:        record.notes || {},
    };
    const { error } = await sbFep.from('training_sessions').insert(row);
    if (error) console.error('persistSession:', error);
    return;
  }
  // ローカル fallback
  const sessions = await fetchSessions();
  sessions.unshift(record);
  localStorage.setItem('fep_sessions', JSON.stringify(sessions));
}

async function removeSession(id) {
  const uid = getActiveUserId();
  if (sbFep && uid) {
    const { error } = await sbFep
      .from('training_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);
    if (error) console.error('removeSession:', error);
    return;
  }
  const sessions = await fetchSessions();
  localStorage.setItem('fep_sessions', JSON.stringify(sessions.filter(s => s.id !== id)));
}

// ── セッションフロー用 Supabase 保存（FEP Soccer Training）───

// ① MTG後チェック: sessions テーブルにレコード作成
async function createFlowSession(preCheck) {
  const uid = getActiveUserId();
  if (!sbFep || !uid) return null;
  const row = {
    user_id:         uid,
    session_date:    new Date().toISOString().slice(0, 10),
    status:          'completed',
    current_step:    0,
    pre_condition:   preCheck.condition,
    pre_expectation: preCheck.expectation,
    pre_epi_q1:      preCheck.epiQ1,
    pre_epi_q2:      preCheck.epiQ2,
    pre_pra_q3:      preCheck.praQ3,
    pre_pra_q4:      preCheck.praQ4,
  };
  const { data, error } = await sbFep.from('sessions').insert(row).select('id').single();
  if (error) { console.error('createFlowSession:', error); return null; }
  return data?.id || null;
}

// ② 練習後チェック: sessions テーブルに VFE + F' データを保存
async function persistRecord(recordData) {
  const uid = getActiveUserId();
  if (!sbFep || !uid) return null;
  const row = {
    user_id:           uid,
    session_date:      new Date().toISOString().slice(0, 10),
    status:            'completed',
    current_step:      1,
    score_vfe:         recordData.vfe_display,
    score_f_prime:     recordData.f_prime,
    score_sigma_mod:   recordData.sigma_mod,
    score_lambda_mod:  recordData.lambda_mod,
  };
  const { data, error } = await sbFep.from('sessions').insert(row).select('id').single();
  if (error) { console.error('persistRecord:', error); return null; }
  return data?.id || null;
}

// EFE月次記録: sessions テーブルに EFE データを保存
async function persistEfeMonthly(efeData) {
  const uid = getActiveUserId();
  if (!sbFep || !uid) return null;
  const row = {
    user_id:       uid,
    session_date:  new Date().toISOString().slice(0, 10),
    status:        'completed',
    current_step:  0,
    pre_epi_q1:    efeData.q1,
    pre_epi_q2:    efeData.q2,
    pre_pra_q3:    efeData.q3,
    pre_pra_q4:    efeData.q4,
    score_efe:     efeData.efe_display,
    score_alpha:   efeData.epi_score,
    score_beta:    efeData.pra_score,
  };
  const { error } = await sbFep.from('sessions').insert(row);
  if (error) { console.error('persistEfeMonthly:', error); return false; }
  return true;
}

// コーチ記録: session_menus テーブルに保存
async function persistCoachRecord(record) {
  const uid = getActiveUserId();
  if (!sbFep || !uid) return false;
  // まず親セッションを作成
  const sessionRow = {
    user_id:      uid,
    session_date: new Date().toISOString().slice(0, 10),
    status:       'completed',
    current_step: 1,
  };
  const { data: sessionData, error: sessionErr } = await sbFep.from('sessions').insert(sessionRow).select('id').single();
  if (sessionErr) { console.error('persistCoachRecord session:', sessionErr); return false; }
  const sessionId = sessionData?.id;
  if (!sessionId) return false;

  const menuRow = {
    session_id:    sessionId,
    menu_name:     record.menuName,
    purpose:       record.purpose,
    duration_min:  record.duration,
    layer:         record.layer,
    channels:      record.channels,
    constraints:   record.constraints,
    coaching_type: record.coachingType,
    feedback_freq: record.feedbackFreq,
  };
  const { error: menuErr } = await sbFep.from('session_menus').insert(menuRow);
  if (menuErr) { console.error('persistCoachRecord menu:', menuErr); return false; }
  return true;
}

// ── Inflexion Index への VFE書き込み ─────────────────────
// assessments テーブル（mode='athlete', type='vfe'）へ選手VFEを保存

async function persistInflexionPlayerVfe(payload) {
  // payload: { pid, facility, input_date, complexity, accuracy, weight_value,
  //            F_display, dr_score, uh_score, fh_score }
  if (!sb) return;
  const row = {
    pid:          payload.pid,
    facility:     payload.facility || 'soccer_training',
    mode:         'athlete',
    type:         'vfe',
    input_date:   payload.input_date,
    complexity:   payload.complexity,
    accuracy:     payload.accuracy,
    weight_value: payload.weight_value,
    f_display:    payload.F_display,   // DB カラム名は小文字
    dr_score:     payload.dr_score,
    uh_score:     payload.uh_score,
    fh_score:     payload.fh_score,
  };
  const { error } = await sb.from('assessments').insert(row);
  if (error) console.warn('[II] assessments insert:', error.message);
}

// estimation_uncertainty テーブルへコーチ観察値（σ/λ/τ）を保存
async function persistInflexionCoachEval(payload) {
  // payload: { pid, facility, input_date, sigma_raw, lambda_raw, tau_raw, evaluator_id }
  if (!sb) return;
  const row = {
    pid:            payload.pid,
    facility:       payload.facility || 'soccer_training',
    mode:           'athlete',
    evaluator_id:   payload.evaluator_id || '',
    sigma_raw:      payload.sigma_raw,
    lambda_raw:     payload.lambda_raw,
    tau_raw:        payload.tau_raw,
    is_group_setting: false,
    updated_at:     new Date().toISOString(),
  };
  const { error } = await sb.from('estimation_uncertainty').insert(row);
  if (error) console.warn('[II] estimation_uncertainty insert:', error.message);
}

// ── training_weeklies ────────────────────────────────────

async function fetchWeeklies() {
  const uid = getActiveUserId();
  if (sbFep && uid) {
    const { data, error } = await sbFep
      .from('training_weeklies')
      .select('*')
      .eq('user_id', uid)
      .order('saved_at', { ascending: false });
    if (error) { console.error('fetchWeeklies:', error); return []; }
    return (data || []).map(r => ({
      id:        r.id,
      name:      r.name,
      week:      r.week,
      grade:     r.grade,
      theme:     r.theme,
      axes:      r.axes      || {},
      growth:    r.growth,
      challenge: r.challenge,
      nextTheme: r.next_theme,
      savedAt:   r.saved_at,
    }));
  }
  const raw = localStorage.getItem('fep_weeklies');
  return raw ? JSON.parse(raw) : [];
}

async function persistWeekly(record) {
  const uid = getActiveUserId();
  if (sbFep && uid) {
    const row = {
      user_id:    uid,
      name:       record.name,
      week:       record.week,
      grade:      record.grade,
      theme:      record.theme,
      axes:       record.axes || {},
      growth:     record.growth,
      challenge:  record.challenge,
      next_theme: record.nextTheme,
    };
    const { error } = await sbFep.from('training_weeklies').insert(row);
    if (error) console.error('persistWeekly:', error);
    return;
  }
  const weeklies = await fetchWeeklies();
  weeklies.unshift(record);
  localStorage.setItem('fep_weeklies', JSON.stringify(weeklies));
}

async function removeWeekly(id) {
  const uid = getActiveUserId();
  if (sbFep && uid) {
    const { error } = await sbFep
      .from('training_weeklies')
      .delete()
      .eq('id', id)
      .eq('user_id', uid);
    if (error) console.error('removeWeekly:', error);
    return;
  }
  const weeklies = await fetchWeeklies();
  localStorage.setItem('fep_weeklies', JSON.stringify(weeklies.filter(w => w.id !== id)));
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  // ログイン確認後に showApp() + showPage() を呼ぶため、ここでは initSupabase のみ
  initSupabase();
});
