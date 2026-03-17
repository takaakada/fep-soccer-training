"""
FEP Soccer Training — Heroku 側 API エンドポイント追加スニペット
================================================================
【構成】
  - 既存 Supabase プロジェクト : Inflexion Index のデータ（FE評価）
  - 新規 Supabase プロジェクト : FEP Training のデータ（本ファイルで接続）

  両プロジェクトの Google OAuth に同じ Google アカウントでログインすると
  メールアドレスが共通キーになり、2つのデータを統合できます。

依存パッケージ (requirements.txt に追加):
  supabase>=2.0.0
  PyJWT>=2.0.0
  cryptography

Heroku Config Vars（heroku config:set で設定）:
  # ── 既存プロジェクト（Inflexion Index）──
  SUPABASE_URL          = https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY  = eyJhbGciOiJIUzI1NiIs...   # service_role キー
  SUPABASE_JWT_SECRET   = <既存プロジェクトの JWT Secret>

  # ── 新規プロジェクト（FEP Training App）──
  TRAINING_SUPABASE_URL         = https://yyyy.supabase.co
  TRAINING_SUPABASE_SERVICE_KEY = eyJhbGciOiJIUzI1NiIs...   # training側 service_role
  TRAINING_SUPABASE_JWT_SECRET  = <新規プロジェクトの JWT Secret>
"""

import os
import jwt
from functools import wraps
from flask import Blueprint, jsonify, request, g
from supabase import create_client, Client

# ──────────────────────────────────────────────────────────────
#  Supabase クライアント（2プロジェクト）
# ──────────────────────────────────────────────────────────────

# 既存：Inflexion Index（FE評価）
sb_inflexion: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

# 新規：FEP Training App
sb_training: Client = create_client(
    os.environ["TRAINING_SUPABASE_URL"],
    os.environ["TRAINING_SUPABASE_SERVICE_KEY"],
)

blueprint_prefix = "/api/training"
training_bp = Blueprint("training", __name__, url_prefix=blueprint_prefix)


# ──────────────────────────────────────────────────────────────
#  JWT 認証デコレーター
#
#  フロントエンドは「どちらの Supabase のトークンか」を
#  Authorization ヘッダーで送ります。
#  Training App の index.html は Training Supabase の JWT を送るため
#  TRAINING_SUPABASE_JWT_SECRET で検証します。
# ──────────────────────────────────────────────────────────────
def require_training_auth(f):
    """Training App（新規 Supabase）の JWT を検証"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "認証が必要です"}), 401

        token = auth_header.split(" ", 1)[1]
        jwt_secret = os.environ.get("TRAINING_SUPABASE_JWT_SECRET", "")

        try:
            payload = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
            g.training_user_id = payload["sub"]        # Training側 UUID
            g.user_email       = payload.get("email", "")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "トークンの有効期限が切れています"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"無効なトークン: {e}"}), 401

        return f(*args, **kwargs)
    return decorated


# ──────────────────────────────────────────────────────────────
#  GET /api/training/sessions
#  Training App のセッション一覧
# ──────────────────────────────────────────────────────────────
@training_bp.route("/sessions", methods=["GET"])
@require_training_auth
def get_sessions():
    res = (
        sb_training.table("training_sessions")
        .select("*")
        .eq("user_id", g.training_user_id)
        .order("saved_at", desc=True)
        .execute()
    )
    return jsonify({"sessions": res.data}), 200


# ──────────────────────────────────────────────────────────────
#  GET /api/training/weeklies
#  週間まとめ一覧
# ──────────────────────────────────────────────────────────────
@training_bp.route("/weeklies", methods=["GET"])
@require_training_auth
def get_weeklies():
    res = (
        sb_training.table("training_weeklies")
        .select("*")
        .eq("user_id", g.training_user_id)
        .order("saved_at", desc=True)
        .execute()
    )
    return jsonify({"weeklies": res.data}), 200


# ──────────────────────────────────────────────────────────────
#  GET /api/training/summary
#  結果ページ統合用：FEP Training + Inflexion Index を1レスポンスで返す
#
#  2つの Supabase プロジェクトは別 UUID を持つため、
#  共通キーとして「メールアドレス」で Inflexion 側ユーザーを検索します。
# ──────────────────────────────────────────────────────────────
@training_bp.route("/summary", methods=["GET"])
@require_training_auth
def get_summary():
    email = g.user_email

    # ① FEP Training セッション集計（新規 Supabase）
    sessions_res = (
        sb_training.table("training_sessions")
        .select("total_score, max_score, session_date, role, grade")
        .eq("user_id", g.training_user_id)
        .order("session_date", desc=True)
        .execute()
    )
    sessions = sessions_res.data or []

    total_sessions = len(sessions)
    avg_pct = 0.0
    if total_sessions > 0:
        valid = [s for s in sessions if (s.get("max_score") or 0) > 0]
        if valid:
            avg_pct = round(
                sum(s["total_score"] / s["max_score"] * 100 for s in valid) / len(valid),
                1,
            )

    # ② 週間まとめ 5軸の平均（新規 Supabase）
    weeklies_res = (
        sb_training.table("training_weeklies")
        .select("axes")
        .eq("user_id", g.training_user_id)
        .order("saved_at", desc=True)
        .limit(8)
        .execute()
    )
    weeklies = weeklies_res.data or []
    axis_keys = ["jikoYosoku", "gosaNinshiki", "shuseiryoku", "tekioryoku", "kyochosei"]
    axis_avg = {k: None for k in axis_keys}
    if weeklies:
        totals = {k: 0 for k in axis_keys}
        for w in weeklies:
            axes = w.get("axes") or {}
            for k in axis_keys:
                totals[k] += axes.get(k, 0)
        axis_avg = {k: round(totals[k] / len(weeklies), 2) for k in axis_keys}

    # ③ Inflexion Index の最新スコアをメールで検索（既存 Supabase）
    #    ※ テーブル名・カラム名は既存アプリに合わせて変更してください
    latest_fe = None
    if email:
        try:
            # まず auth.users からメールで inflexion 側 user_id を取得
            users_res = sb_inflexion.auth.admin.list_users()
            inflexion_uid = next(
                (u.id for u in (users_res or []) if u.email == email),
                None,
            )
            if inflexion_uid:
                fe_res = (
                    sb_inflexion.table("fe_evaluations")   # ← 既存テーブル名に変更
                    .select("score, evaluated_at")
                    .eq("user_id", inflexion_uid)
                    .order("evaluated_at", desc=True)
                    .limit(1)
                    .execute()
                )
                latest_fe = fe_res.data[0] if fe_res.data else None
        except Exception as e:
            # Inflexion データ取得失敗でも Training データは返す
            print(f"[WARNING] Inflexion Index データ取得失敗: {e}")

    return jsonify({
        "user_email": email,
        "fep_training": {
            "total_sessions": total_sessions,
            "avg_score_pct":  avg_pct,
            "recent_date":    sessions[0]["session_date"] if sessions else None,
            "axis_averages":  axis_avg,
        },
        "inflexion_index": {
            "latest_score": latest_fe["score"]        if latest_fe else None,
            "evaluated_at": latest_fe["evaluated_at"] if latest_fe else None,
        },
    }), 200


# ──────────────────────────────────────────────────────────────
#  既存 Flask アプリへの登録（app.py / __init__.py に追記）
# ──────────────────────────────────────────────────────────────
#
#   from heroku_api_snippet import training_bp
#   app.register_blueprint(training_bp)
#
# ──────────────────────────────────────────────────────────────
#  フロントエンド（index.html）から呼ぶ場合のサンプル
# ──────────────────────────────────────────────────────────────
#
#   // Training Supabase のセッションを取得してヘッダーに付与
#   const { data: { session } } = await sb.auth.getSession();
#   const token = session?.access_token;
#
#   const res = await fetch(
#     'https://inflexion-index-e231d56a5394.herokuapp.com/api/training/summary',
#     { headers: { 'Authorization': 'Bearer ' + token } }
#   );
#   const data = await res.json();
#   // data.fep_training.avg_score_pct → FEP スコア
#   // data.inflexion_index.latest_score → FE 評価スコア
