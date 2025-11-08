import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import type { BehaviorLog } from '@/types';

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
          select: { id: true, title: true, difficulty: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // セッションごとにグループ化
    const sessionMap = new Map<string, any>();

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
    const students = Array.from(sessionMap.values()).map((session) => {
      // 問題IDごとに最新の解答のみをカウント（重複を除外）
      const uniqueQuestions = new Map<number, any>();
      for (const attempt of session.attempts) {
        const qId = attempt.questionId;
        if (!uniqueQuestions.has(qId) || 
            new Date(attempt.createdAt) > new Date(uniqueQuestions.get(qId).createdAt)) {
          uniqueQuestions.set(qId, attempt);
        }
      }
      
      const completedCount = Array.from(uniqueQuestions.values()).filter(
        (a: any) => a.status === 'completed' || a.status === 'flagged'
      ).length;

      const latestAttempt = session.attempts[0];
      const logs = JSON.parse(latestAttempt.behaviorLogs) as BehaviorLog;

      // 警告メッセージを生成
      const warnings = [];
      if (logs.blurCount > 3) {
        warnings.push(`ウィンドウを${logs.blurCount}回離れています`);
      }
      if (logs.copyCount > 0) {
        warnings.push(`問題文を${logs.copyCount}回コピーしました`);
      }
      if (logs.pasteCount > 0) {
        warnings.push(`${logs.pasteCount}回ペースト操作を行いました`);
      }
      if (logs.mouseInactiveTime > 60000) {
        warnings.push(
          `マウスが${Math.floor(logs.mouseInactiveTime / 1000)}秒間停止していました`
        );
      }

      // 正解率を計算
      let correctCount = 0;
      for (const attempt of Array.from(uniqueQuestions.values())) {
        if (attempt.question.correctAnswer) {
          if (attempt.question.questionType === 'vocabulary' || 
              attempt.question.questionType === 'grammar') {
            if (attempt.answer.trim().toUpperCase() === 
                attempt.question.correctAnswer.trim().toUpperCase()) {
              correctCount++;
            }
          }
        }
      }
      const accuracy = uniqueQuestions.size > 0 
        ? Math.round((correctCount / uniqueQuestions.size) * 100)
        : 0;

      // 最終レポートの取得（あれば）
      let finalReport = null;
      try {
        const parsedAnalysis = JSON.parse(latestAttempt.llmAnalysis || '{}');
        finalReport = parsedAnalysis.finalReport || null;
      } catch (e) {
        // パースエラーは無視
      }

      return {
        sessionId: session.sessionId,
        studentName: session.studentName,
        currentQuestion: completedCount,
        totalQuestions: 5,
        riskScore: latestAttempt.riskScore || 0,
        status: latestAttempt.status,
        warnings,
        accuracy,
        finalReport,
        elapsedTime: Math.floor(
          (new Date().getTime() - new Date(latestAttempt.createdAt).getTime()) /
            1000
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
      {
        success: false,
        error: 'Failed to fetch status',
      },
      { status: 500 }
    );
  }
}

