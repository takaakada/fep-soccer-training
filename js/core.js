// ══════════════════════════════════════════════════════════
// SUPABASE CONFIG & AUTH
// ══════════════════════════════════════════════════════════
// Inflexion Index と同じ Supabase プロジェクトを共有
// → 同じ ID/PW で両アプリにログイン可能
const SUPABASE_URL  = 'https://wmmihubjabdvicxbceip.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbWlodWJqYWJkdmljeGJjZWlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ4NTY4ODEsImV4cCI6MjA4MDQzMjg4MX0.a0c-_RNfrWE9o3itMcxEBTy_uZPowv3bVLLFmz9XHfU';
const REDIRECT_URL  = window.location.origin + window.location.pathname;

let sb = null;
let currentUser = null;

function initSupabase() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
      console.warn('[FEP] Supabase 未設定 — ローカルモードで動作します');
      renderAuthBadge(null);
      return;
    }
    try {
      sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
      // OAuth コールバック処理
      sb.auth.onAuthStateChange(async (event, session) => {
        currentUser = session ? session.user : null;
        renderAuthBadge(currentUser);
        if (event === 'SIGNED_IN') {
          closeLoginModal();
          document.getElementById('login-modal').classList.remove('open');
        }
      });
    } catch(e) {
      console.error('[FEP] Supabase 初期化エラー:', e);
      renderAuthBadge(null);
    }
  }

function renderAuthBadge(user) {
    const area = document.getElementById('auth-area');
    if (!area) return;
    if (user) {
      const name  = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      const email = user.email || '';
      const avatar = user.user_metadata?.avatar_url;
      const initial = name.charAt(0).toUpperCase();
      document.getElementById('menu-display-name').textContent = name;
      document.getElementById('menu-email').textContent = email;
      area.innerHTML = `
        <div class="auth-badge" onclick="toggleUserMenu()">
          <div class="auth-avatar">
            ${avatar ? `<img src="${avatar}" alt="avatar">` : initial}
          </div>
          <span>${name}</span>
          <span class="auth-sync-badge">☁ 同期中</span>
        </div>`;
    } else {
      area.innerHTML = `
        <div class="auth-badge" onclick="openLoginModal()">
          <div class="auth-avatar">👤</div>
          <span>ログイン</span>
          <span class="auth-sync-badge offline">ローカル</span>
        </div>`;
    }
  }

function openLoginModal()  { document.getElementById('login-modal').classList.add('open'); }

function closeLoginModal() { document.getElementById('login-modal').classList.remove('open'); }

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
  if (sb && currentUser) {
    const { data, error } = await sb
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
  if (sb && currentUser) {
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
    const { error } = await sb.from('training_sessions').insert(row);
    if (error) console.error('persistSession:', error);
    return;
  }
  // ローカル fallback
  const sessions = await fetchSessions();
  sessions.unshift(record);
  localStorage.setItem('fep_sessions', JSON.stringify(sessions));
}

async function removeSession(id) {
  if (sb && currentUser) {
    const { error } = await sb
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

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
  const homeBtn = document.querySelector('.sidebar-nav-btn[data-page="home"]');
  if (homeBtn) showPage('home', homeBtn);
});
