import OpenAI from 'openai';
import type { BehaviorLog, LLMAnalysisResult } from '@/types';

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
          content:
            'あなたは英語テストの不正検出を専門とするAIアシスタントです。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
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
${questionText.substring(0, 500)}...

### 問題の難易度
${questionDifficulty}

### 受験者の解答
${userAnswer}

### 行動ログ
- ウィンドウ切り替え回数: ${behaviorLogs.blurCount}回
- 各離脱時間: ${behaviorLogs.blurDurations.slice(0, 5).join(', ')}ミリ秒
- 問題文のコピー回数: ${behaviorLogs.copyCount}回
- コピーされたテキスト: ${behaviorLogs.copiedTexts.slice(0, 3).join(', ')}
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
  if (
    typeof result.riskScore !== 'number' ||
    result.riskScore < 0 ||
    result.riskScore > 100
  ) {
    throw new Error('Invalid riskScore');
  }

  if (!Array.isArray(result.reasons)) {
    throw new Error('Invalid reasons');
  }

  if (!Array.isArray(result.suspiciousPatterns)) {
    throw new Error('Invalid suspiciousPatterns');
  }
}

export async function analyzeFinalReport(data: any): Promise<string> {
  try {
    // データの検証
    if (!data || !data.attempts || !Array.isArray(data.attempts) || data.attempts.length === 0) {
      console.error('Invalid data for final report:', data);
      return '分析データが不足しているため、レポートを生成できませんでした。';
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not set');
      return 'OpenAI APIキーが設定されていません。.env.localファイルにOPENAI_API_KEYを設定してください。';
    }

    // 平均リスクスコアを計算
    const avgRisk = Math.round(
      data.attempts.reduce((sum: number, a: any) => sum + (a.riskScore || 0), 0) / data.attempts.length
    );

    const prompt = `英語テスト不正検出の総合分析レポートを作成してください。

データ:
- 正解率: ${data.accuracy || 0}%
- 平均リスクスコア: ${avgRisk}%
- ウィンドウ切り替え: ${data.totalBehavior?.totalBlurCount || 0}回
- コピー操作: ${data.totalBehavior?.totalCopyCount || 0}回
- ペースト操作: ${data.totalBehavior?.totalPasteCount || 0}回
- マウス停止: ${Math.floor((data.totalBehavior?.totalMouseInactiveTime || 0) / 1000)}秒

200文字程度で、不正の可能性（低/中/高）と具体的な理由、教師への推奨を記載してください。`;

    console.log('📊 Calling OpenAI for final report...');

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'あなたは英語テストの不正検出AIです。簡潔に分析してください。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_completion_tokens: 500,
    });

    const report = response.choices[0].message.content || '分析レポートの生成に失敗しました';
    console.log('✅ Final report generated successfully');
    
    return report;
  } catch (error: any) {
    console.error('❌ Final report generation error:', error);
    console.error('Error details:', error.message);
    
    if (error.code === 'invalid_api_key') {
      return 'OpenAI APIキーが無効です。正しいAPIキーを.env.localに設定してください。';
    }
    
    if (error.code === 'model_not_found') {
      return `モデル「${MODEL}」が見つかりません。GPT-5-miniがまだ利用できない可能性があります。環境変数OPENAI_MODELをgpt-4o-miniに変更してください。`;
    }
    
    return `総合分析レポートの生成中にエラーが発生しました: ${error.message}`;
  }
}

