# データ保存先マッピング — Active Training App

## 概要

本アプリでは **Supabase（PostgreSQL）** と **ブラウザ localStorage** の2つの保存先を使用しています。
Supabase は2つのプロジェクトに分かれています。

| 接続名 | 用途 | 変数名 |
|--------|------|--------|
| FEP Soccer Training | メインDB（セッション・選手・グループ） | `sbFep` |
| Inflexion Index | VFE評価スコア連携 | `sb` |

---

## 1. Supabase テーブル一覧（FEP Soccer Training）

### `players` — 選手マスタ

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| team_name | TEXT | チーム名 |
| player_name | TEXT | 選手名 |
| position | TEXT | ポジション（GK/DF/MF/FW） |
| jersey_number | INTEGER | 背番号 |
| error_type | TEXT | エラータイプ分類（P1〜P9） |

**書き込み箇所:**

| 操作 | 関数 | ファイル | トリガー |
|------|------|----------|----------|
| INSERT/UPDATE | `loginAsPlayer()` | js/core.js | 選手ログイン時に自動作成/更新 |
| UPDATE/INSERT | `savePlayerChanges()` | js/player-profile.js | コーチが選手プロフィールを編集・保存 |

---

### `groups` — グループ（チーム/カテゴリ/サブカテゴリ）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| team | TEXT | チーム名（例：demo） |
| category | TEXT | カテゴリ（例：team A） |
| subcategory | TEXT | サブカテゴリ（例：U18）※任意 |
| created_by | UUID | 作成者のユーザーID |
| created_at | TIMESTAMPTZ | 作成日時 |

**書き込み箇所:**

| 操作 | 関数 | ファイル | トリガー |
|------|------|----------|----------|
| INSERT | `upsertGroup()` | js/group-context.js | グループ選択時（未登録なら自動作成） |

---

### `group_members` — 選手⇔グループ紐付け

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| group_id | UUID | グループID（FK → groups） |
| player_id | UUID | 選手ID |
| joined_at | TIMESTAMPTZ | 参加日時 |

**書き込み箇所:**

| 操作 | 関数 | ファイル | トリガー |
|------|------|----------|----------|
| INSERT | `assignPlayer()` | js/group-context.js | 選手ログイン時にグループへ自動割当 |

---

### `sessions` — セッション記録（メインテーブル）

全てのセッションフロー（MTG後チェック → 練習後チェック → 後評価 → 提案 → フォローアップ）のデータを1レコードに集約します。

| カラムグループ | カラム | 説明 |
|--------------|--------|------|
| **基本情報** | id, user_id, group_id, member_id | 識別子 |
| | session_date, status, current_step | 日付・状態・進行ステップ |
| **MTG後チェック** | pre_condition, pre_expectation | コンディション・期待感 |
| | pre_epi_q1, pre_epi_q2 | 認識的質問（EFE） |
| | pre_pra_q3, pre_pra_q4 | 実用的質問（EFE） |
| **計算スコア** | score_vfe, score_efe, score_eu | VFE・EFE・EU |
| | score_f_prime, score_alpha, score_beta | F'・α・β |
| | score_sigma_mod, score_lambda_mod | σ修飾・λ修飾 |
| **後評価** | post_enjoyment, post_satisfaction | 楽しさ・納得感 |
| | post_ease, post_difficulty | やりやすさ・難しさ |
| **提案** | recommendation_text | AI提案内容（JSON） |
| **フォローアップ** | fu_reproduced, fu_transferable | 再現性・転用可能性 |
| | fu_want_repeat, fu_anxiety_change | 反復希望・不安変化 |
| | fu_pain_change, fu_notes | 痛み変化・メモ |

**書き込み箇所:**

| ステップ | 操作 | 関数 | ファイル | トリガー |
|---------|------|------|----------|----------|
| ① MTG後チェック | INSERT | `createFlowSession()` | js/core.js | MTG後チェック完了 |
| ② 練習後チェック | INSERT | `persistRecord()` | js/core.js | 練習後チェック完了 |
| ③ 後評価 | UPDATE | `updateFlowPostEval()` | js/core.js | 後評価完了 |
| ④ 提案 | UPDATE | `updateFlowRecommendation()` | js/core.js | 提案ページ完了 |
| ⑤ フォローアップ | UPDATE | `completeFlowSession()` | js/core.js | フォローアップ完了 |
| EFE月次 | INSERT | `persistEfeMonthly()` | js/core.js | EFE月次記録保存 |
| コーチ記録 | INSERT | `persistCoachRecord()` | js/core.js | コーチ記録保存 |

---

### `session_menus` — 練習メニュー詳細

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| session_id | UUID | セッションID（FK → sessions） |
| group_id | UUID | グループID |
| session_date | DATE | 実施日 |
| menu_name | TEXT | メニュー名 |
| purpose | TEXT[] | 目的（安定化/探索/修正/強化/統合） |
| duration_min | INTEGER | 練習時間（分） |
| layer | TEXT | レイヤー（L1〜L4） |
| channels | TEXT[] | 使用チャネル（視覚/体性感覚等） |
| constraints | TEXT[] | 制約条件 |
| coaching_type | TEXT | コーチングタイプ（safe/explore/positive/challenge） |
| feedback_freq | TEXT | フィードバック頻度 |

**書き込み箇所:**

| 操作 | 関数 | ファイル | トリガー |
|------|------|----------|----------|
| INSERT | `persistCoachRecord()` | js/core.js | コーチ記録ページで保存ボタン押下 |

---

### `recommendations` — AI提案トラッキング

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | 主キー |
| group_id | UUID | グループID |
| session_date | DATE | セッション日 |
| rec_type | TEXT | 提案種別（layer/coaching/purpose） |
| content | TEXT | 提案テキスト |
| rationale | TEXT | 根拠テキスト |
| rationale_code | TEXT | 根拠コード（vfe_high/fprime_negative等） |
| context_avg_vfe/efe/eu/fprime | NUMERIC | その時のスコアスナップショット |
| suggested_layer/coaching_type/purpose | TEXT/TEXT[] | 推奨プリセット |
| status | TEXT | pending/accepted/rejected |
| decided_at, decided_by | TIMESTAMPTZ/UUID | 採用/却下の日時・操作者 |
| next_session_date, next_avg_vfe, outcome_delta_vfe | | 次回結果紐付け |

**書き込み箇所:**

| 操作 | 関数 | ファイル | トリガー |
|------|------|----------|----------|
| UPSERT | `saveRecommendations()` | js/group-analytics.js | 結果ページ表示時に自動生成・保存 |
| UPDATE | `updateRecommendationStatus()` | js/group-analytics.js | 採用/却下ボタン押下 |
| UPDATE | `linkOutcome()` | js/group-analytics.js | 次回セッション完了時に前回提案と紐付け |

---

### `training_sessions` — 旧評価シート（レガシー）

| 操作 | 関数 | ファイル | トリガー |
|------|------|----------|----------|
| INSERT | `persistSession()` | js/core.js | 旧VFE/コーチ評価保存 |

### `training_weeklies` — 週次サマリー（レガシー）

| 操作 | 関数 | ファイル | トリガー |
|------|------|----------|----------|
| INSERT | `persistWeekly()` | js/core.js | 週次記録保存 |

---

### ビュー（読み取り専用・自動集計）

| ビュー名 | 説明 |
|----------|------|
| `group_session_averages` | グループ×日付ごとの平均スコア・標準偏差を自動集計 |
| `training_summary_view` | 旧サマリー集計 |

---

## 2. Supabase テーブル（Inflexion Index）

| テーブル | 操作 | 関数 | トリガー |
|---------|------|------|----------|
| `assessments` | INSERT | `persistInflexionPlayerVfe()` | VFE評価保存（eval.js） |
| `estimation_uncertainty` | INSERT | `persistInflexionCoachEval()` | コーチσ/λ/τ評価保存（eval.js） |

---

## 3. ブラウザ localStorage

ブラウザのローカルストレージに保存されるデータです。**ブラウザやデバイスを変えるとデータは引き継がれません。**

### セッション・履歴系

| キー | 内容 | 書き込み元 |
|------|------|-----------|
| `fep_vfe_history` | VFE推移履歴（最大50件） | session-result.html `finishSession()` |
| `fep_sessions` | 旧セッション記録（ローカル控え） | core.js `persistSession()` |
| `fep_weeklies` | 旧週次記録（ローカル控え） | core.js `persistWeekly()` |
| `fep_players` | 選手データ（Supabase障害時のfallback） | player-profile.js |

### カスタムメニュー系

| キー | 内容 | 書き込み元 |
|------|------|-----------|
| `fep_custom_team_menus` | コーチが追加したチームメニュー | js/menu.js |
| `fep_deleted_team_menus` | 削除したチームメニュー名リスト | js/menu.js |
| `fep_custom_pos_menus_{posId}` | ポジション別カスタムメニュー | js/position.js |
| `fep_deleted_pos_menus_{posId}` | ポジション別削除済みメニュー | js/position.js |
| `fep_ind_menus_{playerId}` | 選手個別カスタムメニュー | js/individual.js |

### キャッシュ系

| キー | 内容 | TTL | 書き込み元 |
|------|------|-----|-----------|
| `fep_menu_master_cache` | メニューマスタデータ | 30分 | js/data-loader.js |
| `fep_indiv_plan_cache` | 個別プランデータ | 30分 | js/data-loader.js |

### セッションストレージ（タブを閉じると消える）

| キー | 内容 | 書き込み元 |
|------|------|-----------|
| `fep_active_group` | 現在選択中のグループ情報 | js/group-context.js |
| `fep_player_session` | 現在ログイン中の選手情報 | js/core.js |

---

## 4. セッションフローのデータ保存タイミング

```
選手ログイン
  └→ players INSERT/UPDATE
  └→ groups UPSERT（チーム自動作成）
  └→ group_members INSERT（グループ割当）

① MTG後チェック完了
  └→ sessions INSERT（createFlowSession）
  └→ dbSessionId を SessionFlow state に保存

② 練習後チェック完了
  └→ sessions INSERT（persistRecord）※別レコード

③ 後評価完了
  └→ sessions UPDATE（updateFlowPostEval）
     → VFE/EFE/EU/F'/σ/λ スコアを書き込み

④ 提案ページ完了
  └→ sessions UPDATE（updateFlowRecommendation）
     → 提案内容をJSONで書き込み

⑤ フォローアップ完了
  └→ sessions UPDATE（completeFlowSession）
     → 再現性・転用性・不安変化等を書き込み
     → status = 'completed'

コーチ記録保存（別フロー）
  └→ sessions INSERT（親セッション）
  └→ session_menus INSERT（メニュー詳細）

結果ページ表示（コーチ）
  └→ recommendations UPSERT（AI提案生成・保存）
  └→ localStorage fep_vfe_history（VFE推移追記）
```

---

## 5. 注意事項

- **カスタムメニューはlocalStorageのみ**: チーム/ポジション/個別のカスタムメニューはSupabaseに保存されません。ブラウザを変えると消えます。将来的にSupabase移行を検討してください。
- **セッションフローのdbSessionId**: MTG後チェックで作成されたセッションIDがフロー全体で引き継がれます。ブラウザをリロードするとstateがリセットされるため、フローは最初からやり直しになります。
- **group_session_averagesビュー**: sessions テーブルの `status = 'completed'` かつ `group_id IS NOT NULL` のレコードのみ集計対象です。
