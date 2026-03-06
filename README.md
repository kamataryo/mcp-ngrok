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
| `ngrok_start` | プロキシ + ngrok 起動 | `upstream: string` (例: `"http://localhost:3000"`) |
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
    │
    ▼
upstream (例: http://localhost:3000)
```

リクエスト検査は ngrok Web UI (`http://localhost:4040`) で確認できます。
