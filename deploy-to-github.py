#!/usr/bin/env python3
"""
FEP Soccer Training — GitHub Pages デプロイスクリプト
使い方: python3 deploy-to-github.py
"""

import urllib.request
import urllib.error
import json
import base64
import getpass
import os

USERNAME = "takaakada"
REPO     = "fep-soccer-training"
FILES    = ["index.html"]
BRANCH   = "main"

API_BASE = f"https://api.github.com/repos/{USERNAME}/{REPO}"


def api(method, path, token, data=None, base=None):
    url = (base or API_BASE) + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method, headers={
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        "User-Agent": "fep-soccer-deploy",
    })
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()), r.status
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read()), e.code
        except Exception:
            return {}, e.code


def create_repo_if_needed(token):
    _, status = api("GET", "", token)
    if status == 200:
        print(f"  ✅ リポジトリ既存: github.com/{USERNAME}/{REPO}")
        return True
    if status == 404:
        print(f"  📦 リポジトリを新規作成します: {REPO} ...")
        data = {
            "name": REPO,
            "description": "FEP Soccer Training App — Free Energy Principle × Football",
            "private": False,
            "auto_init": True,
        }
        result, s = api("POST", "/user/repos", token,
                        data=data, base="https://api.github.com")
        if s in (200, 201):
            print(f"  ✅ 作成完了: github.com/{USERNAME}/{REPO}")
            import time; time.sleep(2)   # GitHub が初期化するのを少し待つ
            return True
        else:
            print(f"  ❌ 作成失敗 (HTTP {s}): {result.get('message','')}")
            return False
    print(f"  ❌ アクセスエラー (HTTP {status})")
    return False


def upload_file(filename, token):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    filepath = os.path.join(script_dir, filename)
    if not os.path.exists(filepath):
        print(f"  ❌ ファイルが見つかりません: {filepath}")
        return False

    with open(filepath, "rb") as f:
        content = base64.b64encode(f.read()).decode()

    # 既存ファイルの SHA を取得（更新時に必要）
    existing, status = api("GET", f"/contents/{filename}", token)
    sha = existing.get("sha") if status == 200 else None

    payload = {
        "message": f"Deploy: update {filename}",
        "content": content,
        "branch": BRANCH,
    }
    if sha:
        payload["sha"] = sha

    result, status = api("PUT", f"/contents/{filename}", token, payload)
    if status in (200, 201):
        return True
    print(f"  ❌ アップロード失敗 (HTTP {status}): {result.get('message','')}")
    return False


def enable_pages(token):
    data = {"source": {"branch": BRANCH, "path": "/"}}
    _, status = api("POST", "/pages", token, data)
    if status in (200, 201):
        return True
    # すでに有効な場合は PUT で更新
    _, status = api("PUT", "/pages", token, data)
    return status in (200, 201, 204)


# ── メイン ────────────────────────────────────────────────────
print("=" * 54)
print("  ⚽ FEP Soccer Training — GitHub Pages デプロイ")
print("=" * 54)
print()
print("GitHub Personal Access Token が必要です。")
print("まだお持ちでない場合:")
print("  https://github.com/settings/tokens/new")
print("  → Expiration: 90 days")
print("  → Scopes: ✅ repo  ✅ workflow")
print()

TOKEN = getpass.getpass("GitHub PAT を入力 (入力は非表示): ")
if not TOKEN.strip():
    print("❌ トークンが空です。終了します。")
    exit(1)
TOKEN = TOKEN.strip()

print()
print("📋 リポジトリを確認・作成中...")
if not create_repo_if_needed(TOKEN):
    print()
    print("❌ リポジトリへのアクセスに失敗しました。")
    print("   トークンに 'repo' スコープがあるか確認してください。")
    exit(1)

print()
print("📤 ファイルをアップロード中...")
all_ok = True
for f in FILES:
    size_kb = os.path.getsize(
        os.path.join(os.path.dirname(os.path.abspath(__file__)), f)
    ) // 1024
    print(f"  → {f} ({size_kb} KB) ...", end=" ", flush=True)
    ok = upload_file(f, TOKEN)
    print("✅" if ok else "❌")
    if not ok:
        all_ok = False

if not all_ok:
    print()
    print("❌ アップロードに失敗しました。終了します。")
    exit(1)

print()
print("🌐 GitHub Pages を有効化中...")
pages_ok = enable_pages(TOKEN)
if pages_ok:
    print("  ✅ GitHub Pages 有効化完了")
else:
    print("  ⚠️  自動有効化に失敗しました。手動で設定してください:")
    print(f"     https://github.com/{USERNAME}/{REPO}/settings/pages")
    print("     Source → Deploy from a branch → main / (root) → Save")

print()
print("=" * 54)
print("✅ デプロイ完了！")
print()
print("  アプリURL（反映まで1〜2分かかります）:")
print(f"  👉 https://{USERNAME}.github.io/{REPO}/")
print()
print("  リポジトリ:")
print(f"  👉 https://github.com/{USERNAME}/{REPO}")
print("=" * 54)
