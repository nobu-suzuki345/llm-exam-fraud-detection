# データベース設計

## 📊 概要

SQLite + Prismaを使用したシンプルなデータベース設計。
ファイルベースなので、Git管理が可能。

## 🗄️ スキーマ設計

### ER図

```
┌──────────────┐
│   Question   │
└──────────────┘
       │ 1
       │
       │ N
       │
┌──────────────┐
│ TestAttempt  │
└──────────────┘
```

---

## 📋 テーブル定義

### 1. `Question` テーブル

英語の問題を管理するテーブル。

| カラム名 | 型 | 必須 | デフォルト | 説明 |
|:---|:---|:---|:---|:---|
| `id` | Int | ✅ | AUTO_INCREMENT | 問題ID（主キー） |
| `title` | String | ✅ | - | 問題のタイトル |
| `questionText` | String (TEXT) | ✅ | - | 問題文（英語） |
| `questionType` | String | ✅ | - | 問題種別（reading/vocabulary/grammar） |
| `difficulty` | String | ✅ | - | 難易度（easy/medium/hard） |
| `correctAnswer` | String? | ❌ | - | 正解（記述式の場合は参考解答） |
| `options` | Json? | ❌ | - | 選択肢（選択式の場合） |
| `maxScore` | Int | ✅ | 10 | 配点 |
| `createdAt` | DateTime | ✅ | now() | 作成日時 |
| `updatedAt` | DateTime | ✅ | now() | 更新日時 |

#### サンプルデータ

```json
{
  "id": 1,
  "title": "長文読解: 環境問題",
  "questionText": "Read the following passage and answer the question...",
  "questionType": "reading",
  "difficulty": "medium",
  "correctAnswer": null,
  "options": null,
  "maxScore": 20
}
```

---

### 2. `TestAttempt` テーブル

受験者の解答と行動ログを管理するテーブル。

| カラム名 | 型 | 必須 | デフォルト | 説明 |
|:---|:---|:---|:---|:---|
| `id` | String (UUID) | ✅ | uuid() | 解答ID（主キー） |
| `sessionId` | String | ✅ | - | ブラウザセッションID |
| `studentName` | String | ✅ | - | 受験者名（入力値） |
| `questionId` | Int | ✅ | - | 問題ID（外部キー） |
| `answer` | String (TEXT) | ✅ | - | 受験者の解答 |
| `answerTime` | Int | ✅ | - | 解答時間（秒） |
| `behaviorLogs` | Json | ✅ | {} | 行動ログ（JSON形式） |
| `riskScore` | Float? | ❌ | - | 不正リスクスコア（0-100） |
| `llmAnalysis` | Json? | ❌ | - | LLMの分析結果 |
| `status` | String | ✅ | "in_progress" | ステータス（in_progress/completed/flagged） |
| `createdAt` | DateTime | ✅ | now() | 解答開始時刻 |
| `completedAt` | DateTime? | ❌ | - | 解答完了時刻 |

#### リレーション
- `questionId` → `Question.id`（多対一）

#### サンプルデータ

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sessionId": "sess_abc123",
  "studentName": "田中太郎",
  "questionId": 1,
  "answer": "Climate change is a serious global issue...",
  "answerTime": 180,
  "behaviorLogs": {
    "blurCount": 3,
    "blurDurations": [5, 12, 8],
    "copyCount": 2,
    "copiedTexts": ["Climate change", "global issue"],
    "mouseMoveCount": 245,
    "mouseInactiveTime": 45,
    "keyPressCount": 120,
    "typingSpeed": 2.5
  },
  "riskScore": 67.5,
  "llmAnalysis": {
    "reasons": [
      "問題文をコピー後、ウィンドウを離れている",
      "解答の文体が機械翻訳に類似"
    ],
    "translationLikelihood": 75
  },
  "status": "flagged",
  "createdAt": "2025-11-07T10:30:00Z",
  "completedAt": "2025-11-07T10:33:00Z"
}
```

---

## 🔧 Prismaスキーマファイル

```prisma
// prisma/schema.prisma

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"
}

generator client {
  provider = "prisma-client-js"
}

// 問題テーブル
model Question {
  id            Int          @id @default(autoincrement())
  title         String
  questionText  String       // 問題文
  questionType  String       // reading, vocabulary, grammar
  difficulty    String       // easy, medium, hard
  correctAnswer String?      // 正解（参考）
  options       Json?        // 選択肢（選択式の場合）
  maxScore      Int          @default(10)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  
  // リレーション
  attempts      TestAttempt[]
}

// 解答テーブル
model TestAttempt {
  id            String    @id @default(uuid())
  sessionId     String    // ブラウザセッションID
  studentName   String    // 受験者名
  questionId    Int       // 問題ID
  answer        String    // 解答
  answerTime    Int       // 解答時間（秒）
  behaviorLogs  Json      // 行動ログ
  riskScore     Float?    // 不正リスクスコア
  llmAnalysis   Json?     // LLM分析結果
  status        String    @default("in_progress") // in_progress, completed, flagged
  createdAt     DateTime  @default(now())
  completedAt   DateTime?
  
  // リレーション
  question      Question  @relation(fields: [questionId], references: [id])
  
  @@index([sessionId])
  @@index([status])
  @@index([createdAt])
}
```

---

## 📈 インデックス戦略

| テーブル | カラム | 理由 |
|:---|:---|:---|
| `TestAttempt` | `sessionId` | セッション単位での絞り込み |
| `TestAttempt` | `status` | ステータスでのフィルタリング |
| `TestAttempt` | `createdAt` | 時系列での並び替え |

---

## 🔄 マイグレーション戦略

```bash
# 初回マイグレーション
npx prisma migrate dev --name init

# サンプルデータ投入
npx prisma db seed

# スキーマの確認
npx prisma studio
```

---

## 🌱 シードデータ

`prisma/seed.ts` で以下のデータを投入：

### 問題データ（5問）
1. **長文読解（難易度: medium）**
   - 環境問題に関する英文
2. **語彙問題（難易度: easy）**
   - 単語の意味を選択
3. **文法問題（難易度: medium）**
   - 適切な時制を選択
4. **長文読解（難易度: hard）**
   - ビジネス英語
5. **記述問題（難易度: hard）**
   - 意見を英語で記述

---

## 🔐 データプライバシー

### 収集するデータ
- ✅ 受験者名（入力値、識別用）
- ✅ 解答内容
- ✅ 行動ログ（匿名化）

### 収集しないデータ
- ❌ メールアドレス
- ❌ IPアドレス
- ❌ 他サイトの閲覧履歴
- ❌ カメラ・マイク

---

## 📊 データ保持期間

| データ | 保持期間 | 理由 |
|:---|:---|:---|
| 問題データ | 永続 | 再利用 |
| 解答データ | 3ヶ月（提案） | 統計分析用 |
| 行動ログ | 1ヶ月（提案） | デバッグ用 |

**※ 本番環境では法的要件に応じて調整**

---

## 🚀 スケーリング戦略（将来）

### SQLiteの限界
- 同時書き込み: 1接続のみ
- ファイルサイズ: 最大281TB（実用上は数GB推奨）
- **推奨利用規模**: 〜100ユーザー/日

### PostgreSQLへの移行
本番運用時は以下に移行を推奨：

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**移行先候補:**
- Supabase（無料枠あり）
- Neon（無料枠あり）
- Vercel Postgres

---

## 📝 クエリ例

### 1. 高リスクユーザーの抽出

```typescript
const flaggedUsers = await prisma.testAttempt.findMany({
  where: {
    riskScore: {
      gte: 70, // 70%以上
    },
    status: 'flagged',
  },
  include: {
    question: true,
  },
  orderBy: {
    riskScore: 'desc',
  },
});
```

### 2. リアルタイムダッシュボード用

```typescript
const recentAttempts = await prisma.testAttempt.findMany({
  where: {
    createdAt: {
      gte: new Date(Date.now() - 5 * 60 * 1000), // 過去5分
    },
  },
  include: {
    question: {
      select: {
        title: true,
        difficulty: true,
      },
    },
  },
  orderBy: {
    createdAt: 'desc',
  },
});
```

### 3. セッション単位でのデータ取得

```typescript
const userSession = await prisma.testAttempt.findMany({
  where: {
    sessionId: 'sess_abc123',
  },
  include: {
    question: true,
  },
});
```

---

## ✅ バリデーション

| フィールド | バリデーション |
|:---|:---|
| `studentName` | 1〜50文字 |
| `answer` | 1〜5000文字 |
| `answerTime` | 1秒以上 |
| `riskScore` | 0〜100 |

---

次は各ページの設計を作成します！

