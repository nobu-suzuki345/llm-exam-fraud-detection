# LLM Exam Fraud Detection System

LLMを活用したオンライン英語テストの不正検知システムです。

## ✨ 実験結果

- **誤検知を31%削減**: 行動ログのみ80% → LLM使用55%
- **AI翻訳使用を検出**: 67%で正しくflagged
- **適切な閾値設定**: 65%以上でflaggedにより、不正を検出しつつ無実の人を守る

| ケース | 検知方式 | スコア | 判定 | 評価 |
|:---|:---|:---:|:---|:---|
| 不正なし | LLM不使用 | 80% | flagged | ❌ 誤検知 |
| 不正なし | LLM使用 | 55% | 完了 | ✅ 正しい |
| AI翻訳使用 | LLM使用 | 67% | flagged | ✅ 正しく検出 |

## 🎯 主な機能

- **リアルタイム行動ログ収集**: ウィンドウ切り替え、コピー操作、マウスの動きなどを記録
- **LLM分析**: GPT-5-miniによる解答内容と機械翻訳の検出
- **不正リスクスコア**: 行動パターン（30%）とLLM分析（70%）を統合した総合評価
- **リアルタイムダッシュボード**: 教師が受験者の状況を監視

## 🛠️ 技術スタック

- **フロントエンド**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes
- **データベース**: SQLite + Prisma
- **LLM**: OpenAI GPT-5-mini
- **デプロイ**: Vercel対応

## 📋 必要な環境

- Node.js 18以上
- npm または yarn
- OpenAI APIキー

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd kyouiku
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.local`ファイルを作成し、以下を設定：

```bash
# OpenAI API設定
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-5-mini

# データベース
DATABASE_URL="file:./dev.db"

# LLM使用の有無（オプション）
USE_LLM=true  # false にすると統計分析のみ（コスト0円）
```

### LLMの有効/無効切り替え

| 設定 | コスト | 精度 | 用途 |
|:---|:---|:---|:---|
| `USE_LLM=true` | 約0.6円/人 | ★★★★★ | 本番環境、高精度が必要 |
| `USE_LLM=false` | 無料 | ★★★☆☆ | 開発環境、コスト削減 |

### 4. データベースのセットアップ

```bash
# マイグレーション実行
npx prisma migrate dev --name init

# シードデータ投入（5問の英語問題）
npx prisma db seed
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 でアクセス可能です。

## 📚 使い方

### 受験者として

1. トップページで名前を入力
2. テストを開始（5問の英語問題）
3. 解答を入力して次へ進む
4. 全問完了後、結果画面へ

### 教師として

1. `/dashboard` にアクセス
2. 受験者のリアルタイム状況を確認
3. 不正リスクスコアと警告を確認

## 🗂️ プロジェクト構造

```
kyouiku/
├── app/                    # Next.js App Router
│   ├── page.tsx           # トップページ
│   ├── test/page.tsx      # テスト画面
│   ├── dashboard/page.tsx # ダッシュボード
│   └── api/               # APIルート
├── components/            # Reactコンポーネント
│   ├── BehaviorTracker.tsx
│   └── QuestionCard.tsx
├── lib/                   # ユーティリティ
│   ├── prisma.ts
│   ├── llm.ts
│   └── analyzer.ts
├── prisma/               # データベース
│   ├── schema.prisma
│   ├── seed.ts
│   └── dev.db
├── types/                # TypeScript型定義
│   └── index.ts
└── docs/                 # ドキュメント
```

## 📖 ドキュメント

詳細なドキュメントは`docs/`フォルダにあります：

- [プロジェクト概要](./docs/README.md)
- [データベース設計](./docs/database.md)
- [ページ設計](./docs/pages.md)
- [API設計](./docs/api.md)
- [行動トラッキング](./docs/behavior-tracking.md)
- [LLM統合](./docs/llm-integration.md)
- [サンプル問題](./docs/sample-questions.md)

## 🧪 テスト

### 不正行動のシミュレーション

1. 問題文を選択してコピー（`Ctrl+C`）
2. 別のウィンドウに切り替え（`Alt+Tab`）
3. 数秒後に戻って解答をペースト（`Ctrl+V`）

→ ダッシュボードで高リスクスコアが表示されます

## 💰 コスト

- **開発環境**: 完全無料
- **OpenAI API**: 約0.01円/回（100回で約1円）
- **Vercel**: 無料枠で十分

## ⚠️ 注意事項

### 倫理的配慮

- このシステムは**補助ツール**であり、最終判断は人間が行うべき
- 誤検知のリスクを考慮すること
- プライバシーポリシーの整備が必要

### 本番利用時の追加要件

- 認証システムの実装（Clerk等）
- データベースのスケーリング（PostgreSQL等）
- ログの暗号化
- GDPR/個人情報保護法対応

## 🔧 トラブルシューティング

### データベースがロックされる

```bash
rm prisma/dev.db
npx prisma migrate dev
npx prisma db seed
```

### OpenAI APIエラー

`.env`ファイルの`OPENAI_API_KEY`が正しく設定されているか確認してください。

### ポート3000が使用中

```bash
npm run dev -- -p 3001
```

## 📄 ライセンス

MIT License

---

**商用利用時は適切なセキュリティ対策を実装してください。**
