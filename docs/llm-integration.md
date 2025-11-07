# LLM統合設計

## 🤖 概要

OpenAI GPT-5-miniを使用して、受験者の解答内容と行動パターンを分析し、不正リスクを評価します。

---

## 🎯 LLMの役割

| 分析項目 | 目的 | 出力 |
|:---|:---|:---|
| **機械翻訳検出** | DeepL/Google翻訳の使用を検出 | 類似度スコア（0-100%） |
| **文体分析** | 解答の流暢さと問題難易度の整合性チェック | 不自然度スコア |
| **行動パターン評価** | 行動ログから不正の可能性を判断 | リスクスコア（0-100%） |
| **総合評価** | 上記を統合して最終判断 | 理由付きスコア |

---

## 📝 プロンプト設計

### 1. メインプロンプト

```typescript
// lib/llm.ts

const FRAUD_DETECTION_PROMPT = `
あなたは英語テストの不正検出AIです。
受験者の解答と行動パターンから、不正行為の可能性を評価してください。

## 評価対象データ

### 問題文
{questionText}

### 問題の難易度
{difficulty} (easy/medium/hard)

### 受験者の解答
{userAnswer}

### 行動ログ
- ウィンドウ切り替え回数: {blurCount}回
- 各離脱時間: {blurDurations}秒
- 問題文のコピー回数: {copyCount}回
- コピーされたテキスト: {copiedTexts}
- ペースト回数: {pasteCount}回
- 解答時間: {answerTime}秒
- マウス停止時間: {mouseInactiveTime}秒
- タイピング速度: {typingSpeed}文字/秒

## 評価基準

### 1. 機械翻訳の検出
以下の特徴がある場合、機械翻訳の可能性が高い：
- DeepL特有の表現（例: "〜することができます"の多用）
- Google翻訳特有の不自然な語順
- 文法的には正しいが、ネイティブが使わない表現
- 問題文の難易度に対して過度に流暢

### 2. 不正行動パターン
- コピー直後のウィンドウ切り替え（翻訳サイトの使用可能性）
- 長時間のマウス停止 + 高品質な解答（他人が代行の可能性）
- 異常に速いタイピング（コピペの可能性）
- 頻繁なペースト操作

### 3. 解答の一貫性
- 問題の難易度と解答の質の不一致
- 受験者の他の解答との文体の違い

## 出力形式

以下のJSON形式で出力してください：

{
  "riskScore": 0-100の数値,
  "translationLikelihood": 0-100の数値,
  "reasons": [
    "理由1",
    "理由2",
    "理由3"
  ],
  "suspiciousPatterns": [
    "検出されたパターン名"
  ],
  "answerQuality": 0-1の数値,
  "recommendation": "教師への推奨アクション"
}

## 重要な注意事項
- 誤検知を避けるため、確実な証拠がある場合のみ高スコアを付ける
- 疑わしいが確証がない場合は中程度のスコアとし、その旨を理由に記載
- 正常な行動パターンの場合は低スコアを付け、その根拠を示す
`;
```

---

## 🔧 実装

### lib/llm.ts

```typescript
import OpenAI from 'openai';
import type { BehaviorLog } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-5-mini';

export interface LLMAnalysisInput {
  questionText: string;
  questionDifficulty: string;
  userAnswer: string;
  behaviorLogs: BehaviorLog;
  answerTime: number;
}

export interface LLMAnalysisResult {
  riskScore: number;
  translationLikelihood: number;
  reasons: string[];
  suspiciousPatterns: string[];
  answerQuality: number;
  recommendation: string;
}

export async function analyzeBehavior(
  input: LLMAnalysisInput
): Promise<LLMAnalysisResult> {
  try {
    const prompt = buildPrompt(input);
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: '你は英語テストの不正検出を専門とするAIアシスタントです。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3, // 低めに設定して一貫性を確保
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    const result = JSON.parse(content) as LLMAnalysisResult;
    
    // バリデーション
    validateResult(result);
    
    return result;
  } catch (error) {
    console.error('LLM analysis error:', error);
    
    // エラー時はフォールバック
    return {
      riskScore: 50,
      translationLikelihood: 0,
      reasons: ['LLM分析でエラーが発生しました'],
      suspiciousPatterns: [],
      answerQuality: 0.5,
      recommendation: '手動で確認してください',
    };
  }
}

function buildPrompt(input: LLMAnalysisInput): string {
  const {
    questionText,
    questionDifficulty,
    userAnswer,
    behaviorLogs,
    answerTime,
  } = input;
  
  return `
あなたは英語テストの不正検出AIです。
受験者の解答と行動パターンから、不正行為の可能性を評価してください。

## 評価対象データ

### 問題文
${questionText}

### 問題の難易度
${questionDifficulty}

### 受験者の解答
${userAnswer}

### 行動ログ
- ウィンドウ切り替え回数: ${behaviorLogs.blurCount}回
- 各離脱時間: ${behaviorLogs.blurDurations.join(', ')}ミリ秒
- 問題文のコピー回数: ${behaviorLogs.copyCount}回
- コピーされたテキスト: ${behaviorLogs.copiedTexts.join(', ')}
- ペースト回数: ${behaviorLogs.pasteCount}回
- 解答時間: ${answerTime}秒
- マウス停止時間: ${Math.floor(behaviorLogs.mouseInactiveTime / 1000)}秒
- タイピング速度: ${behaviorLogs.typingSpeed.toFixed(1)}文字/秒

## 評価基準

### 1. 機械翻訳の検出
以下の特徴がある場合、機械翻訳の可能性が高い：
- DeepL特有の表現（例: "〜することができます"の多用）
- Google翻訳特有の不自然な語順
- 文法的には正しいが、ネイティブが使わない表現
- 問題文の難易度に対して過度に流暢

### 2. 不正行動パターン
- コピー直後のウィンドウ切り替え（翻訳サイトの使用可能性）
- 長時間のマウス停止 + 高品質な解答（他人が代行の可能性）
- 異常に速いタイピング（コピペの可能性）
- 頻繁なペースト操作

### 3. 解答の一貫性
- 問題の難易度と解答の質の不一致

## 出力形式

以下のJSON形式で出力してください：

{
  "riskScore": 0-100の数値,
  "translationLikelihood": 0-100の数値,
  "reasons": ["理由1", "理由2"],
  "suspiciousPatterns": ["パターン名"],
  "answerQuality": 0-1の数値,
  "recommendation": "推奨アクション"
}
`.trim();
}

function validateResult(result: any): void {
  if (typeof result.riskScore !== 'number' || 
      result.riskScore < 0 || 
      result.riskScore > 100) {
    throw new Error('Invalid riskScore');
  }
  
  if (!Array.isArray(result.reasons)) {
    throw new Error('Invalid reasons');
  }
  
  if (!Array.isArray(result.suspiciousPatterns)) {
    throw new Error('Invalid suspiciousPatterns');
  }
}
```

---

## 🧪 機械翻訳検出の仕組み

### DeepL特有のパターン

| パターン | 例 |
|:---|:---|
| 丁寧すぎる表現 | "〜することができます" |
| 受動態の多用 | "It is considered that..." |
| 冗長な表現 | "in order to" の頻繁な使用 |

### Google翻訳特有のパターン

| パターン | 例 |
|:---|:---|
| 直訳的な語順 | "very important problem" |
| 不自然な冠詞 | "a" と "the" の誤用 |
| 機械的な接続詞 | "However" で始まる文の連続 |

### LLMによる検出精度

```typescript
// 実験結果（想定）
{
  "DeepL翻訳": {
    "検出率": "85%",
    "誤検知率": "10%"
  },
  "Google翻訳": {
    "検出率": "80%",
    "誤検知率": "12%"
  },
  "手書き（ネイティブ）": {
    "誤検知率": "5%"
  }
}
```

---

## 📊 リスクスコア統合

### lib/analyzer.ts

```typescript
import type { BehaviorLog } from '@/types';
import type { LLMAnalysisResult } from './llm';

export function calculateFinalRiskScore(
  behaviorLogs: BehaviorLog,
  llmAnalysis: LLMAnalysisResult,
  answerTime: number
): number {
  let score = 0;
  
  // LLMの基本スコア（重み: 50%）
  score += llmAnalysis.riskScore * 0.5;
  
  // 行動パターンスコア（重み: 30%）
  const behaviorScore = calculateBehaviorScore(behaviorLogs, answerTime);
  score += behaviorScore * 0.3;
  
  // 翻訳可能性スコア（重み: 20%）
  score += llmAnalysis.translationLikelihood * 0.2;
  
  return Math.min(100, Math.max(0, Math.round(score)));
}

function calculateBehaviorScore(
  logs: BehaviorLog,
  answerTime: number
): number {
  let score = 0;
  
  // ウィンドウ切り替え
  if (logs.blurCount > 5) score += 30;
  else if (logs.blurCount > 3) score += 20;
  else if (logs.blurCount > 0) score += 10;
  
  // コピー操作
  if (logs.copyCount > 2) score += 25;
  else if (logs.copyCount > 0) score += 15;
  
  // ペースト操作（高リスク）
  if (logs.pasteCount > 0) score += 30;
  
  // マウス停止
  const inactiveSeconds = logs.mouseInactiveTime / 1000;
  if (inactiveSeconds > 120) score += 25;
  else if (inactiveSeconds > 60) score += 15;
  
  // タイピング速度
  if (logs.typingSpeed > 6) score += 20; // 異常に速い
  else if (logs.typingSpeed < 1 && logs.keyPressCount > 50) score += 15; // 異常に遅い
  
  // コピー → ウィンドウ切り替え → 高速解答のパターン
  if (
    logs.copyCount > 0 &&
    logs.blurCount > 0 &&
    answerTime < 60 &&
    logs.blurDurations.some(d => d > 3000)
  ) {
    score += 35; // 非常に疑わしい
  }
  
  return Math.min(100, score);
}

export async function analyzeFraudRisk(attemptId: string): Promise<void> {
  const { prisma } = await import('./prisma');
  const { analyzeBehavior } = await import('./llm');
  
  // 解答データを取得
  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { question: true },
  });
  
  if (!attempt) {
    throw new Error('Attempt not found');
  }
  
  // LLMで分析
  const llmResult = await analyzeBehavior({
    questionText: attempt.question.questionText,
    questionDifficulty: attempt.question.difficulty,
    userAnswer: attempt.answer,
    behaviorLogs: attempt.behaviorLogs as BehaviorLog,
    answerTime: attempt.answerTime,
  });
  
  // 最終リスクスコアを計算
  const finalScore = calculateFinalRiskScore(
    attempt.behaviorLogs as BehaviorLog,
    llmResult,
    attempt.answerTime
  );
  
  // DBを更新
  await prisma.testAttempt.update({
    where: { id: attemptId },
    data: {
      riskScore: finalScore,
      llmAnalysis: llmResult as any,
      status: finalScore > 70 ? 'flagged' : 'completed',
    },
  });
}
```

---

## 💰 コスト管理

### トークン数の見積もり

```typescript
// 1回の分析あたり
const TOKENS_PER_ANALYSIS = {
  input: {
    prompt: 500,      // プロンプトテンプレート
    question: 200,    // 問題文
    answer: 150,      // 受験者の解答
    behaviorLogs: 100, // 行動ログ
    total: 950
  },
  output: {
    analysis: 200     // 分析結果
  }
};

// GPT-5-mini料金（想定）
const COST_PER_1M_TOKENS = {
  input: 0.15,  // $0.15 / 1M tokens
  output: 0.6,  // $0.6 / 1M tokens
};

// 1回あたりのコスト
const costPerAnalysis = 
  (TOKENS_PER_ANALYSIS.input.total / 1_000_000) * COST_PER_ANALYSIS.input +
  (TOKENS_PER_ANALYSIS.output.analysis / 1_000_000) * COST_PER_ANALYSIS.output;

console.log(`1回あたり: $${costPerAnalysis.toFixed(6)} (約${(costPerAnalysis * 150).toFixed(2)}円)`);
// 出力: 1回あたり: $0.000263 (約0.04円)
```

### コスト削減策

| 施策 | 効果 |
|:---|:---|
| プロンプトの最適化 | -20% |
| 不要な情報の削除 | -15% |
| キャッシュの活用 | -30%（同じ問題の場合） |

---

## 🔄 非同期処理

LLM分析は時間がかかるため、非同期で実行します。

```typescript
// app/api/submit/route.ts

export async function POST(request: Request) {
  // ...解答をDBに保存...
  
  // LLM分析を非同期でトリガー（待たない）
  analyzeFraudRisk(attempt.id).catch(error => {
    console.error('Background analysis failed:', error);
  });
  
  // すぐにレスポンスを返す
  return NextResponse.json({
    success: true,
    attemptId: attempt.id,
  });
}
```

---

## 🧪 テスト戦略

### 1. ユニットテスト

```typescript
// __tests__/llm.test.ts

describe('analyzeBehavior', () => {
  it('高リスクパターンを検出する', async () => {
    const input = {
      questionText: 'What is climate change?',
      questionDifficulty: 'medium',
      userAnswer: 'Climate change is...',
      behaviorLogs: {
        blurCount: 5,
        copyCount: 2,
        // ...
      },
      answerTime: 30,
    };
    
    const result = await analyzeBehavior(input);
    
    expect(result.riskScore).toBeGreaterThan(70);
    expect(result.suspiciousPatterns).toContain('copy_blur_fast_answer');
  });
});
```

### 2. モック応答

開発時はOpenAI APIをモックして高速化：

```typescript
// lib/llm.mock.ts

export function mockAnalyzeBehavior(): LLMAnalysisResult {
  return {
    riskScore: 75,
    translationLikelihood: 80,
    reasons: ['テスト用のモック応答'],
    suspiciousPatterns: ['mock_pattern'],
    answerQuality: 0.8,
    recommendation: 'モックデータです',
  };
}
```

---

## 📈 改善案（将来）

| 項目 | 内容 |
|:---|:---|
| **ファインチューニング** | 実データでモデルを調整 |
| **アンサンブル** | 複数のLLMの結果を統合 |
| **フィードバックループ** | 教師の判断を学習に反映 |
| **A/Bテスト** | 異なるプロンプトの効果測定 |

---

以上でLLM統合設計の説明を終わります。

