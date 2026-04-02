-- ============================================================
--  FEP Soccer Training App — セッションフロー テーブルスキーマ
--  FEP Soccer Training Supabase (gypuobgbulrmlgljjrsq) で実行
-- ============================================================
--
--  5ステップのセッションフローに対応:
--    ① 前チェック → ② セッション記録 → ③ 後評価 → ④ 次回提案 → ⑤ フォローアップ
--
--  既存の training_sessions / training_weeklies はそのまま残す（旧評価シート用）
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. sessions — セッション本体
--     1セッション = 1レコード。前チェック〜完了までの全体を管理
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  status          TEXT NOT NULL DEFAULT 'in_progress',  -- 'in_progress' | 'completed' | 'abandoned'
  current_step    INTEGER DEFAULT 0,                     -- 0-4 (5ステップ)

  -- ① 前チェック (pre-check)
  pre_condition       SMALLINT,        -- コンディション (0-10) → セロトニン系 σ
  pre_expectation     SMALLINT,        -- 期待感 (0-10) → ドーパミン系 F' Q1
  pre_epi_q1          SMALLINT,        -- 情報理解度 (0-10) → EFE epistemic
  pre_epi_q2          SMALLINT,        -- 情報の必要性 (0-10) → α
  pre_pra_q3          SMALLINT,        -- 目標達成見通し (0-10) → EFE pragmatic
  pre_pra_q4          SMALLINT,        -- 負担感 (0-10) → β

  -- ③ 後評価 (post-eval)
  post_ease           SMALLINT,        -- やりやすさ (0-10)
  post_difficulty     SMALLINT,        -- 難しさの感覚 (0-10)
  post_enjoyment      SMALLINT,        -- 楽しさ (0-10) → F' Q2
  post_satisfaction   SMALLINT,        -- 納得感 (0-10) → F' Q3
  post_reproducibility TEXT,           -- 'できそう' | '少し不安' | '難しい'

  -- 計算結果 (computed scores)
  score_vfe           NUMERIC(5,1),    -- VFE display (0-100)
  score_efe           NUMERIC(5,1),    -- EFE display (0-100)
  score_f_prime       NUMERIC(4,2),    -- F' effective (-2 to +2)
  score_f_prime_display NUMERIC(5,1),  -- F' display (0-100)
  score_eu            NUMERIC(5,1),    -- EU display (0-100)
  score_sigma_mod     NUMERIC(4,2),    -- σ modifier (-2 to +2)
  score_lambda_mod    NUMERIC(4,2),    -- λ modifier (-2 to +2)
  score_alpha         NUMERIC(4,2),    -- α (認識的重み)
  score_beta          NUMERIC(4,2),    -- β (実用的重み)

  -- ④ 次回提案 (recommendation)
  recommendation      JSONB,           -- { suggestions: [...], generatedAt: "..." }

  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────
--  2. session_menus — セッション内の練習メニュー
--     1セッションに複数メニューを記録可能
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_menus (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  menu_order      SMALLINT DEFAULT 1,    -- メニュー順序

  -- メニュー基本情報
  menu_name       TEXT NOT NULL,
  purpose         TEXT[],                -- {'安定化', '探索', '修正', '強化', '統合'}
  duration_min    SMALLINT,              -- 練習時間（分）
  layer           TEXT,                  -- 'L1' | 'L2' | 'L3' | 'L4'
  channels        TEXT[],                -- {'視覚', '体性感覚', '聴覚', '前庭覚'}
  constraints     TEXT[],                -- {'時間制限あり', '人数制限', ...}

  -- VFE 入力
  complexity      SMALLINT,              -- 難易度 (0-10)
  accuracy        SMALLINT,              -- 成功率 (0-100%)
  weight_value    NUMERIC(3,1),          -- 処理バイアス (-2.0 to +2.0)

  -- コーチング環境 (オキシトシン系)
  coaching_type   TEXT,                  -- 'safe' | 'explore' | 'challenge' | 'positive'
  feedback_freq   TEXT,                  -- 'none' | 'few' | 'frequent'

  -- メニュー単体の VFE 計算結果
  vfe_display     NUMERIC(5,1),

  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
--  3. session_followups — フォローアップ記録
--     セッション完了後の振り返り
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.session_followups (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,

  reproduced      TEXT,          -- 'yes' | 'partial' | 'no'
  transferable    TEXT,          -- 'yes' | 'unknown' | 'no'
  want_repeat     TEXT,          -- 'yes' | 'no'
  anxiety_change  TEXT,          -- 'decreased' | 'same' | 'increased'
  pain_change     TEXT,          -- 'gone' | 'same' | 'slight' | 'worse'
  notes           TEXT,

  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
--  4. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_followups ENABLE ROW LEVEL SECURITY;

-- sessions
CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = user_id);

-- session_menus (session_id 経由でアクセス制御)
CREATE POLICY "Users can view own session menus"
  ON public.session_menus FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users can insert own session menus"
  ON public.session_menus FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users can update own session menus"
  ON public.session_menus FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users can delete own session menus"
  ON public.session_menus FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- session_followups
CREATE POLICY "Users can view own followups"
  ON public.session_followups FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users can insert own followups"
  ON public.session_followups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users can update own followups"
  ON public.session_followups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

CREATE POLICY "Users can delete own followups"
  ON public.session_followups FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────
--  5. インデックス
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_date ON public.sessions(session_date DESC);
CREATE INDEX idx_session_menus_session ON public.session_menus(session_id);
CREATE INDEX idx_session_followups_session ON public.session_followups(session_id);
