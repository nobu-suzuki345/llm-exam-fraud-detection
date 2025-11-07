# 英語テスト不正検出システム (Kyouiku)

## 📖 プロジェクト概要

LLMを活用して、オンライン英語テストにおける不正行為をリアルタイムで検出するシステムです。
受験者の行動パターン（ウィンドウ切り替え、コピー操作、マウスの動きなど）と解答内容を分析し、不正リスクスコアを算出します。

## 🎯 目的

- LLMによる不正検出の実装
- プライバシーに配慮した監視システムの提案
- オンライン試験の公平性向上

## 🔑 主要機能

### 1. 受験者向け機能
- シンプルな英語テスト画面
- リアルタイム行動ログ収集（非侵襲的）
- スムーズなUX

### 2. 教師向け機能
- リアルタイムダッシュボード
- 不正リスクスコアの表示
- LLMによる分析結果の可視化

### 3. 分析機能
- 行動パターンの異常検知
- 機械翻訳検出（DeepL/Google翻訳パターン）
- 文体の一貫性チェック

## 🛠️ 技術スタック

| レイヤー | 技術 | 理由 |
|:---|:---|:---|
| **フロントエンド** | Next.js 14 (App Router), TypeScript, Tailwind CSS | モダンなReact開発 |
| **バックエンド** | Next.js API Routes | フロントエンドと統合、シンプル |
| **データベース** | SQLite + Prisma | ファイルベース、Git管理可能 |
| **リアルタイム通信** | ポーリング（2秒間隔） | シンプル、Vercel完結 |
| **LLM** | OpenAI GPT-5-mini | 高精度な文章分析 |
| **デプロイ** | Vercel（+ ローカルNode.js対応） | 無料、簡単 |

## 💰 コスト

- **開発環境**: 完全無料
- **本番環境**: OpenAI APIのみ従量課金（100回で約1円）
- **デプロイ**: Vercel無料枠で十分

## 📂 プロジェクト構造

```
kyouiku/
├── app/                    # Next.js App Router
│   ├── page.tsx           # トップページ（名前入力）
│   ├── test/
│   │   └── page.tsx       # テスト画面
│   ├── dashboard/
│   │   └── page.tsx       # 教師用ダッシュボード
│   └── api/
│       ├── analyze/
│       │   └── route.ts   # LLM分析API
│       ├── submit/
│       │   └── route.ts   # 解答送信API
│       └── students/
│           └── route.ts   # 受験者状況取得API
├── components/            # Reactコンポーネント
│   ├── BehaviorTracker.tsx    # 行動ログ収集
│   ├── QuestionCard.tsx       # 問題表示
│   └── RiskScoreDisplay.tsx   # リスクスコア表示
├── lib/                   # ユーティリティ
│   ├── prisma.ts         # Prismaクライアント
│   ├── llm.ts            # OpenAI API呼び出し
│   └── analyzer.ts       # 行動パターン分析
├── prisma/               # データベース
│   ├── schema.prisma     # スキーマ定義
│   ├── seed.ts           # サンプルデータ
│   └── dev.db            # SQLiteファイル
├── types/                # TypeScript型定義
│   └── index.ts
└── docs/                 # ドキュメント
    ├── README.md         # このファイル
    ├── database.md       # DB設計
    ├── pages.md          # ページ設計
    ├── api.md            # API設計
    ├── behavior-tracking.md  # 行動トラッキング詳細
    └── llm-integration.md    # LLM統合設計
```

## 🌟 主な特徴

- **非侵襲的な監視**: カメラやマイクを使わず、行動パターンのみを収集
- **LLM活用**: GPT-5-miniによる高精度な文章分析と機械翻訳検出
- **リアルタイム分析**: 受験中に不正リスクを検出
- **プライバシー重視**: 最小限のデータ収集と匿名化

## 🚀 セットアップ

```bash
# 依存関係のインストール
npm install

# データベースのセットアップ
npx prisma migrate dev
npx prisma db seed

# 環境変数の設定
cp .env.example .env.local
# OPENAI_API_KEY を設定

# 開発サーバー起動
npm run dev
```

## 📝 ドキュメント

- [データベース設計](./database.md)
- [ページ設計](./pages.md)
- [API設計](./api.md)
- [行動トラッキング](./behavior-tracking.md)
- [LLM統合](./llm-integration.md)

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

## 📄 ライセンス

MIT License

---

**商用利用時は適切なセキュリティ対策を実装してください。**

