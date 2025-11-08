import { prisma } from '@/lib/prisma';
import { analyzeFraudRisk } from '@/lib/analyzer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // バリデーション
    if (!body.sessionId || !body.questionId || !body.answer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
        },
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
        behaviorLogs: JSON.stringify(body.behaviorLogs),
        status: 'completed',
        completedAt: new Date(),
      },
    });
    
    // LLM分析を非同期でトリガー（バックグラウンド）
    const useLLM = body.useLLM !== false; // デフォルトはtrue
    analyzeFraudRisk(attempt.id, useLLM).catch((error) => {
      console.error('Background analysis failed:', error);
    });

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
      {
        success: false,
        error: 'Failed to submit answer',
      },
      { status: 500 }
    );
  }
}

