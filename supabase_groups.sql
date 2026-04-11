-- ============================================================
--  FEP Soccer Training App — グループ管理テーブルスキーマ
--  FEP Soccer Training Supabase (gypuobgbulrmlgljjrsq) で実行
-- ============================================================
--
--  グループ中心データ設計:
--    team → category → subcategory の階層構造
--    すべてのセッションデータはグループに紐づく
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  1. groups — チーム/カテゴリ/サブカテゴリの階層構造
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.groups (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team          TEXT NOT NULL,                -- e.g. 'demo'
  category      TEXT NOT NULL DEFAULT '',      -- e.g. 'team A'
  subcategory   TEXT NOT NULL DEFAULT '',      -- e.g. 'U18'
  created_by    UUID,                         -- コーチ user_id（任意）
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (team, category, subcategory)
);

CREATE INDEX IF NOT EXISTS idx_groups_team ON public.groups(team);
CREATE INDEX IF NOT EXISTS idx_groups_lookup ON public.groups(team, category, subcategory);

-- ────────────────────────────────────────────────────────────
--  2. group_members — 選手とグループの紐付け
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  player_id   UUID NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT now(),

  UNIQUE (group_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_player ON public.group_members(player_id);

-- ────────────────────────────────────────────────────────────
--  3. sessions テーブルにグループカラム追加
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS group_id  UUID REFERENCES public.groups(id),
  ADD COLUMN IF NOT EXISTS member_id UUID;

CREATE INDEX IF NOT EXISTS idx_sessions_group_id ON public.sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_sessions_group_date ON public.sessions(group_id, session_date DESC);

-- ────────────────────────────────────────────────────────────
--  4. session_menus テーブルにグループカラム追加
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.session_menus
  ADD COLUMN IF NOT EXISTS group_id     UUID REFERENCES public.groups(id),
  ADD COLUMN IF NOT EXISTS session_date DATE;

CREATE INDEX IF NOT EXISTS idx_session_menus_group_date ON public.session_menus(group_id, session_date DESC);

-- ────────────────────────────────────────────────────────────
--  5. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read groups"
  ON public.groups FOR SELECT USING (true);

CREATE POLICY "Anyone can create groups"
  ON public.groups FOR INSERT WITH CHECK (true);

CREATE POLICY "Creator can update groups"
  ON public.groups FOR UPDATE
  USING (created_by = auth.uid());

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read group members"
  ON public.group_members FOR SELECT USING (true);

CREATE POLICY "Anyone can join groups"
  ON public.group_members FOR INSERT WITH CHECK (true);

-- ────────────────────────────────────────────────────────────
--  6. グループ平均ビュー（Phase 2 で使用）
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.group_session_averages AS
SELECT
  s.group_id,
  s.session_date,
  COUNT(*)                                     AS record_count,
  ROUND(AVG(s.score_vfe), 1)                   AS avg_vfe,
  ROUND(AVG(s.score_efe), 1)                   AS avg_efe,
  ROUND(AVG(s.score_eu),  1)                   AS avg_eu,
  ROUND(AVG(s.score_f_prime), 2)               AS avg_f_prime,
  ROUND(AVG(s.score_sigma_mod), 2)             AS avg_sigma_mod,
  ROUND(AVG(s.score_lambda_mod), 2)            AS avg_lambda_mod
FROM public.sessions s
WHERE s.group_id IS NOT NULL
  AND s.status = 'completed'
GROUP BY s.group_id, s.session_date;

-- ────────────────────────────────────────────────────────────
--  7. インデックス（追加分まとめ）
-- ────────────────────────────────────────────────────────────
-- 上記で個別に CREATE INDEX 済み

-- ============================================================
--  Phase 2: 追加スキーマ
-- ============================================================

-- ────────────────────────────────────────────────────────────
--  8. recommendations — AI提案の採用トラッキング
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recommendations (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id        UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  session_date    DATE NOT NULL,
  created_by      UUID,

  -- 提案内容
  rec_type        TEXT NOT NULL,                  -- 'layer' | 'coaching' | 'purpose'
  content         TEXT NOT NULL,                  -- 提案テキスト
  rationale       TEXT NOT NULL,                  -- 根拠テキスト
  rationale_code  TEXT,                           -- 'vfe_high' | 'fprime_negative' 等

  -- コンテキストスナップショット
  context_avg_vfe     NUMERIC(5,1),
  context_avg_efe     NUMERIC(5,1),
  context_avg_eu      NUMERIC(5,1),
  context_avg_fprime  NUMERIC(5,2),
  context_record_count INTEGER,

  -- 推奨プリセット
  suggested_layer         TEXT,                   -- 'L1' | 'L2' | 'L3' | 'L4'
  suggested_coaching_type TEXT,                   -- 'safe' | 'explore' | 'positive' | 'challenge'
  suggested_purpose       TEXT[],                 -- ARRAY['安定化', '強化']

  -- 採用追跡
  status          TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  decided_at      TIMESTAMPTZ,
  decided_by      UUID,

  -- 次回結果紐付け
  next_session_date    DATE,
  next_avg_vfe         NUMERIC(5,1),
  next_avg_fprime      NUMERIC(5,2),
  outcome_delta_vfe    NUMERIC(5,1),

  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_group_date
  ON public.recommendations(group_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_status
  ON public.recommendations(group_id, status);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read recommendations"
  ON public.recommendations FOR SELECT USING (true);
CREATE POLICY "Anyone can create recommendations"
  ON public.recommendations FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update recommendations"
  ON public.recommendations FOR UPDATE USING (true);

-- ────────────────────────────────────────────────────────────
--  9. group_session_averages ビュー更新（標準偏差追加）
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.group_session_averages AS
SELECT
  s.group_id,
  s.session_date,
  COUNT(*)                                     AS record_count,
  ROUND(AVG(s.score_vfe), 1)                   AS avg_vfe,
  ROUND(AVG(s.score_efe), 1)                   AS avg_efe,
  ROUND(AVG(s.score_eu),  1)                   AS avg_eu,
  ROUND(AVG(s.score_f_prime), 2)               AS avg_f_prime,
  ROUND(AVG(s.score_sigma_mod), 2)             AS avg_sigma_mod,
  ROUND(AVG(s.score_lambda_mod), 2)            AS avg_lambda_mod,
  ROUND(STDDEV_SAMP(s.score_vfe), 1)           AS stddev_vfe,
  ROUND(STDDEV_SAMP(s.score_efe), 1)           AS stddev_efe,
  ROUND(STDDEV_SAMP(s.score_eu),  1)           AS stddev_eu,
  ROUND(STDDEV_SAMP(s.score_f_prime), 2)       AS stddev_f_prime
FROM public.sessions s
WHERE s.group_id IS NOT NULL
  AND s.status = 'completed'
GROUP BY s.group_id, s.session_date;
