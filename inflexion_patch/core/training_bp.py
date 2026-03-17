"""
core/training_bp.py
====================
FEP Soccer Training App との API 連携 Blueprint

【登録方法】 app.py に以下を追記するだけ:
    from core.training_bp import training_bp
    app.register_blueprint(training_bp)

【Heroku Config Vars】(Inflexion Index の Settings > Config Vars に追加)
    TRAINING_SUPABASE_URL         = https://gypuobgbulrmlgljjrsq.supabase.co
    TRAINING_SUPABASE_SERVICE_KEY = <FEP Training の service_role キー>
    TRAINING_SUPABASE_JWT_SECRET  = <FEP Training の JWT Secret>
    ※ 上2つは Supabase > Settings > API で確認できます

【エンドポイント一覧】
    GET  /api/training/summary   → FEP + FE スコアを統合して返す
    GET  /api/training/sessions  → FEP トレーニングセッション一覧
    GET  /api/training/weeklies  → 週間まとめ一覧
"""

import os
import jwt
from functools import wraps
from flask import Blueprint, jsonify, request, g
from supabase import create_client, Client

# ──────────────────────────────────────────────────────────────
#  Supabase クライアント（2プロジェクト）
#  - sb_inflexion : 既存 Inflexion Index（FE評価データ）
#  - sb_training  : FEP Soccer Training（トレーニングデータ）
# ──────────────────────────────────────────────────────────────
sb_inflexion: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

sb_training: Client = create_client(
    os.environ["TRAINING_SUPABASE_URL"],
    os.environ["TRAINING_SUPABASE_SERVICE_KEY"],
)

training_bp = Blueprint("training", __name__, url_prefix="/api/training")


# ──────────────────────────────────────────────────────────────
#  JWT 認証デコレーター
#  FEP Training App の Supabase トークンを検証する
# ──────────────────────────────────────────────────────────────
def require_training_auth(f):
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
            g.training_user_id = payload["sub"]
            g.user_email       = payload.get("email", "")
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "トークンの有効期限が切れています"}), 401
        except jwt.InvalidTokenError as e:
            return jsonify({"error": f"無効なトークン: {e}"}), 401

        return f(*args, **kwargs)
    return decorated


# ──────────────────────────────────────────────────────────────
#  CORS ヘッダー（FEP Training App からのリクエストを許可）
# ──────────────────────────────────────────────────────────────
FEP_ORIGIN = os.environ.get(
    "FEP_TRAINING_ORIGIN",
    "https://fep-soccer-training.herokuapp.com"
)

@training_bp.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"]  = FEP_ORIGIN
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

@training_bp.route("/<path:dummy>", methods=["OPTIONS"])
@training_bp.route("/", methods=["OPTIONS"])
def handle_options(dummy=None):
    return "", 204


# ──────────────────────────────────────────────────────────────
#  GET /api/training/sessions
#  FEP トレーニングセッション一覧
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
#  FEP Training + Inflexion Index のスコアを統合して返す
#
#  2つの Supabase プロジェクトは UUID が異なるため、
#  共通キー「メールアドレス」で Inflexion 側ユーザーを特定します
# ──────────────────────────────────────────────────────────────
@training_bp.route("/summary", methods=["GET"])
@require_training_auth
def get_summary():
    email = g.user_email

    # ① FEP Training セッション集計
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

    # ② 週間まとめ 5軸の平均（直近8件）
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

    # ③ Inflexion Index の最新スコアをメールアドレスで検索
    #    ※ テーブル名は既存の Inflexion Index に合わせて変更してください
    latest_fe = None
    if email:
        try:
            users_res = sb_inflexion.auth.admin.list_users()
            inflexion_uid = next(
                (u.id for u in (users_res or []) if u.email == email),
                None,
            )
            if inflexion_uid:
                # ↓ テーブル名・カラム名を Inflexion Index の実際の名前に変更してください
                fe_res = (
                    sb_inflexion.table("fe_evaluations")
                    .select("score, evaluated_at")
                    .eq("user_id", inflexion_uid)
                    .order("evaluated_at", desc=True)
                    .limit(1)
                    .execute()
                )
                latest_fe = fe_res.data[0] if fe_res.data else None
        except Exception as e:
            # Inflexion データ取得失敗でも FEP データは返す
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
