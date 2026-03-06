# mcp-ngrok

ngrok トンネルを MCP ツール経由で制御する MCP サーバーです。

## 前提条件

- [ngrok CLI](https://ngrok.com/download) がインストール済みであること
- `NGROK_AUTHTOKEN` 環境変数に ngrok の認証トークンが設定されていること（任意）


## Claude Code への登録

```shell
git clone git@github.com:kamataryo/mcp-ngrok.git
cd mcp-ngrok
pnpm install
pnpm build
pnpm link --global
claude mcp add ngrok -- mcp-ngrok
```

## 提供するツール

| ツール名 | 説明 | パラメータ |
|---------|------|-----------|
| `ngrok_start` | プロキシ + ngrok 起動 | `upstream: string`, `gitignoreMiddleware?: boolean` |
| `ngrok_stop` | プロキシ + ngrok 停止 | なし |
| `ngrok_status` | 公開 URL・upstream・稼働状態を取得 | なし |

## アーキテクチャ

```
インターネット
    │
    ▼
ngrok (公開 URL)
    │
    ▼
内蔵プロキシサーバー (localhost:18080)
    │  [blockDotGitMiddleware]  ← 常時有効
    │  [gitignoreMiddleware]    ← オプション
    │
    ▼
upstream (例: http://localhost:3000)
```

リクエスト検査は ngrok Web UI (`http://localhost:4040`) で確認できます。

## ミドルウェア

プロキシサーバーはミドルウェアチェーンでリクエストを処理します。

### blockDotGitMiddleware（常時有効）

`/.git` 以下へのアクセスを常に **403 Forbidden** で拒否します。
`.git` ディレクトリには git 履歴・認証情報・設定が含まれるため、常にブロックされます。

```
GET /.git/config  → 403 Forbidden
GET /.git/        → 403 Forbidden
GET /index.html   → upstream へ転送
```

### gitignoreMiddleware（オプション）

`ngrok_start` の `gitignoreMiddleware: true` を指定すると有効になります。

起動時に upstream の `/.gitignore` を取得し（取得できない場合はフィルタなし）、
記載されたパターンにマッチするパスへのアクセスを **403 Forbidden** で拒否します。
`.gitignore` のキャッシュは `ngrok_stop` まで保持され、再起動時に再取得されます。

```
# upstream の /.gitignore に node_modules が記載されている場合
GET /node_modules/lodash/index.js  → 403 Forbidden
GET /index.html                    → upstream へ転送
```
