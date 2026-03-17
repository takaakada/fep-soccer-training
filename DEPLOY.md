# FEP Soccer Training — デプロイ手順

## 全体の流れ
```
① GitHub にプッシュ → ② Heroku でデプロイ → ③ Inflexion Index に API 追加
```

---

## ① GitHub にプッシュ

ターミナルで `71.Training_app` フォルダに移動して以下を実行：

```bash
cd ~/Dropbox/71.Training_app

# Git リポジトリを初期化
git init
git branch -M main

# GitHub リポジトリを紐付け（takaakada/fep-soccer-training）
git remote add origin https://github.com/takaakada/fep-soccer-training.git

# 全ファイルをステージ & コミット
git add .
git commit -m "initial commit: FEP Soccer Training App"

# プッシュ
git push -u origin main
```

> GitHub に Personal Access Token（PAT）が必要な場合：
> GitHub → Settings → Developer Settings → Personal access tokens → Generate new token
> パスワード欄にトークンを貼り付ける

---

## ② Heroku デプロイ

### 2-1. Heroku CLI のインストール（未インストールの場合）
```bash
brew tap heroku/brew && brew install heroku
heroku login
```

### 2-2. Heroku アプリを作成
```bash
cd ~/Dropbox/71.Training_app

heroku create fep-soccer-training
```
> すでに名前が使われている場合は別の名前に変更する
> 例: `heroku create fep-soccer-training-app`

### 2-3. GitHub と Heroku を接続（自動デプロイ）
Heroku ダッシュボード（https://dashboard.heroku.com）で:
1. アプリ名をクリック
2. `Deploy` タブ → `Deployment method: GitHub`
3. `fep-soccer-training` リポジトリを検索して Connect
4. `Enable Automatic Deploys` をオン → `Deploy Branch` をクリック

### 2-4. または CLI で直接デプロイ
```bash
heroku git:remote -a fep-soccer-training
git push heroku main
```

### 2-5. 動作確認
```bash
heroku open
# または
heroku logs --tail
```

---

## ③ Inflexion Index に API エンドポイントを追加

> ⚠️ Inflexion Index アプリのリポジトリで作業します

### 3-1. `heroku_api_snippet.py` の内容を Inflexion Index に追記

Inflexion Index の `app.py`（またはメインファイル）に以下を追加：

```python
# heroku_api_snippet.py の training_bp を登録
from heroku_api_snippet import training_bp
app.register_blueprint(training_bp)
```

> `heroku_api_snippet.py` を Inflexion Index のリポジトリにコピーする

### 3-2. Inflexion Index の requirements.txt に追記
```
supabase>=2.0.0
PyJWT>=2.0.0
cryptography
```

### 3-3. Inflexion Index の Heroku Config Vars を設定
Heroku ダッシュボード → Inflexion Index → Settings → Config Vars：

| キー | 値 |
|------|-----|
| `TRAINING_SUPABASE_URL` | `https://gypuobgbulrmlgljjrsq.supabase.co` |
| `TRAINING_SUPABASE_SERVICE_KEY` | Supabase → Settings → API → service_role key |
| `TRAINING_SUPABASE_JWT_SECRET` | Supabase → Settings → API → JWT Secret |

### 3-4. テスト
ブラウザまたは curl で確認：
```bash
curl https://inflexion-index-e231d56a5394.herokuapp.com/api/training/summary \
  -H "Authorization: Bearer <Supabaseトークン>"
```

---

## ④ フロントエンドからの呼び出し確認

FEP Training App のページで DevTools Console に以下を入力：
```javascript
// ログイン後に実行
fetchTrainingSummary().then(d => console.log(d));
```

正常に動けば FEP スコアと Inflexion スコアが返ってきます。

---

## 設定値まとめ

| 項目 | 値 |
|------|-----|
| FEP Training GitHub | `takaakada/fep-soccer-training` |
| FEP Training Heroku URL | `https://fep-soccer-training.herokuapp.com`（予定） |
| FEP Training Supabase | `https://gypuobgbulrmlgljjrsq.supabase.co` |
| Inflexion Index Heroku URL | `https://inflexion-index-e231d56a5394.herokuapp.com` |
