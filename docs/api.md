# API設計

## 📡 API一覧

| エンドポイント | メソッド | 用途 | 認証 |
|:---|:---|:---|:---|
| `/api/questions` | GET | 問題一覧取得 | 不要 |
| `/api/questions/[id]` | GET | 問題詳細取得 | 不要 |
| `/api/submit` | POST | 解答送信 | 不要 |
| `/api/analyze` | POST | LLM分析実行 | 不要 |
| `/api/students/status` | GET | 受験者状況取得 | 不要 |
| `/api/students/[sessionId]` | GET | 受験者詳細取得 | 不要 |

---

## 1️⃣ 問題取得API

### `GET /api/questions`

全問題を取得する。

#### リクエスト

```http
GET /api/questions HTTP/1.1
```

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "長文読解: 環境問題",
      "questionText": "Climate change is one of the most pressing...",
      "questionType": "reading",
      "difficulty": "medium",
      "maxScore": 20,
      "options": null
    },
    {
      "id": 2,
      "title": "語彙問題: ビジネス英語",
      "questionText": "Choose the correct meaning of 'leverage'.",
      "questionType": "vocabulary",
      "difficulty": "easy",
      "maxScore": 10,
      "options": [
        "To use something to maximum advantage",
        "To lift something heavy",
        "To negotiate a deal",
        "To analyze data"
      ]
    }
  ]
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": "Failed to fetch questions"
}
```

#### 実装例

```typescript
// app/api/questions/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const questions = await prisma.question.findMany({
      orderBy: { id: 'asc' },
    });
    
    return NextResponse.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
```

---

## 2️⃣ 問題詳細取得API

### `GET /api/questions/[id]`

特定の問題の詳細を取得する。

#### リクエスト

```http
GET /api/questions/1 HTTP/1.1
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "長文読解: 環境問題",
    "questionText": "Climate change is one of the most pressing...",
    "questionType": "reading",
    "difficulty": "medium",
    "maxScore": 20,
    "correctAnswer": null,
    "options": null
  }
}
```

---

## 3️⃣ 解答送信API

### `POST /api/submit`

受験者の解答と行動ログを送信し、DBに保存する。
保存後、LLM分析を非同期でトリガーする。

#### リクエスト

```http
POST /api/submit HTTP/1.1
Content-Type: application/json

{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "studentName": "田中太郎",
  "questionId": 1,
  "answer": "The main cause of climate change is human activity...",
  "answerTime": 180,
  "behaviorLogs": {
    "blurCount": 3,
    "blurDurations": [5, 12, 8],
    "copyCount": 2,
    "copiedTexts": ["Climate change", "global issue"],
    "pasteCount": 0,
    "mouseMoveCount": 245,
    "mouseInactiveTime": 45,
    "keyPressCount": 120,
    "typingSpeed": 2.5,
    "rightClickCount": 0,
    "scrollCount": 8
  }
}
```

#### レスポンス（成功）

```json
{
  "success": true,
  "data": {
    "attemptId": "660f8400-e29b-41d4-a716-446655440001",
    "message": "Answer submitted successfully"
  }
}
```

#### レスポンス（エラー）

```json
{
  "success": false,
  "error": "Invalid session ID"
}
```

#### 実装例

```typescript
// app/api/submit/route.ts
import { prisma } from '@/lib/prisma';
import { analyzeBehavior } from '@/lib/analyzer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // バリデーション
    if (!body.sessionId || !body.questionId || !body.answer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // DBに保存
    const attempt = await prisma.testAttempt.create({
      data: {
        sessionId: body.sessionId,
        studentName: body.studentName,
        questionId: body.questionId,
        answer: body.answer,
        answerTime: body.answerTime,
        behaviorLogs: body.behaviorLogs,
        status: 'completed',
        completedAt: new Date(),
      },
    });
    
    // LLM分析を非同期でトリガー（バックグラウンド）
    analyzeBehavior(attempt.id).catch(console.error);
    
    return NextResponse.json({
      success: true,
      data: {
        attemptId: attempt.id,
        message: 'Answer submitted successfully',
      },
    });
  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
```

---

## 4️⃣ LLM分析API

### `POST /api/analyze`

行動ログと解答内容をLLMで分析し、リスクスコアを算出する。
**このAPIは内部から呼ばれ、フロントエンドから直接呼ばれることは想定しない。**

#### リクエスト

```http
POST /api/analyze HTTP/1.1
Content-Type: application/json

{
  "attemptId": "660f8400-e29b-41d4-a716-446655440001"
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "riskScore": 75.5,
    "analysis": {
      "reasons": [
        "問題文をコピー後、5秒間ウィンドウを離れています",
        "解答の文体がDeepL翻訳に類似しています",
        "マウスが45秒間停止していました"
      ],
      "translationLikelihood": 80,
      "suspiciousPatterns": [
        "copy_blur_fast_answer"
      ]
    }
  }
}
```

#### 実装例

```typescript
// app/api/analyze/route.ts
import { prisma } from '@/lib/prisma';
import { callLLM } from '@/lib/llm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { attemptId } = await request.json();
    
    // 解答データを取得
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { question: true },
    });
    
    if (!attempt) {
      return NextResponse.json(
        { success: false, error: 'Attempt not found' },
        { status: 404 }
      );
    }
    
    // LLMに分析を依頼
    const llmResult = await callLLM({
      questionText: attempt.question.questionText,
      answer: attempt.answer,
      behaviorLogs: attempt.behaviorLogs,
    });
    
    // リスクスコアを計算
    const riskScore = calculateRiskScore(
      attempt.behaviorLogs as any,
      llmResult
    );
    
    // DBを更新
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        riskScore,
        llmAnalysis: llmResult,
        status: riskScore > 70 ? 'flagged' : 'completed',
      },
    });
    
    return NextResponse.json({
      success: true,
      data: {
        riskScore,
        analysis: llmResult,
      },
    });
  } catch (error) {
    console.error('Error analyzing behavior:', error);
    return NextResponse.json(
      { success: false, error: 'Analysis failed' },
      { status: 500 }
    );
  }
}

function calculateRiskScore(logs: any, llmResult: any): number {
  // 基本スコア: LLMの判断を重視
  let score = llmResult.baseRiskScore || 0;
  
  // 行動パターンによる加算
  if (logs.blurCount > 3) score += 15;
  if (logs.copyCount > 0 && logs.blurCount > 0) score += 20;
  if (logs.mouseInactiveTime > 60) score += 10;
  if (logs.typingSpeed > 5) score += 10; // 異常に速い
  
  // 翻訳可能性による加算
  if (llmResult.translationLikelihood > 70) score += 25;
  
  return Math.min(100, Math.max(0, score));
}
```

---

## 5️⃣ 受験者状況取得API（ダッシュボード用）

### `GET /api/students/status`

全受験者のリアルタイム状況を取得する。
ダッシュボードが2秒ごとにポーリングする。

#### リクエスト

```http
GET /api/students/status HTTP/1.1
```

#### クエリパラメータ

| パラメータ | 型 | 必須 | 説明 |
|:---|:---|:---|:---|
| `status` | string | ❌ | フィルタ: `in_progress`, `completed`, `flagged` |
| `since` | number | ❌ | タイムスタンプ（この時刻以降のデータのみ） |

#### レスポンス

```json
{
  "success": true,
  "data": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "studentName": "田中太郎",
      "currentQuestion": 3,
      "totalQuestions": 5,
      "riskScore": 85,
      "status": "in_progress",
      "warnings": [
        "ウィンドウを5回離れています",
        "問題文を2回コピーしました"
      ],
      "elapsedTime": 300,
      "lastActivity": "2025-11-07T10:35:00Z"
    },
    {
      "sessionId": "660f8400-e29b-41d4-a716-446655440001",
      "studentName": "佐藤花子",
      "currentQuestion": 5,
      "totalQuestions": 5,
      "riskScore": 12,
      "status": "in_progress",
      "warnings": [],
      "elapsedTime": 480,
      "lastActivity": "2025-11-07T10:35:02Z"
    }
  ],
  "timestamp": 1699358100000
}
```

#### 実装例

```typescript
// app/api/students/status/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const since = searchParams.get('since');
    
    // 過去10分以内のアクティブなセッションを取得
    const recentTime = new Date(Date.now() - 10 * 60 * 1000);
    
    const attempts = await prisma.testAttempt.findMany({
      where: {
        createdAt: {
          gte: since ? new Date(Number(since)) : recentTime,
        },
        ...(statusFilter && { status: statusFilter }),
      },
      include: {
        question: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // セッションごとにグループ化
    const sessionMap = new Map();
    
    for (const attempt of attempts) {
      if (!sessionMap.has(attempt.sessionId)) {
        sessionMap.set(attempt.sessionId, {
          sessionId: attempt.sessionId,
          studentName: attempt.studentName,
          attempts: [],
        });
      }
      sessionMap.get(attempt.sessionId).attempts.push(attempt);
    }
    
    // レスポンス形式に変換
    const students = Array.from(sessionMap.values()).map(session => {
      const completedCount = session.attempts.filter(
        (a: any) => a.status === 'completed'
      ).length;
      
      const latestAttempt = session.attempts[0];
      const logs = latestAttempt.behaviorLogs as any;
      
      // 警告メッセージを生成
      const warnings = [];
      if (logs.blurCount > 3) {
        warnings.push(`ウィンドウを${logs.blurCount}回離れています`);
      }
      if (logs.copyCount > 0) {
        warnings.push(`問題文を${logs.copyCount}回コピーしました`);
      }
      
      return {
        sessionId: session.sessionId,
        studentName: session.studentName,
        currentQuestion: completedCount + 1,
        totalQuestions: 5, // TODO: 動的に取得
        riskScore: latestAttempt.riskScore || 0,
        status: latestAttempt.status,
        warnings,
        elapsedTime: Math.floor(
          (new Date().getTime() - new Date(latestAttempt.createdAt).getTime()) / 1000
        ),
        lastActivity: latestAttempt.createdAt,
      };
    });
    
    return NextResponse.json({
      success: true,
      data: students,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error fetching student status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
```

---

## 6️⃣ 受験者詳細取得API

### `GET /api/students/[sessionId]`

特定の受験者の詳細情報を取得する。

#### リクエスト

```http
GET /api/students/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "studentName": "田中太郎",
    "attempts": [
      {
        "questionId": 1,
        "questionTitle": "長文読解: 環境問題",
        "answer": "The main cause is...",
        "answerTime": 180,
        "riskScore": 85,
        "status": "flagged",
        "behaviorLogs": { ... },
        "llmAnalysis": {
          "reasons": ["..."],
          "translationLikelihood": 80
        }
      }
    ]
  }
}
```

---

## 🔒 セキュリティ

### レート制限（将来実装）

| API | 制限 |
|:---|:---|
| `/api/submit` | 10リクエスト/分/IP |
| `/api/analyze` | 内部専用 |
| `/api/students/status` | 60リクエスト/分/IP |

### CORS設定

```typescript
// middleware.ts
export function middleware(request: Request) {
  const response = NextResponse.next();
  
  // 本番環境では特定ドメインのみ許可
  response.headers.set('Access-Control-Allow-Origin', '*'); // 開発用
  
  return response;
}
```

---

## 📊 エラーコード一覧

| コード | 説明 |
|:---|:---|
| 400 | バリデーションエラー |
| 404 | リソースが見つからない |
| 429 | レート制限超過 |
| 500 | サーバーエラー |
| 503 | LLM APIエラー |

---

次は行動トラッキングの詳細設計を作成します！

