"""
FEP Soccer Training App — Flask サーバー
=========================================
- 静的ファイル（HTML/CSS/JS）を配信する
- Heroku 上で gunicorn で起動する
"""

import os
from flask import Flask, send_from_directory, send_file

app = Flask(__name__, static_folder=".", static_url_path="")


# ── 静的ファイル配信 ───────────────────────────────────────
@app.route("/")
def index():
    return send_file("index.html")


@app.route("/css/<path:filename>")
def css(filename):
    return send_from_directory("css", filename)


@app.route("/js/<path:filename>")
def js(filename):
    return send_from_directory("js", filename)


@app.route("/pages/<path:filename>")
def pages(filename):
    return send_from_directory("pages", filename)


# ── ヘルスチェック（Heroku が使う）──────────────────────────
@app.route("/health")
def health():
    return {"status": "ok"}, 200


# ── ローカル起動用 ───────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
