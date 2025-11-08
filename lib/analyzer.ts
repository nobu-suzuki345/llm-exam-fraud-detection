import type { BehaviorLog, LLMAnalysisResult } from '@/types';
import { analyzeBehavior, analyzeFinalReport } from './llm';
import { prisma } from './prisma';
import type { TestAttempt, Question } from '@prisma/client';

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
    logs.blurDurations.some((d) => d > 3000)
  ) {
    score += 35; // 非常に疑わしい
  }

  return Math.min(100, score);
}

function calculateRiskScoreWithoutLLM(
  logs: BehaviorLog,
  answerTime: number
): number {
  let score = 0;

  // ウィンドウ切り替え（最も重要な指標）
  if (logs.blurCount > 10) score += 40;
  else if (logs.blurCount > 5) score += 30;
  else if (logs.blurCount > 3) score += 20;
  else if (logs.blurCount > 0) score += 10;

  // コピー操作
  if (logs.copyCount > 2) score += 25;
  else if (logs.copyCount > 0) score += 15;

  // ペースト操作（高リスク）
  if (logs.pasteCount > 0) score += 35;

  // マウス停止
  const inactiveSeconds = logs.mouseInactiveTime / 1000;
  if (inactiveSeconds > 120) score += 25;
  else if (inactiveSeconds > 60) score += 15;

  // タイピング速度
  if (logs.typingSpeed > 6) score += 20; // 異常に速い
  else if (logs.typingSpeed < 1 && logs.keyPressCount > 50) score += 15;

  // 疑わしいパターン：コピー → ウィンドウ切り替え → 高速解答
  if (
    logs.copyCount > 0 &&
    logs.blurCount > 0 &&
    answerTime < 60 &&
    logs.blurDurations.some((d) => d > 3000)
  ) {
    score += 35;
  }

  return Math.min(100, score);
}

export async function analyzeFraudRisk(attemptId: string, useLLM: boolean = true): Promise<void> {
  try {

    // 解答データを取得
    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { question: true },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const behaviorLogs = JSON.parse(attempt.behaviorLogs) as BehaviorLog;

    let finalScore: number;
    let llmResult: any = null;

    if (useLLM) {
      console.log(`🤖 LLM分析モード: attempt ${attemptId}`);
      
      // LLMで分析
      llmResult = await analyzeBehavior({
        questionText: attempt.question.questionText,
        questionDifficulty: attempt.question.difficulty,
        userAnswer: attempt.answer,
        behaviorLogs,
        answerTime: attempt.answerTime,
      });

      // 最終リスクスコアを計算（LLM結果を含む）
      finalScore = calculateFinalRiskScore(
        behaviorLogs,
        llmResult,
        attempt.answerTime
      );
    } else {
      console.log(`📊 統計分析モード（LLMなし）: attempt ${attemptId}`);
      
      // 統計的な分析のみ
      finalScore = calculateRiskScoreWithoutLLM(
        behaviorLogs,
        attempt.answerTime
      );
    }

    // DBを更新
    await prisma.testAttempt.update({
      where: { id: attemptId },
      data: {
        riskScore: finalScore,
        llmAnalysis: llmResult ? JSON.stringify(llmResult) : null,
        status: finalScore >= 65 ? 'flagged' : 'completed',
      },
    });

    const mode = useLLM ? 'LLM' : '統計';
    console.log(`✅ Analysis completed [${mode}] for attempt ${attemptId}: ${finalScore}%`);
  } catch (error) {
    console.error('Error analyzing fraud risk:', error);
    throw error;
  }
}

export async function analyzeFinalBehavior(
  sessionId: string,
  attempts: (TestAttempt & { question: Question })[],
  useLLM: boolean = true
): Promise<any> {
  try {
    // 正解率を計算
    let correctCount = 0;
    for (const attempt of attempts) {
      if (attempt.question.correctAnswer) {
        // 選択式の場合
        if (attempt.question.questionType === 'vocabulary' || 
            attempt.question.questionType === 'grammar') {
          if (attempt.answer.trim().toUpperCase() === 
              attempt.question.correctAnswer.trim().toUpperCase()) {
            correctCount++;
          }
        }
        // 記述式の場合は簡易判定（キーワードマッチ）
        else {
          const answerLower = attempt.answer.toLowerCase();
          const correctLower = attempt.question.correctAnswer.toLowerCase();
          const keywords = correctLower.split(/\s+/).filter(w => w.length > 3);
          const matchCount = keywords.filter(kw => answerLower.includes(kw)).length;
          if (matchCount >= keywords.length * 0.5) {
            correctCount += 0.5; // 部分点
          }
        }
      }
    }

    const accuracy = Math.round((correctCount / attempts.length) * 100);

    // 平均リスクスコアを先に計算
    const avgRiskScore = Math.round(
      attempts.reduce((sum, a) => sum + (a.riskScore || 0), 0) / attempts.length
    );

    // 全体の行動パターンを集計
    const allLogs = attempts.map(a => JSON.parse(a.behaviorLogs) as BehaviorLog);
    const totalBehavior = {
      totalBlurCount: allLogs.reduce((sum, log) => sum + log.blurCount, 0),
      totalCopyCount: allLogs.reduce((sum, log) => sum + log.copyCount, 0),
      totalPasteCount: allLogs.reduce((sum, log) => sum + log.pasteCount, 0),
      totalMouseInactiveTime: allLogs.reduce((sum, log) => sum + log.mouseInactiveTime, 0),
      averageTypingSpeed: allLogs.reduce((sum, log) => sum + log.typingSpeed, 0) / allLogs.length,
      totalAnswerTime: attempts.reduce((sum, a) => sum + a.answerTime, 0),
    };

    // LLMで総合的な分析（オプション）
    let llmReport = '';
    
    if (useLLM) {
      console.log('🤖 総合分析: LLMモード');
      llmReport = await analyzeFinalReport({
        attempts,
        totalBehavior,
        accuracy,
      });
    } else {
      console.log('📊 総合分析: 統計モード（LLMなし）');
      llmReport = `【統計分析モード】正解率${accuracy}%、平均リスク${avgRiskScore}%。ウィンドウ切り替え${totalBehavior.totalBlurCount}回、コピー${totalBehavior.totalCopyCount}回を検出。${avgRiskScore >= 65 ? '高リスク: 詳細な確認を推奨' : avgRiskScore > 40 ? '中リスク: 注意が必要' : '低リスク: 正常範囲'}`;
    }

    // 総合評価を更新
    await prisma.testAttempt.updateMany({
      where: { sessionId },
      data: {
        llmAnalysis: JSON.stringify({
          finalReport: llmReport,
          accuracy,
          avgRiskScore,
          totalBehavior,
        }),
      },
    });

    console.log(`✅ Final analysis completed for session ${sessionId}: ${accuracy}% accuracy, ${avgRiskScore}% risk`);

    return {
      accuracy,
      avgRiskScore,
      totalBehavior,
      llmReport,
    };
  } catch (error) {
    console.error('Error in final analysis:', error);
    throw error;
  }
}

