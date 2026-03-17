// ============================================================
//  課題チャレンジ — Homework Challenge App
//  編集方法: このファイルを VS Code で開いて編集してください
//  How to run: VS Code の Live Server 拡張で index.html を開く
// ============================================================

const { useState, useEffect } = React;

// ─────────────────────────────────────────────────────────────
//  🎁 ごほうびのデフォルト設定 (Default Prize Data)
//  ここを変えると起動時のデフォルトが変わります
// ─────────────────────────────────────────────────────────────
const DEFAULT_PRIZES = [
  { rank: 1, emoji: "🏆", nameJP: "特別ご褒美！",  color: "#FFD060", textColor: "#7A4A00" },
  { rank: 2, emoji: "🎂", nameJP: "ケーキ！",       color: "#FF9EB5", textColor: "#7A0030" },
  { rank: 3, emoji: "🎮", nameJP: "ゲーム30分！",   color: "#9EB5FF", textColor: "#1A2A7A" },
  { rank: 4, emoji: "⭐", nameJP: "シール5まい！",  color: "#A8FFD8", textColor: "#005A30" },
  { rank: 5, emoji: "🍭", nameJP: "おかし1こ！",    color: "#E0B3FF", textColor: "#4A0070" },
];

// ─────────────────────────────────────────────────────────────
//  📊 パフォーマンスレベル設定 (Performance Levels)
//  tickets: くじの枚数 / 当たり確率は下の determineWins() で管理
// ─────────────────────────────────────────────────────────────
const PERF_LEVELS = [
  null,
  { emoji: "🏆", labelJP: "かんぺき！",   labelEN: "Perfect!",    tickets: 5, gradient: "linear-gradient(135deg,#FFD700,#FFA500)" },
  { emoji: "🥈", labelJP: "すごい！",     labelEN: "Great!",      tickets: 4, gradient: "linear-gradient(135deg,#D8D8D8,#9A9A9A)" },
  { emoji: "🥉", labelJP: "よくできた！", labelEN: "Well done!",  tickets: 3, gradient: "linear-gradient(135deg,#E09060,#A05020)" },
  { emoji: "😊", labelJP: "できた！",     labelEN: "Done!",       tickets: 2, gradient: "linear-gradient(135deg,#70C0FF,#3080DD)" },
  { emoji: "👍", labelJP: "おわった！",   labelEN: "Finished!",   tickets: 1, gradient: "linear-gradient(135deg,#FF9070,#DD5030)" },
];

// あたり数 → 順位 (0 wins = null, 1→5位, 2→4位, …, 5→1位)
const winsToRank = w => (w === 0 ? null : 6 - w);

// ─────────────────────────────────────────────────────────────
//  Utilities
// ─────────────────────────────────────────────────────────────

// 当たり数をカスタム確率分布で決定する (Custom win-count distribution)
// レベル1 (5枚): 5→3%, 4→7%, 3→40%, 2→20%, 1→27%, 0→3%
// レベル2 (4枚): 4→5%, 3→30%, 2→35%, 1→25%, 0→5%
// レベル3 (3枚): 3→10%, 2→40%, 1→45%, 0→5%
// レベル4 (2枚): 2→20%, 1→60%, 0→20%
// レベル5 (1枚): 1→40%, 0→60%
function determineWins(level) {
  const r = Math.random();
  switch (level) {
    case 1: // 5 tickets
      if (r < 0.03) return 0;
      if (r < 0.30) return 1;
      if (r < 0.50) return 2;
      if (r < 0.90) return 3;
      if (r < 0.97) return 4;
      return 5;
    case 2: // 4 tickets
      if (r < 0.05) return 0;
      if (r < 0.30) return 1;
      if (r < 0.65) return 2;
      if (r < 0.95) return 3;
      return 4;
    case 3: // 3 tickets
      if (r < 0.05) return 0;
      if (r < 0.50) return 1;
      if (r < 0.90) return 2;
      return 3;
    case 4: // 2 tickets
      if (r < 0.20) return 0;
      if (r < 0.80) return 1;
      return 2;
    case 5: // 1 ticket
      return r < 0.60 ? 0 : 1;
    default:
      return 0;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─────────────────────────────────────────────────────────────
//  CSS (アニメーション & スタイル)
// ─────────────────────────────────────────────────────────────
const CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Hiragino Maru Gothic Pro', 'Rounded Mplus 1c', system-ui, sans-serif;
  }

  /* ── Animations ── */
  @keyframes confettiFall {
    0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
    100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
  }
  @keyframes popIn {
    0%  { transform: scale(0) rotate(-10deg); opacity: 0; }
    70% { transform: scale(1.15); }
    100%{ transform: scale(1); opacity: 1; }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-12px); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50%      { transform: scale(1.08); }
  }
  @keyframes wiggle {
    0%, 100% { transform: rotate(0deg); }
    25%      { transform: rotate(-8deg); }
    75%      { transform: rotate(8deg); }
  }
  @keyframes flipReveal {
    0%  { transform: rotateY(0deg); }
    50% { transform: rotateY(90deg); }
    100%{ transform: rotateY(0deg); }
  }
  @keyframes starSpin {
    0%  { transform: rotate(0deg)   scale(0.5); opacity: 0; }
    50% { transform: rotate(180deg) scale(1.3); opacity: 1; }
    100%{ transform: rotate(360deg) scale(1);   opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(24px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes prizeReveal {
    0%  { transform: scale(0) rotate(-15deg); opacity: 0; }
    60% { transform: scale(1.3) rotate(4deg); }
    100%{ transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes rankGlow {
    0%, 100% { box-shadow: 0 0 16px 4px rgba(255,200,0,.5), 0 8px 24px rgba(0,0,0,.15); }
    50%      { box-shadow: 0 0 36px 10px rgba(255,200,0,.9), 0 8px 24px rgba(0,0,0,.15); }
  }

  /* ── Components ── */
  .btn {
    border: none;
    cursor: pointer;
    border-radius: 18px;
    font-weight: 900;
    font-family: inherit;
    transition: all .15s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:hover  { transform: translateY(-3px) scale(1.04); filter: brightness(1.06); }
  .btn:active { transform: translateY(1px) scale(0.97);  filter: brightness(0.94); }

  .card {
    background: rgba(255,255,255,.97);
    border-radius: 28px;
    box-shadow: 0 12px 40px rgba(0,0,0,.18);
  }
  .ticket-card {
    border-radius: 18px;
    transition: transform .2s;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  .ticket-card:not(.revealed):hover { transform: translateY(-6px) scale(1.06); }

  input[type=range] { accent-color: #7C3AED; width: 100%; cursor: pointer; }
  input[type=text] {
    border: 2.5px solid #E5E7EB;
    border-radius: 12px;
    padding: 10px 14px;
    font-size: 16px;
    font-family: inherit;
    outline: none;
    width: 100%;
    transition: border-color .2s;
  }
  input[type=text]:focus { border-color: #7C3AED; }
`;

// 背景スタイル (Background)
const BG = {
  minHeight: "100vh",
  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

// ─────────────────────────────────────────────────────────────
//  🎊 Confetti Component
// ─────────────────────────────────────────────────────────────
function Confetti() {
  const colors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF6BFF", "#FF9E3D", "#00D4FF"];
  const items = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    dur: `${2 + Math.random() * 2}s`,
    size: `${8 + Math.random() * 10}px`,
    circle: Math.random() > 0.5,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 300, overflow: "hidden" }}>
      {items.map(p => (
        <div key={p.id} style={{
          position: "absolute", top: "-20px", left: p.left,
          width: p.size, height: p.size, backgroundColor: p.color,
          borderRadius: p.circle ? "50%" : "3px",
          animation: `confettiFall ${p.dur} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Section ヘルパー (Section Header Helper)
// ─────────────────────────────────────────────────────────────
function Section({ icon, titleJP, titleEN, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: "block", fontWeight: 900, color: "#5B21B6", marginBottom: 8, fontSize: 16 }}>
        {icon} {titleJP}
        {titleEN && (
          <span style={{ fontSize: 12, color: "#AAA", fontWeight: 400, marginLeft: 6 }}>
            {titleEN}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  🚀 Main App
// ─────────────────────────────────────────────────────────────
function App() {
  // フェーズ: settings → task → prizeLevel → lottery → result
  const [phase, setPhase]                   = useState("settings");

  // セッティング (Settings)
  const [timeLimit,      setTimeLimit]      = useState(15);   // 分 / minutes
  const [extraIncrement, setExtraIncrement] = useState(5);    // 分 / minutes per +time
  const [prizes,         setPrizes]         = useState(DEFAULT_PRIZES);
  const [editPrizes,     setEditPrizes]     = useState(DEFAULT_PRIZES);

  // タスク中 (During task)
  const [timeLeft,   setTimeLeft]   = useState(null);
  const [running,    setRunning]    = useState(false);
  const [timeUp,     setTimeUp]     = useState(false);
  const [failures,   setFailures]   = useState(0);
  const [extraTimes, setExtraTimes] = useState(0);

  // くじ (Lottery)
  const [perfLevel, setPerfLevel] = useState(null);
  const [tickets,   setTickets]   = useState([]);

  // 結果 (Result)
  const [totalWins,    setTotalWins]    = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  // ── タイマー (Timer) ────────────────────────────────────────
  useEffect(() => {
    if (!running || timeLeft === null || timeLeft <= 0) return;
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { setRunning(false); setTimeUp(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, timeLeft]);

  // ── ハンドラー (Handlers) ───────────────────────────────────
  const startTask = () => {
    setTimeLeft(timeLimit * 60);
    setRunning(true);
    setTimeUp(false);
    setFailures(0);
    setExtraTimes(0);
    setPhase("task");
  };

  const handleExtraTime = () => {
    setExtraTimes(e => e + 1);
    setTimeLeft(t => (t || 0) + extraIncrement * 60);
    setTimeUp(false);
    setRunning(true);
  };

  const handleComplete = () => {
    setRunning(false);
    const level = Math.min(5, failures + extraTimes + 1);
    setPerfLevel(level);
    const { tickets: n } = PERF_LEVELS[level];
    const wins = determineWins(level);
    const raw = Array.from({ length: n }, (_, i) => ({ id: i, win: i < wins, revealed: false }));
    setTickets(shuffle(raw));
    setPhase("prizeLevel");
  };

  const revealTicket = id => {
    setTickets(prev => prev.map(t =>
      t.id === id && !t.revealed ? { ...t, revealed: true } : t
    ));
  };

  const allRevealed = tickets.length > 0 && tickets.every(t => t.revealed);

  const goToResult = () => {
    const wins = tickets.filter(t => t.win).length;
    setTotalWins(wins);
    if (wins > 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
    setPhase("result");
  };

  const reset = () => {
    setPhase("settings");
    setTimeLimit(15);
    setExtraIncrement(5);
    setTimeLeft(null);
    setRunning(false);
    setTimeUp(false);
    setFailures(0);
    setExtraTimes(0);
    setPerfLevel(null);
    setTickets([]);
    setTotalWins(0);
    setShowConfetti(false);
  };

  const fmtTime = s => {
    if (s === null) return "--:--";
    const m   = Math.floor(Math.abs(s) / 60);
    const sec = Math.abs(s) % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const timerPct = timeLeft !== null ? (timeLeft / (timeLimit * 60)) * 100 : 100;
  const isUrgent = timeLeft !== null && timeLeft <= 30 && !timeUp;
  const prizeRank = winsToRank(totalWins);

  // ════════════════════════════════════════════════════════════
  //  SETTINGS SCREEN  (親・コーチ用 / Parent & Coach)
  // ════════════════════════════════════════════════════════════
  if (phase === "settings") return (
    <>
      <div style={{ ...BG, alignItems: "flex-start", overflowY: "auto" }}>
        <div className="kadai-card" style={{ maxWidth: 520, width: "100%", padding: 36, margin: "20px auto" }}>

          {/* ヘッダー */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 56, animation: "bounce 2s infinite", display: "inline-block" }}>📋</div>
            <h1 style={{ fontSize: 28, color: "#5B21B6", margin: "8px 0 2px", fontWeight: 900 }}>
              課題チャレンジ
            </h1>
            <p style={{ color: "#AAA", fontSize: 13 }}>Homework Challenge — せってい / Settings</p>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "#F3F0FF", borderRadius: 20, padding: "4px 14px",
              fontSize: 12, color: "#7C3AED", fontWeight: 700, marginTop: 6,
            }}>
              🔒 おとな・コーチせってい / Parent & Coach Setup
            </div>
          </div>

          {/* 制限時間 */}
          <Section icon="⏱️" titleJP={`せいげん時間：${timeLimit}分`} titleEN={`Time Limit: ${timeLimit} min`}>
            <input
              type="range" min={5} max={90} step={5} value={timeLimit}
              onChange={e => setTimeLimit(Number(e.target.value))}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#BBB", marginTop: 2 }}>
              <span>5min</span><span>45min</span><span>90min</span>
            </div>
          </Section>

          {/* プラス時間の幅 */}
          <Section icon="⏰" titleJP="プラス時間の幅" titleEN="Extra Time Increment">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[3, 5, 10, 15].map(v => (
                <button key={v} className="kadai-btn" onClick={() => setExtraIncrement(v)}
                  style={{
                    flex: 1, padding: "12px 6px", fontSize: 15, minWidth: 60,
                    background: extraIncrement === v
                      ? "linear-gradient(135deg,#7C3AED,#EC4899)"
                      : "#EEE",
                    color: extraIncrement === v ? "white" : "#555",
                    boxShadow: extraIncrement === v ? "0 4px 12px rgba(124,58,237,.35)" : "none",
                  }}>
                  +{v}分
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#AAA", margin: "6px 0 0" }}>
              「+時間」ボタンを押すたびに追加される時間 / Added per button press
            </p>
          </Section>

          {/* ごほうび 1〜5位 */}
          <Section icon="🎁" titleJP="ごほうびのせってい（1〜5位）" titleEN="Prize Settings (Rank 1–5)">
            <p style={{ fontSize: 12, color: "#888", margin: "0 0 12px" }}>
              あたり5こ→1位　あたり4こ→2位　…　あたり1こ→5位<br />
              5 wins → 1st · 4 wins → 2nd · … · 1 win → 5th
            </p>
            {editPrizes.map((p, i) => {
              const rankColors = ["#FFD060", "#FF9EB5", "#9EB5FF", "#A8FFD8", "#E0B3FF"];
              return (
                <div key={p.rank} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  {/* 順位バッジ */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: rankColors[i], flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 14, color: "#333",
                  }}>
                    {p.rank}位
                  </div>
                  {/* 絵文字 */}
                  <input
                    type="text" value={p.emoji}
                    onChange={e => setEditPrizes(prev => prev.map((x, j) =>
                      j === i ? { ...x, emoji: [...e.target.value].slice(-2).join("") || x.emoji } : x
                    ))}
                    style={{ width: 54, textAlign: "center", fontSize: 24, padding: "6px 4px", borderRadius: 12 }}
                  />
                  {/* 名前 */}
                  <input
                    type="text" value={p.nameJP}
                    onChange={e => setEditPrizes(prev => prev.map((x, j) =>
                      j === i ? { ...x, nameJP: e.target.value } : x
                    ))}
                    placeholder="ごほうびのなまえ"
                    style={{ flex: 1, fontSize: 14 }}
                  />
                </div>
              );
            })}
            <button className="kadai-btn" onClick={() => setPrizes(editPrizes)} style={{
              width: "100%", padding: "10px", fontSize: 14, marginTop: 4,
              background: "#F3F0FF", color: "#7C3AED",
            }}>
              💾 ごほうびをほぞんする / Save Prizes
            </button>
          </Section>

          {/* ルール説明 */}
          <Section icon="📊" titleJP="ルール説明" titleEN="How It Works">
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>
              {[
                ["かんぺき（ミスなし・じかんどおり）", "5枚", "→ 最高1位"],
                ["すごい（ペナルティ1かい）",           "4枚", "→ 最高2位"],
                ["よくできた（ペナルティ2かい）",        "3枚", "→ 最高3位"],
                ["できた（ペナルティ3かい）",            "2枚", "→ 最高4位"],
                ["おわった（ペナルティ4かい以上）",      "1枚", "→ 最高5位"],
              ].map(([cond, tix, max], i) => (
                <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", marginBottom: 4 }}>
                  <span style={{ color: ["#FFD700","#C0C0C0","#CD7F32","#70C0FF","#FF9070"][i], fontSize: 16, flexShrink: 0 }}>
                    {["🏆","🥈","🥉","😊","👍"][i]}
                  </span>
                  <span>{cond}</span>
                  <span style={{ marginLeft: "auto", flexShrink: 0, display: "flex", gap: 4 }}>
                    <span style={{ background: "#EDE9FE", borderRadius: 8, padding: "1px 7px", color: "#5B21B6", fontWeight: 700 }}>{tix}</span>
                    <span style={{ background: "#FEF3C7", borderRadius: 8, padding: "1px 7px", color: "#92400E", fontWeight: 700 }}>{max}</span>
                  </span>
                </div>
              ))}
            </div>
          </Section>

          {/* スタートボタン */}
          <button className="kadai-btn" onClick={startTask} style={{
            width: "100%", padding: "20px", fontSize: 22, marginTop: 8,
            background: "linear-gradient(135deg,#7C3AED 0%,#EC4899 100%)",
            color: "white", boxShadow: "0 8px 24px rgba(124,58,237,.45)",
            animation: "wiggle 2s 2s ease-in-out infinite",
          }}>
            🚀 チャレンジ スタート！ Start!
          </button>

        </div>
      </div>
    </>
  );

  // ════════════════════════════════════════════════════════════
  //  TASK SCREEN  (タスク実行中)
  // ════════════════════════════════════════════════════════════
  if (phase === "task") {
    const R    = 76;
    const circ = 2 * Math.PI * R;
    const currentLevel = Math.min(5, failures + extraTimes + 1);

    return (
      <>
          <div style={BG}>
          <div className="kadai-card" style={{ maxWidth: 440, width: "100%", padding: 36, textAlign: "center" }}>

            <p style={{ fontSize: 12, color: "#BBB", margin: "0 0 4px", letterSpacing: 1 }}>課題チャレンジ</p>
            <h2 style={{ fontSize: 20, color: "#5B21B6", marginTop: 0, marginBottom: 22 }}>
              📝 チャレンジ中！
            </h2>

            {/* 円形タイマー */}
            <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto 20px" }}>
              <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="90" cy="90" r={R} fill="none" stroke="#EEE" strokeWidth="13" />
                <circle cx="90" cy="90" r={R} fill="none"
                  stroke={timeUp ? "#F97316" : isUrgent ? "#EF4444" : "#7C3AED"}
                  strokeWidth="13" strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ * (1 - timerPct / 100)}
                  style={{ transition: "stroke-dashoffset .8s, stroke .3s" }}
                />
              </svg>
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                transform: "translate(-50%,-50%)", textAlign: "center",
                animation: isUrgent ? "pulse .5s infinite" : "none",
              }}>
                <div style={{
                  fontSize: 36, fontWeight: 900, lineHeight: 1,
                  color: timeUp ? "#F97316" : isUrgent ? "#EF4444" : "#5B21B6",
                }}>
                  {fmtTime(timeLeft)}
                </div>
                {timeUp && (
                  <div style={{ fontSize: 12, color: "#F97316", fontWeight: "bold", marginTop: 2 }}>
                    ⏰ じかんきれ！
                  </div>
                )}
              </div>
            </div>

            {/* ステータス */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 22 }}>
              {[
                { bg: "#FFF0F0", icon: "❌", val: failures,    label: "ミス/Fail",           color: "#EF4444" },
                { bg: "#FFF8F0", icon: "⏰", val: extraTimes,   label: `+${extraIncrement}分/+Time`, color: "#F97316" },
                { bg: "#F5F0FF", icon: "🏅", val: currentLevel, label: "レベル/Lv",           color: "#7C3AED" },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: "center", background: s.bg, borderRadius: 14, padding: "10px 14px", minWidth: 78 }}>
                  <div style={{ fontSize: 18 }}>{s.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 10, color: "#999", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ボタン */}
            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
              <button className="kadai-btn" onClick={() => setFailures(f => f + 1)} style={{
                flex: 1, padding: "16px 8px", fontSize: 15,
                background: "linear-gradient(135deg,#EF4444,#B91C1C)",
                color: "white", boxShadow: "0 4px 14px rgba(239,68,68,.4)",
              }}>❌ ミス / Fail</button>
              <button className="kadai-btn" onClick={handleExtraTime} style={{
                flex: 1, padding: "16px 8px", fontSize: 15,
                background: "linear-gradient(135deg,#F97316,#C2410C)",
                color: "white", boxShadow: "0 4px 14px rgba(249,115,22,.4)",
              }}>⏰ +{extraIncrement}分 / +Time</button>
            </div>
            <button className="kadai-btn" onClick={handleComplete} style={{
              width: "100%", padding: "20px", fontSize: 22,
              background: "linear-gradient(135deg,#10B981,#059669)",
              color: "white", boxShadow: "0 6px 20px rgba(16,185,129,.5)",
            }}>✅ おわった！ / Done!</button>

          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  PRIZE LEVEL SCREEN  (パフォーマンス結果)
  // ════════════════════════════════════════════════════════════
  if (phase === "prizeLevel") {
    const info = PERF_LEVELS[perfLevel];
    return (
      <>
          <div style={BG}>
          <div className="kadai-card" style={{ maxWidth: 440, width: "100%", padding: 40, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#BBB", margin: "0 0 4px", letterSpacing: 1 }}>課題チャレンジ</p>

            <div style={{ fontSize: 80, display: "inline-block", animation: "popIn .6s ease-out both, bounce 2s .9s infinite" }}>
              {info.emoji}
            </div>
            <h2 style={{
              fontSize: 34, margin: "14px 0 4px", fontWeight: 900,
              background: info.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              {info.labelJP}
            </h2>
            <p style={{ color: "#777", fontSize: 15, margin: "0 0 2px" }}>{info.labelEN}</p>

            {(failures > 0 || extraTimes > 0) && (
              <div style={{ background: "#F9F5FF", borderRadius: 14, padding: "10px 18px", margin: "16px 0", fontSize: 14, color: "#666" }}>
                {failures   > 0 && <span>❌ ミス {failures}かい　</span>}
                {extraTimes > 0 && <span>⏰ えんちょう {extraTimes}かい</span>}
              </div>
            )}

            <div style={{
              borderRadius: 22, padding: "22px 20px", marginBottom: 28,
              background: info.gradient, color: "white",
              animation: "slideUp .5s .3s ease-out both",
            }}>
              <div style={{ fontSize: 54, fontWeight: 900, lineHeight: 1 }}>{info.tickets}まい</div>
              <div style={{ fontSize: 18, marginTop: 4 }}>のくじをひけるよ！</div>
              <div style={{ fontSize: 13, opacity: .85 }}>{info.tickets} lottery ticket{info.tickets > 1 ? "s" : ""}!</div>
            </div>

            <button className="kadai-btn" onClick={() => setPhase("lottery")} style={{
              width: "100%", padding: "20px", fontSize: 22,
              background: "linear-gradient(135deg,#F59E0B,#D97706)",
              color: "white", boxShadow: "0 6px 22px rgba(245,158,11,.5)",
              animation: "wiggle 1.2s 1s ease-in-out infinite",
            }}>
              🎰 くじをひく！ Draw!
            </button>
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  LOTTERY SCREEN  (くじびき)
  // ════════════════════════════════════════════════════════════
  if (phase === "lottery") {
    const revealed  = tickets.filter(t => t.revealed);
    const wins      = revealed.filter(t => t.win).length;
    const losses    = revealed.filter(t => !t.win).length;
    const remaining = tickets.length - revealed.length;

    return (
      <>
          <div style={BG}>
          <div className="kadai-card" style={{ maxWidth: 540, width: "100%", padding: 36, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#BBB", margin: "0 0 4px", letterSpacing: 1 }}>課題チャレンジ</p>
            <h2 style={{ fontSize: 28, color: "#5B21B6", margin: "0 0 4px" }}>🎰 くじびき！</h2>
            <p style={{ color: "#888", fontSize: 14, marginBottom: 22 }}>
              カードをタップして引こう！ / Tap cards to reveal!
            </p>

            {/* スコアボード */}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
              {[
                { bg: "#F0FFF8", icon: "⭐", val: wins,      label: "あたり / Win",   color: "#10B981" },
                { bg: "#FFF0F0", icon: "✖️",  val: losses,    label: "はずれ / Miss",  color: "#EF4444" },
                { bg: "#F5F0FF", icon: "🎫", val: remaining,  label: "のこり / Left",  color: "#7C3AED" },
              ].map((s, i) => (
                <div key={i} style={{ background: s.bg, borderRadius: 14, padding: "8px 18px", textAlign: "center", minWidth: 80 }}>
                  <div style={{ fontSize: 20 }}>{s.icon}</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* チケット */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 24 }}>
              {tickets.map(ticket => (
                <div
                  key={ticket.id}
                  className={`ticket-card${ticket.revealed ? " revealed" : ""}`}
                  onClick={() => !ticket.revealed && revealTicket(ticket.id)}
                  style={{
                    width: 108, height: 128,
                    cursor: ticket.revealed ? "default" : "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    background: ticket.revealed
                      ? ticket.win
                        ? "linear-gradient(135deg,#FFD700,#FFA500)"
                        : "linear-gradient(135deg,#D1D5DB,#9CA3AF)"
                      : "linear-gradient(135deg,#7C3AED,#EC4899)",
                    boxShadow: ticket.revealed && ticket.win
                      ? "0 0 24px rgba(255,180,0,.8)"
                      : ticket.revealed ? "0 2px 8px rgba(0,0,0,.12)" : "0 5px 16px rgba(0,0,0,.18)",
                    animation: ticket.revealed ? "flipReveal .4s ease-out" : "none",
                  }}
                >
                  {!ticket.revealed ? (
                    <>
                      <div style={{ fontSize: 38 }}>🎫</div>
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,.9)", fontWeight: "bold" }}>タップ!</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.65)" }}>Tap!</div>
                    </>
                  ) : ticket.win ? (
                    <>
                      <div style={{ fontSize: 50, animation: "starSpin .6s ease-out" }}>⭐</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>あたり！</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.85)" }}>WIN!</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 50 }}>✖️</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "white" }}>はずれ</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,.75)" }}>Miss...</div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* 全部引いた後 */}
            {allRevealed && (
              <div style={{ animation: "popIn .5s ease-out both" }}>
                <div style={{
                  borderRadius: 18, padding: "16px 20px", marginBottom: 18,
                  background: wins > 0
                    ? "linear-gradient(135deg,#10B981,#059669)"
                    : "linear-gradient(135deg,#9CA3AF,#6B7280)",
                  color: "white",
                }}>
                  {wins > 0 ? (
                    <>
                      <div style={{ fontSize: 24, fontWeight: 900 }}>
                        ⭐ あたり {wins}こ！→ <strong>{winsToRank(wins)}位</strong> のごほうび！
                      </div>
                      <div style={{ fontSize: 13, opacity: .9, marginTop: 2 }}>
                        {wins} wins → {winsToRank(wins)}{["st","nd","rd","th","th"][winsToRank(wins)-1]} place prize!
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 22, fontWeight: 900 }}>😢 ざんねん！全部はずれ</div>
                      <div style={{ fontSize: 13, opacity: .9 }}>All tickets missed — no prize this time</div>
                    </>
                  )}
                </div>
                <button className="kadai-btn" onClick={goToResult} style={{
                  width: "100%", padding: "18px", fontSize: 20,
                  background: wins > 0
                    ? "linear-gradient(135deg,#F59E0B,#D97706)"
                    : "linear-gradient(135deg,#9CA3AF,#6B7280)",
                  color: "white",
                  boxShadow: wins > 0 ? "0 6px 20px rgba(245,158,11,.5)" : "none",
                }}>
                  {wins > 0 ? "🎁 けっかを見る！ See result!" : "😢 おわり / Finish"}
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ════════════════════════════════════════════════════════════
  //  RESULT SCREEN  (ごほうび結果)
  // ════════════════════════════════════════════════════════════
  if (phase === "result") {
    return (
      <>
          {showConfetti && <Confetti />}
        <div style={BG}>
          <div className="kadai-card" style={{ maxWidth: 560, width: "100%", padding: 36, textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#BBB", margin: "0 0 4px", letterSpacing: 1 }}>課題チャレンジ</p>

            {prizeRank ? (
              <>
                <div style={{ fontSize: 60, display: "inline-block", animation: "bounce 1s infinite" }}>🎉</div>
                <h2 style={{ fontSize: 28, color: "#5B21B6", margin: "8px 0 4px", fontWeight: 900 }}>
                  {prizeRank}位 入賞！おめでとう！
                </h2>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 22 }}>
                  {totalWins} wins → {prizeRank}{["st","nd","rd","th","th"][prizeRank-1]} place! Congratulations!
                </p>
              </>
            ) : (
              <>
                <div style={{ fontSize: 60, display: "inline-block", animation: "bounce 2s infinite" }}>😢</div>
                <h2 style={{ fontSize: 24, color: "#5B21B6", margin: "8px 0 4px" }}>ざんねん！</h2>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 22 }}>今回はごほうびなし / No prize this time</p>
              </>
            )}

            {/* 全5位のランク表示 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {prizes.map(prize => {
                const isWinner = prize.rank === prizeRank;
                return (
                  <div key={prize.rank} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    borderRadius: 20, padding: "14px 20px",
                    background: isWinner ? prize.color : "#F5F5F5",
                    opacity: !prizeRank ? 0.4 : isWinner ? 1 : 0.38,
                    transform: isWinner ? "scale(1.04)" : "scale(1)",
                    transition: "all .3s",
                    animation: isWinner
                      ? "prizeReveal .6s ease-out both, rankGlow 1.5s 0.6s ease-in-out infinite"
                      : "none",
                    border: isWinner ? `3px solid ${prize.color}` : "3px solid transparent",
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: isWinner ? "rgba(255,255,255,.5)" : "#DDD",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: 13,
                      color: isWinner ? "#333" : "#999",
                    }}>
                      {prize.rank}位
                    </div>

                    <span style={{
                      fontSize: isWinner ? 44 : 32,
                      transition: "font-size .3s",
                      animation: isWinner ? "bounce 1.5s .6s infinite" : "none",
                      lineHeight: 1,
                    }}>
                      {prize.emoji}
                    </span>

                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div style={{
                        fontSize: isWinner ? 18 : 15,
                        fontWeight: isWinner ? 900 : 600,
                        color: isWinner ? "#333" : "#AAA",
                        lineHeight: 1.2,
                      }}>
                        {prize.nameJP}
                      </div>
                    </div>

                    {isWinner ? (
                      <div style={{
                        background: "white", borderRadius: 20, padding: "4px 14px",
                        fontSize: 13, fontWeight: 900, color: prize.textColor,
                        flexShrink: 0, animation: "popIn .4s .7s ease-out both",
                      }}>
                        🏅 GET!
                      </div>
                    ) : (
                      <div style={{
                        background: "#EEE", borderRadius: 20, padding: "4px 12px",
                        fontSize: 11, color: "#BBB", flexShrink: 0,
                      }}>
                        ⭐×{6 - prize.rank}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button className="kadai-btn" onClick={reset} style={{
              width: "100%", padding: "18px", fontSize: 20,
              background: "linear-gradient(135deg,#7C3AED 0%,#EC4899 100%)",
              color: "white", boxShadow: "0 8px 24px rgba(124,58,237,.45)",
            }}>
              🔄 もう1かい！ Play again!
            </button>
          </div>
        </div>
      </>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
//  Mount
// ─────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById("kadai-root")).render(
  React.createElement(App)
);