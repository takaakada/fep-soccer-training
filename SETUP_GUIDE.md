# FEP Soccer Training × Inflexion Index — 接続セットアップガイド

## 全体構成

```
[index.html]  ──(Supabase JS)──▶  [Training Supabase]（新規）
                                         │
                                         ▼ JWT
[Heroku App]  ◀──(REST API)──────  [index.html]
     │
     ├─▶ [Training Supabase]  (service_role) → セッション・週間データ
     └─▶ [Inflexion Supabase] (service_role) → FE評価スコア
```

---

## Step 1 — 新規 Supabase プロジェクト作成

1. https://supabase.com → **New Project**
2. プロジェクト名: `fep-soccer-training`（任意）
3. リージョン: **Northeast Asia (Tokyo)** 推奨
4. パスワードを設定して **Create new project**
5. 作成完了後、以下をメモ：
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon / public キー**: Settings → API → `anon`
   - **service_role キー**: Settings → API → `service_role`（秘密）
   - **JWT Secret**: Settings → API → JWT Secret

---

## Step 2 — テーブル作成

Supabase ダッシュボード → **SQL Editor** で `supabase_schema.sql` を貼り付けて実行。

作成されるテーブル:
- `training_sessions` — 評価シートのセッション記録
- `training_weeklies` — 週間まとめシート
- RLS ポリシー（本人データのみ読み書き）
- `training_summary_view` — 管理用集計ビュー

---

## Step 3 — Google OAuth 設定

### Supabase 側（新規プロジェクト）
1. Authentication → Providers → **Google** → Enable
2. Client ID と Client Secret を入力
3. **Redirect URL** をコピー: `https://xxxx.supabase.co/auth/v1/callback`

### Google Cloud Console 側
1. **APIs & Services → 認証情報** → 既存の OAuth クライアントを開く
2. 承認済みリダイレクト URI に追加:
   ```
   https://xxxx.supabase.co/auth/v1/callback   ← 新規 Training プロジェクト
   ```
   ※ 既存の Inflexion Index 用 URI はそのまま残す

---

## Step 4 — index.html の設定（2行だけ）

`index.html` を開き、先頭付近の設定値を書き換えます:

```js
const SUPABASE_URL  = 'https://xxxx.supabase.co';       // Step 1 でメモした URL
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIs...';        // anon / public キー
const REDIRECT_URL  = 'https://your-domain.com/';       // 本番 URL（またはそのまま）
```

---

## Step 5 — Heroku 環境変数の追加

```bash
# Training App（新規）
heroku config:set TRAINING_SUPABASE_URL=https://xxxx.supabase.co
heroku config:set TRAINING_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...
heroku config:set TRAINING_SUPABASE_JWT_SECRET=your-jwt-secret

# 既存の SUPABASE_URL / SUPABASE_SERVICE_KEY は変更不要
```

---

## Step 6 — Heroku アプリに Blueprint を追加

1. `heroku_api_snippet.py` を既存アプリのルートに配置
2. `requirements.txt` に追記:
   ```
   supabase>=2.0.0
   PyJWT>=2.0.0
   cryptography
   ```
3. メインの Flask ファイル（`app.py` など）に追記:
   ```python
   from heroku_api_snippet import training_bp
   app.register_blueprint(training_bp)
   ```
4. `heroku_api_snippet.py` 内の以下のテーブル名を既存アプリに合わせて変更:
   ```python
   sb_inflexion.table("fe_evaluations")   # ← 既存の FE評価テーブル名に変更
   ```

---

## 完成後の動作確認

| 操作 | 期待される動作 |
|------|----------------|
| index.html を開く | ヘッダー右に「ログイン」バッジが表示 |
| Google でログイン | Training Supabase でセッションが作成される |
| 評価シート → 記録を保存 | Supabase の `training_sessions` に挿入 |
| 記録・履歴タブ | Supabase からデータを取得して表示 |
| Heroku `/api/training/summary` | FEP スコア + FE スコアが統合レスポンスで返る |

---

## よくある問題

**ログイン後にリダイレクトが戻らない**
→ `REDIRECT_URL` が index.html のホスティング先と一致しているか確認。

**CORS エラー（Heroku API 呼び出し時）**
→ Heroku の Flask アプリに `flask-cors` を追加:
```python
from flask_cors import CORS
CORS(app, resources={r"/api/*": {"origins": ["https://your-training-app.com"]}})
```

**Inflexion のスコアが null になる**
→ `heroku_api_snippet.py` の `fe_evaluations` テーブル名と `score` カラム名を既存に合わせて修正。
