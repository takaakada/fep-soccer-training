# app.py への追記内容

Inflexion Index の `app.py` を開いて、以下の2箇所を追記してください。

---

## 追記箇所 1：インポート行（他の Blueprint インポートの近く）

```python
from core.training_bp import training_bp
```

## 追記箇所 2：Blueprint 登録（他の register_blueprint の近く）

```python
app.register_blueprint(training_bp)
```

---

## 追記後のイメージ（app.py の例）

```python
from flask import Flask
# ... 既存のインポート ...
from core.graphs_bp import graphs_bp       # ← 既存
from core.training_bp import training_bp   # ← ★ 追加

app = Flask(__name__)
# ... 既存の設定 ...
app.register_blueprint(graphs_bp)          # ← 既存
app.register_blueprint(training_bp)        # ← ★ 追加
```

---

## 確認ポイント

追記後に以下で動作確認：

```bash
heroku logs --tail --app inflexion-index-e231d56a5394
```

エラーなく起動すれば OK。
