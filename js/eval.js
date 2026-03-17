function switchEvalTab(tabId, btn) {
    document.querySelectorAll('.eval-sub-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.eval-sub-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('eval-sub-' + tabId).classList.add('active');
    if (btn) btn.classList.add('active');
    if (tabId === 'history') loadHistory();
    if (tabId === 'weekly') loadWeeklyHistory();
  }

function updateEvalSheet() {
    const role = document.getElementById('role-select').value;
    const grade = document.getElementById('grade-select').value;
    document.querySelectorAll('.eval-sheet').forEach(s => s.style.display = 'none');
    const target = document.getElementById('sheet-' + role + '-' + grade);
    if (target) target.style.display = 'block';
  }

function calcScore(prefix, numQ, maxPerQ) {
    let total = 0, answered = 0;
    for (let i = 1; i <= numQ; i++) {
      const radios = document.querySelectorAll(`input[name="${prefix}${i}"]`);
      radios.forEach(r => {
        if (r.checked) { total += parseInt(r.value); answered++; }
      });
    }
    const maxScore = numQ * maxPerQ;
    const ratio = total / maxScore;
    let comment = '', color = '#047857';
    if (ratio >= 0.84)      { comment = '非常に良い適応 — 高いFEP的学習サイクルが回っています ✨'; }
    else if (ratio >= 0.64) { comment = '概ね良い — 継続して取り組みましょう 👍'; }
    else if (ratio >= 0.44) { comment = '一部で修正が必要 — 特定の軸に注目してみましょう 🔍'; color = '#b45309'; }
    else if (ratio >= 0.24) { comment = '基礎から再確認 — 負荷を少し下げてみましょう ⚙️'; color = '#b45309'; }
    else                    { comment = '未回答の項目があるか、負荷設定の見直しが必要です'; color = '#dc2626'; }

    const scoreEl = document.getElementById('score-' + prefix);
    if (!scoreEl) return;
    scoreEl.innerHTML = `
      <div class="score-result">
        <h4>スコア結果</h4>
        <div class="score-number">${total} <span>/ ${maxScore}点</span></div>
        ${answered < numQ ? `<div class="score-warning">⚠️ ${numQ - answered}項目が未回答です</div>` : '<div style="font-size:0.84rem;color:#6b7280;margin-top:4px">✅ 全項目回答済み</div>'}
        <div class="score-comment" style="color:${color}">${comment}</div>
      </div>`;
    return { total, maxScore, answered };
  }

async function saveSession(sheetId, prefix, numQ, maxPerQ) {
    let total = 0, scores = [];
    for (let i = 1; i <= numQ; i++) {
      const checked = document.querySelector(`input[name="${prefix}${i}"]:checked`);
      const v = checked ? parseInt(checked.value) : 0;
      scores.push(v); total += v;
    }
    const maxScore = numQ * maxPerQ;
    const meta = readSheetMeta(sheetId);
    const parts = sheetId.split('-');
    const record = {
      id: Date.now().toString(),
      sheetId, role: parts[0], grade: parts.slice(1).join('-'),
      playerName: meta.playerName || '（未入力）',
      date: meta.date || new Date().toISOString().slice(0,10),
      theme: meta.theme || '（未入力）',
      scores, total, maxScore,
      notes: meta.notes,
      savedAt: new Date().toISOString()
    };

    await persistSession(record);

    const pct = maxScore > 0 ? Math.round(total / maxScore * 100) : 0;
    const mode = (sb && currentUser) ? '☁ クラウドに保存' : '💾 ローカルに保存';
    const toast = document.getElementById('toast-' + sheetId);
    if (toast) {
      toast.innerHTML = `✅ ${mode}しました！　スコア：${total}/${maxScore}点（${pct}%）　記録日：${record.date}`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }
  }

async function loadHistory() {
    const container = document.getElementById('history-list-container');
    if (!container) return;
    container.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted)">読み込み中…</div>';

    const sessions = await fetchSessions();
    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="history-empty">
          <div class="big-icon">📋</div>
          <p>まだセッション記録がありません。</p>
          <p style="margin-top:8px;font-size:0.84rem">評価シートに記入後「💾 記録を保存」ボタンを押すと、ここに記録が表示されます。</p>
          ${!(sb && currentUser) ? '<p style="margin-top:8px;font-size:0.82rem;color:#d97706">⚠ ログインするとクラウドに保存され、複数デバイスで閲覧できます。</p>' : ''}
        </div>`;
      return;
    }
    const roleLabel  = { player:'選手', coach:'指導者' };
    const gradeLabel = { elementary:'小学生', junior:'中高生', pro:'大学生・社会人' };
    container.innerHTML = `<div class="history-list">${sessions.map(s => {
      const pct = s.maxScore > 0 ? Math.round(s.total / s.maxScore * 100) : 0;
      const notesHtml = Object.entries(s.notes||{}).map(([k,v]) =>
        `<div style="margin-bottom:8px"><span class="lbl">${k}</span><div class="hist-notes">${v}</div></div>`).join('');
      return `
      <div class="hist-card ${s.role==='coach'?'coach':''}" id="hcard-${s.id}">
        <div class="hist-card-header">
          <div>
            <div class="hist-card-title">${s.playerName} — ${s.theme}</div>
            <div class="hist-card-meta">${roleLabel[s.role]||s.role} ／ ${gradeLabel[s.grade]||s.grade} ／ ${s.date}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
            <div class="hist-card-score">${s.total}/${s.maxScore}点（${pct}%）</div>
            <div class="hist-card-actions">
              <button class="hist-btn" onclick="toggleHistDetail('${s.id}')">詳細</button>
              <button class="hist-btn del" onclick="deleteSession('${s.id}')">削除</button>
            </div>
          </div>
        </div>
        <div id="hdetail-${s.id}" class="hist-detail">
          <div class="hist-detail-grid">
            <div class="hist-detail-item"><span class="lbl">保存日時</span>${new Date(s.savedAt).toLocaleString('ja-JP')}</div>
            <div class="hist-detail-item"><span class="lbl">スコア内訳</span>${s.scores.map((v,i)=>`Q${i+1}:${v}`).join(' / ')}</div>
          </div>
          ${notesHtml}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

async function saveWeekly() {
    const record = {
      id:        Date.now().toString(),
      name:      document.getElementById('w-name').value  || '（未入力）',
      week:      document.getElementById('w-week').value  || '（期間未入力）',
      grade:     document.getElementById('w-grade').value,
      theme:     document.getElementById('w-theme').value || '',
      axes: {
        jikoYosoku:   parseInt(document.getElementById('w-jikoYosoku').value),
        gosaNinshiki: parseInt(document.getElementById('w-gosaNinshiki').value),
        shuseiryoku:  parseInt(document.getElementById('w-shuseiryoku').value),
        tekioryoku:   parseInt(document.getElementById('w-tekioryoku').value),
        kyochosei:    parseInt(document.getElementById('w-kyochosei').value),
      },
      growth:    document.getElementById('w-growth').value    || '',
      challenge: document.getElementById('w-challenge').value || '',
      nextTheme: document.getElementById('w-nextTheme').value || '',
      savedAt:   new Date().toISOString()
    };

    await persistWeekly(record);

    const mode = (sb && currentUser) ? '☁ クラウドに保存' : '💾 ローカルに保存';
    const toast = document.getElementById('toast-weekly');
    if (toast) {
      toast.innerHTML = `✅ 週間まとめを${mode}しました！ （${record.name}・${record.week}）`;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    }
    loadWeeklyHistory();
  }

async function loadWeeklyHistory() {
    const container = document.getElementById('weekly-history-list');
    if (!container) return;
    const weeklies = await fetchWeeklies();
    if (weeklies.length === 0) {
      container.innerHTML = `<div class="history-empty" style="padding:30px"><div class="big-icon">📊</div><p>まだ週間まとめがありません。</p></div>`;
      return;
    }
    const axisLabels = { jikoYosoku:'自己予測', gosaNinshiki:'誤差認識', shuseiryoku:'修正力', tekioryoku:'適応力', kyochosei:'協調・共有' };
    const gradeLabel = { elementary:'小学生', junior:'中高生', pro:'大学生・社会人' };
    container.innerHTML = `<div class="weekly-history-list">${weeklies.map(w => {
      const axisTotal = Object.values(w.axes).reduce((a,b)=>a+b,0);
      const axisMax = Object.keys(w.axes).length * 5;
      const pct = Math.round(axisTotal / axisMax * 100);
      const barHtml = Object.entries(w.axes).map(([k,v]) =>
        `<div class="weekly-axis-row">
          <span class="weekly-axis-label">${axisLabels[k]||k}</span>
          <div class="weekly-axis-bar-wrap"><div class="weekly-axis-bar-fill" style="width:${v/5*100}%"></div></div>
          <span class="weekly-axis-val">${v}/5</span>
        </div>`).join('');
      return `
      <div class="weekly-hist-card" id="wcard-${w.id}">
        <div class="weekly-hist-header">
          <div>
            <div class="weekly-hist-title">${w.name} ／ ${w.week}</div>
            <div class="weekly-hist-meta">${gradeLabel[w.grade]||w.grade}${w.theme?' ／ テーマ：'+w.theme:''} ／ 総合 ${pct}%</div>
          </div>
          <div class="hist-card-actions">
            <button class="hist-btn" onclick="toggleWeeklyDetail('${w.id}')">詳細</button>
            <button class="hist-btn del" onclick="deleteWeekly('${w.id}')">削除</button>
          </div>
        </div>
        <div id="wdetail-${w.id}" class="weekly-detail">
          <div class="weekly-axis-bars">${barHtml}</div>
          ${w.growth?`<div style="margin-top:10px"><span style="font-size:0.77rem;font-weight:700;color:var(--text-muted)">成長点</span><div class="hist-notes" style="margin-top:4px">${w.growth}</div></div>`:''}
          ${w.challenge?`<div style="margin-top:8px"><span style="font-size:0.77rem;font-weight:700;color:var(--text-muted)">課題</span><div class="hist-notes" style="margin-top:4px">${w.challenge}</div></div>`:''}
          ${w.nextTheme?`<div style="margin-top:8px"><span style="font-size:0.77rem;font-weight:700;color:var(--text-muted)">来週のテーマ</span><div class="hist-notes" style="margin-top:4px">${w.nextTheme}</div></div>`:''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }

function toggleHistDetail(id) { document.getElementById('hdetail-'+id)?.classList.toggle('open'); }

async function deleteSession(id) {
  if (!confirm('このセッション記録を削除しますか？')) return;
  await removeSession(id);
  loadHistory();
}

function toggleWeeklyDetail(id) { document.getElementById('wdetail-'+id)?.classList.toggle('open'); }

async function deleteWeekly(id) {
    if (!confirm('この週間まとめを削除しますか？')) return;
    await removeWeekly(id);
    loadWeeklyHistory();
  }


let playerFilterValue = '';

function filterByPlayer() {
  const filterInput = document.getElementById('player-filter-input');
  if (!filterInput) return;

  playerFilterValue = filterInput.value.toLowerCase().trim();

  const rows = document.querySelectorAll('#history-table tbody tr');
  rows.forEach(row => {
    const playerCell = row.querySelector('td:nth-child(3)');
    if (!playerCell) return;

    const playerName = playerCell.textContent.toLowerCase();
    const matches = playerName.includes(playerFilterValue) || playerFilterValue === '';
    row.style.display = matches ? '' : 'none';
  });
}

function clearPlayerFilter() {
  playerFilterValue = '';
  const filterInput = document.getElementById('player-filter-input');
  if (filterInput) filterInput.value = '';

  const rows = document.querySelectorAll('#history-table tbody tr');
  rows.forEach(row => row.style.display = '');
}

function initEvalPage() {
  updateEvalSheet();
  const activeTab = document.querySelector('.eval-sub-btn.active');
  if (activeTab) {
    const tab = activeTab.textContent.trim();
    if (tab.includes('履歴')) {
      loadHistory();
      loadWeeklyHistory();
    }
  }
}
