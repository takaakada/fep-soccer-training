# requirements.txt への追記内容

Inflexion Index の `requirements.txt` に以下を追加してください。
（すでに入っている場合はスキップ）

```
supabase>=2.0.0
PyJWT>=2.0.0
cryptography
```

---

# Heroku Config Vars の設定

Heroku ダッシュボード → **Inflexion Index アプリ** → Settings → Config Vars

以下の3つを追加してください：

| キー | 値の取得場所 |
|------|-------------|
| `TRAINING_SUPABASE_URL` | Supabase (fep-soccer-training) → Settings → API → Project URL |
| `TRAINING_SUPABASE_SERVICE_KEY` | Supabase (fep-soccer-training) → Settings → API → service_role (secret) |
| `TRAINING_SUPABASE_JWT_SECRET` | Supabase (fep-soccer-training) → Settings → API → JWT Secret |

また、FEP Training App の Heroku URL が確定したら：

| キー | 値 |
|------|-----|
| `FEP_TRAINING_ORIGIN` | `https://fep-soccer-training.herokuapp.com`（実際の URL に変更） |

---

# Inflexion Index 側のテーブル名確認

`core/training_bp.py` の以下の行を、
**Inflexion Index の実際のテーブル名・カラム名**に合わせて変更してください：

```python
# 変更前（デフォルト）
sb_inflexion.table("fe_evaluations")
.select("score, evaluated_at")

# 変更後（例）
sb_inflexion.table("実際のテーブル名")
.select("実際のスコアカラム, 実際の日付カラム")
```

Inflexion Index の Supabase で使っているテーブル名・カラム名を教えてもらえれば、
ここも正確に修正します。
