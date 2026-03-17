-- ============================================================
--  FEP Soccer Training App — Supabase テーブルスキーマ
--  Supabase ダッシュボード > SQL Editor で実行してください
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. training_sessions テーブル
--     評価シートのセッション記録（選手 / 指導者）
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  sheet_id     TEXT NOT NULL,          -- 例: 'player-junior'
  role         TEXT NOT NULL,          -- 'player' | 'coach'
  grade        TEXT NOT NULL,          -- 'elementary' | 'junior' | 'pro'
  player_name  TEXT,
  session_date DATE,
  theme        TEXT,
  scores       INTEGER[],              -- 各設問のスコア配列
  total_score  INTEGER,
  max_score    INTEGER,
  notes        JSONB DEFAULT '{}',     -- { "設問ラベル": "回答テキスト" }

  saved_at     TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
--  2. training_weeklies テーブル
--     週間まとめシート
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.training_weeklies (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name       TEXT,                     -- 選手名 / チーム名
  week       TEXT,                     -- 例: '3/10〜3/16'
  grade      TEXT,                     -- 'elementary' | 'junior' | 'pro'
  theme      TEXT,
  axes       JSONB DEFAULT '{}',       -- { jikoYosoku: 4, gosaNinshiki: 3, ... }
  growth     TEXT,                     -- 今週の成長点
  challenge  TEXT,                     -- 今週の課題
  next_theme TEXT,                     -- 来週のテーマ

  saved_at   TIMESTAMPTZ DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
--  3. Row Level Security (RLS) — 本人データのみ読み書き可能
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_weeklies ENABLE ROW LEVEL SECURITY;

-- training_sessions
CREATE POLICY "Users can view own sessions"
  ON public.training_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON public.training_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
  ON public.training_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- training_weeklies
CREATE POLICY "Users can view own weeklies"
  ON public.training_weeklies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weeklies"
  ON public.training_weeklies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weeklies"
  ON public.training_weeklies FOR DELETE
  USING (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
--  4. Heroku 側バックエンドがデータを読む場合の VIEW
--     (service_role キーで読み取る想定)
-- ────────────────────────────────────────────────────────────

-- 全ユーザーのセッション集計ビュー（管理者 / Heroku API 用）
CREATE OR REPLACE VIEW public.training_summary_view AS
SELECT
  ts.user_id,
  au.email,
  au.raw_user_meta_data->>'full_name' AS display_name,
  COUNT(ts.id)                        AS total_sessions,
  ROUND(AVG(ts.total_score::numeric / NULLIF(ts.max_score,0) * 100), 1) AS avg_score_pct,
  MAX(ts.session_date)                AS last_session_date,
  COUNT(tw.id)                        AS total_weeklies
FROM public.training_sessions ts
LEFT JOIN auth.users au ON au.id = ts.user_id
LEFT JOIN public.training_weeklies tw ON tw.user_id = ts.user_id
GROUP BY ts.user_id, au.email, au.raw_user_meta_data->>'full_name';

-- ────────────────────────────────────────────────────────────
--  5. Google OAuth プロバイダー設定メモ
--     Supabase ダッシュボード > Authentication > Providers > Google
--     ↓ 以下を設定
--     Client ID:     (Google Cloud Console で取得)
--     Client Secret: (Google Cloud Console で取得)
--     Redirect URL:  https://<your-supabase-project>.supabase.co/auth/v1/callback
--
--     Authorized redirect URIs（Google Cloud Console 側）:
--       https://<your-supabase-project>.supabase.co/auth/v1/callback
--
--  ※ Heroku アプリと同じ Google OAuth クライアントを使用する場合は
--     両方の Redirect URI を Google Cloud Console に追加してください。
-- ────────────────────────────────────────────────────────────
