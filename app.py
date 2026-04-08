"""
FEP Soccer Training App — Flask サーバー
=========================================
- 静的ファイル（HTML/CSS/JS）を配信する
- Heroku 上で gunicorn で起動する
- /api/menus : Google Sheets からメニューマスタを取得して返す
"""

import os
import csv
import io
import time
import logging
from flask import Flask, send_from_directory, send_file, jsonify

try:
    import requests as _requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False

logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder=".", static_url_path="")
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # 開発中はキャッシュ無効

# ── Google Sheets 公開CSV URL ─────────────────────────────────
# Heroku Config Vars に設定する:
#   MENU_SHEET_URL = https://docs.google.com/spreadsheets/d/{ID}/pub?output=csv&gid={GID}
# ローカル開発時は .env や環境変数で上書き可能
MENU_SHEET_URL = os.environ.get("MENU_SHEET_URL", "")

# サーバー側キャッシュ（5分 TTL）
_menu_cache = {"data": None, "ts": 0}
CACHE_TTL = 300  # seconds


def _fetch_menus_from_sheet():
    """Google Sheets 公開CSV からメニューマスタを取得してリストで返す"""
    if not MENU_SHEET_URL:
        return None
    if not HAS_REQUESTS:
        logger.warning("requests library not installed — skipping Sheet fetch")
        return None

    r = _requests.get(MENU_SHEET_URL, timeout=8)
    r.raise_for_status()
    r.encoding = "utf-8"

    reader = csv.DictReader(io.StringIO(r.text))
    menus = []
    for row in reader:
        # is_active 列がある場合のみチェック（新テンプレートでは省略可）
        is_active = row.get("is_active", "").strip().upper()
        if is_active and is_active != "TRUE":
            continue

        # steps をセミコロン区切りでリストに変換（旧: | 区切りもサポート）
        raw_steps = row.get("steps", "")
        delimiter = ";" if ";" in raw_steps else "|"
        row["steps_list"] = [s.strip() for s in raw_steps.split(delimiter) if s.strip()]

        # coaching_points もセミコロン区切りでリストに変換
        raw_cp = row.get("coaching_points", "")
        cp_delim = ";" if ";" in raw_cp else "|"
        row["coaching_points_list"] = [s.strip() for s in raw_cp.split(cp_delim) if s.strip()]

        # channels をカンマ区切りでリストに変換
        raw_ch = row.get("channels", "")
        row["channels_list"] = [s.strip() for s in raw_ch.split(",") if s.strip()]

        # purpose をカンマ区切りでリストに変換
        raw_purpose = row.get("purpose", "")
        row["purpose_list"] = [s.strip() for s in raw_purpose.split(",") if s.strip()]

        # time (新) / duration_min (旧) を数値に統一
        time_val = row.get("time", "") or row.get("duration_min", "")
        try:
            row["time"] = int(time_val or 0)
        except ValueError:
            row["time"] = 0
        row["duration_min"] = row["time"]  # 後方互換

        menus.append(row)
    return menus


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


# ── メニューマスタ API ────────────────────────────────────────
@app.route("/api/menus")
def api_menus():
    """
    Google Sheets のメニューマスタを JSON で返す。
    サーバー側で CACHE_TTL 秒キャッシュする。

    Response:
      {
        "menus": [ {menu_id, menu_name, age_group, position_group, ...}, ... ],
        "source": "sheet" | "cache" | "unavailable",
        "cached_at": <unix timestamp>
      }
    """
    now = time.time()
    stale = now - _menu_cache["ts"] > CACHE_TTL

    if stale:
        try:
            fresh = _fetch_menus_from_sheet()
            if fresh is not None:
                _menu_cache["data"] = fresh
                _menu_cache["ts"] = now
                source = "sheet"
            else:
                source = "unavailable"
        except Exception as e:
            logger.warning(f"Sheet fetch failed: {e}")
            source = "cache" if _menu_cache["data"] else "unavailable"
    else:
        source = "cache"

    menus = _menu_cache["data"] or []
    return jsonify({
        "menus": menus,
        "source": source,
        "cached_at": _menu_cache["ts"],
    })


# ── キャッシュ強制リフレッシュ（管理用）──────────────────────
@app.route("/api/menus/refresh")
def api_menus_refresh():
    """キャッシュを無効化して即座に再取得する"""
    _menu_cache["ts"] = 0
    return api_menus()


# ── ヘルスチェック（Heroku が使う）──────────────────────────
@app.route("/health")
def health():
    return {"status": "ok"}, 200


# ── ローカル起動用 ───────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
