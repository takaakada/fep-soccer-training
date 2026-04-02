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
          showApp();
          renderAuthBadge(currentUser);
          const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
          if (homeBtn) showPage('home', homeBtn);
        } else {
          showLoginScreen();
        }
      });

      // 以降の状態変化を監視
      sb.auth.onAuthStateChange(async (event, session) => {
        currentUser = session ? session.user : null;
        if (event === 'SIGNED_IN' && currentUser) {
          showApp();
          renderAuthBadge(currentUser);
          const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
          if (homeBtn) showPage('home', homeBtn);
        } else if (event === 'SIGNED_OUT') {
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

    if (user) {
      const name   = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email  = user.email || '';
      const avatar = user.user_metadata?.avatar_url;
      const initial = name.charAt(0).toUpperCase();

      // user-menu の表示名・メール更新
      const dispName = document.getElementById('menu-display-name');
      const dispEmail = document.getElementById('menu-email');
      if (dispName)  dispName.textContent  = name;
      if (dispEmail) dispEmail.textContent = email;

      // モバイルトップバーのバッジ
      if (area) {
        area.innerHTML = `
          <div class="auth-badge" onclick="toggleUserMenu()">
            <div class="auth-avatar">
              ${avatar ? `<img src="${avatar}" alt="avatar">` : initial}
            </div>
            <span>${name}</span>
          </div>`;
      }

      // サイドバーのユーザー情報
      if (sidebarArea) {
        sidebarArea.innerHTML = `
          <div class="sidebar-user-info" onclick="toggleUserMenu()">
            <div class="sidebar-user-avatar">
              ${avatar ? `<img src="${avatar}" alt="avatar">` : initial}
            </div>
            <div class="sidebar-user-text">
              <div class="sidebar-user-name">${name}</div>
              <div class="sidebar-user-email">${email}</div>
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
    if (sb) await sb.auth.signOut();
    currentUser = null;
    renderAuthBadge(null);
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
  // Update sidebar active state
  document.querySelectorAll('.sidebar-nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

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
    const res = await fetch(`pages/${id}.html`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    containerEl.innerHTML = html;

    // innerHTML で挿入された <script> は自動実行されないため、
    // 手動で再生成して実行する
    containerEl.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    // 既存ページの初期化（スクリプトが外部ファイルの場合）
    if (id === 'eval' && typeof initEvalPage === 'function') {
      initEvalPage();
    }
    if (id === 'menu' && typeof initMenuPage === 'function') {
      initMenuPage();
    }
    if (id === 'position' && typeof initPositionPage === 'function') {
      initPositionPage();
    }
  } catch(e) {
    console.error('Page load error:', e);
    if (containerEl) {
      containerEl.innerHTML = `<div style="padding:40px;text-align:center;color:#666;">
        <p>⚠️ ページの読み込みに失敗しました: ${id}</p>
        <p style="font-size:0.85rem;margin-top:8px;">ローカルサーバー (python3 -m http.server) で起動してください</p>
      </div>`;
    }
  }

  closeSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ══════════════════════════════════════════════════════════
// DATA PERSISTENCE — sessions & weeklies
// ← localStorage fallback when not logged in
// ═══════════════════════════════════════════════════════════

// ── training_sessions ───────────────────────────────────

async function fetchSessions() {
  if (sbFep && currentUser) {
    const { data, error } = await sbFep
      .from('training_sessions')
      .select('*')
      .eq('user_id', currentUser.id)
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
  if (sbFep && currentUser) {
    const row = {
      user_id:      currentUser.id,
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
  if (sbFep && currentUser) {
    const { error } = await sbFep
      .from('training_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);
    if (error) console.error('removeSession:', error);
    return;
  }
  const sessions = await fetchSessions();
  localStorage.setItem('fep_sessions', JSON.stringify(sessions.filter(s => s.id !== id)));
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
  if (sb && currentUser) {
    const { data, error } = await sb
      .from('training_weeklies')
      .select('*')
      .eq('user_id', currentUser.id)
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
  if (sb && currentUser) {
    const row = {
      user_id:    currentUser.id,
      name:       record.name,
      week:       record.week,
      grade:      record.grade,
      theme:      record.theme,
      axes:       record.axes || {},
      growth:     record.growth,
      challenge:  record.challenge,
      next_theme: record.nextTheme,
    };
    const { error } = await sb.from('training_weeklies').insert(row);
    if (error) console.error('persistWeekly:', error);
    return;
  }
  const weeklies = await fetchWeeklies();
  weeklies.unshift(record);
  localStorage.setItem('fep_weeklies', JSON.stringify(weeklies));
}

async function removeWeekly(id) {
  if (sb && currentUser) {
    const { error } = await sb
      .from('training_weeklies')
      .delete()
      .eq('id', id)
      .eq('user_id', currentUser.id);
    if (error) console.error('removeWeekly:', error);
    return;
  }
  const weeklies = await fetchWeeklies();
  localStorage.setItem('fep_weeklies', JSON.stringify(weeklies.filter(w => w.id !== id)));
}

// ══════════════════════════════════════════════════════════
// SESSION FLOW PERSISTENCE — sessions / session_menus / session_followups
// 新テーブル構造（FEP Soccer Training Supabase）
// ══════════════════════════════════════════════════════════

// ── セッション作成（① 前チェック完了時）──
async function createFlowSession(preCheck) {
  if (!sbFep || !currentUser) {
    // ローカル fallback
    const id = 'local_' + Date.now();
    const session = { id, ...preCheck, status: 'in_progress', current_step: 1 };
    const stored = JSON.parse(localStorage.getItem('fep_flow_sessions') || '[]');
    stored.unshift(session);
    localStorage.setItem('fep_flow_sessions', JSON.stringify(stored));
    return id;
  }

  const row = {
    user_id:          currentUser.id,
    session_date:     new Date().toISOString().split('T')[0],
    status:           'in_progress',
    current_step:     1,
    pre_condition:    preCheck.condition,
    pre_expectation:  preCheck.expectation,
    pre_epi_q1:       preCheck.epiQ1,
    pre_epi_q2:       preCheck.epiQ2,
    pre_pra_q3:       preCheck.praQ3,
    pre_pra_q4:       preCheck.praQ4,
  };
  const { data, error } = await sbFep.from('sessions').insert(row).select('id').single();
  if (error) { console.error('createFlowSession:', error); return null; }
  return data.id;
}

// ── セッションメニュー保存（② セッション記録完了時）──
async function saveFlowMenu(sessionId, record) {
  if (!sbFep || !currentUser) {
    const stored = JSON.parse(localStorage.getItem('fep_flow_menus') || '[]');
    stored.push({ session_id: sessionId, ...record });
    localStorage.setItem('fep_flow_menus', JSON.stringify(stored));
    return;
  }

  const row = {
    session_id:     sessionId,
    menu_name:      record.menuName,
    purpose:        record.purpose,
    duration_min:   record.duration,
    layer:          record.layer,
    channels:       record.channels,
    constraints:    record.constraints,
    complexity:     record.complexity,
    accuracy:       record.accuracy,
    weight_value:   record.weightValue,
    coaching_type:  record.coachingType,
    feedback_freq:  record.feedbackFreq,
    vfe_display:    record.vfeDisplay,
  };
  const { error } = await sbFep.from('session_menus').insert(row);
  if (error) console.error('saveFlowMenu:', error);
}

// ── セッション後評価 + スコア更新（③ 後評価完了時）──
async function updateFlowPostEval(sessionId, postEval, computed) {
  if (!sbFep || !currentUser) {
    const stored = JSON.parse(localStorage.getItem('fep_flow_sessions') || '[]');
    const session = stored.find(s => s.id === sessionId);
    if (session) Object.assign(session, { postEval, computed, current_step: 3 });
    localStorage.setItem('fep_flow_sessions', JSON.stringify(stored));
    return;
  }

  const row = {
    current_step:         3,
    post_ease:            postEval.ease,
    post_difficulty:      postEval.difficulty,
    post_enjoyment:       postEval.enjoyment,
    post_satisfaction:    postEval.satisfaction,
    post_reproducibility: postEval.reproducibility,
    score_vfe:            computed.vfe?.vfe_display,
    score_efe:            computed.efe?.efe_display,
    score_f_prime:        computed.fPrime?.f_prime_effective,
    score_f_prime_display: computed.fPrime?.f_prime_display,
    score_eu:             computed.eu?.eu_display,
    score_sigma_mod:      computed.sigmaModifier,
    score_lambda_mod:     computed.lambdaModifier,
    score_alpha:          computed.efe?.alpha,
    score_beta:           computed.efe?.beta,
  };
  const { error } = await sbFep.from('sessions').update(row).eq('id', sessionId);
  if (error) console.error('updateFlowPostEval:', error);
}

// ── 次回提案保存（④ 次回提案時）──
async function updateFlowRecommendation(sessionId, recommendation) {
  if (!sbFep || !currentUser) return;
  const { error } = await sbFep.from('sessions')
    .update({ current_step: 4, recommendation })
    .eq('id', sessionId);
  if (error) console.error('updateFlowRecommendation:', error);
}

// ── フォローアップ保存 + セッション完了（⑤ フォローアップ完了時）──
async function completeFlowSession(sessionId, followup) {
  if (!sbFep || !currentUser) {
    const stored = JSON.parse(localStorage.getItem('fep_flow_sessions') || '[]');
    const session = stored.find(s => s.id === sessionId);
    if (session) { session.status = 'completed'; session.followup = followup; }
    localStorage.setItem('fep_flow_sessions', JSON.stringify(stored));
    return;
  }

  // フォローアップレコード作成
  const fuRow = {
    session_id:     sessionId,
    reproduced:     followup.reproduced,
    transferable:   followup.transferable,
    want_repeat:    followup.wantRepeat,
    anxiety_change: followup.anxietyChange,
    pain_change:    followup.painChange,
    notes:          followup.notes,
  };
  const { error: fuErr } = await sbFep.from('session_followups').insert(fuRow);
  if (fuErr) console.error('completeFlowSession (followup):', fuErr);

  // セッションステータス更新
  const { error: sErr } = await sbFep.from('sessions')
    .update({ status: 'completed', current_step: 5, completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (sErr) console.error('completeFlowSession (session):', sErr);
}

// ── セッション履歴取得 ──
async function fetchFlowSessions(limit = 20) {
  if (!sbFep || !currentUser) {
    const stored = JSON.parse(localStorage.getItem('fep_flow_sessions') || '[]');
    return stored.slice(0, limit);
  }

  const { data, error } = await sbFep
    .from('sessions')
    .select('*, session_menus(*), session_followups(*)')
    .eq('user_id', currentUser.id)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('fetchFlowSessions:', error); return []; }
  return data || [];
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  // ログイン確認後に showApp() + showPage() を呼ぶため、ここでは initSupabase のみ
  initSupabase();
});
