import { prisma } from '@/lib/prisma';
import { analyzeFinalBehavior } from '@/lib/analyzer';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sessionId, useLLM } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Missing sessionId' },
        { status: 400 }
      );
    }

    // セッションの全解答を取得
    const attempts = await prisma.testAttempt.findMany({
      where: { sessionId },
      include: { question: true },
      orderBy: { createdAt: 'asc' },
    });

    if (attempts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No attempts found' },
        { status: 404 }
      );
    }

    // 総合分析を実行（LLMフラグを渡す）
    const finalAnalysis = await analyzeFinalBehavior(sessionId, attempts, useLLM !== false);

    return NextResponse.json({
      success: true,
      data: finalAnalysis,
    });
  } catch (error) {
    console.error('Error in final analysis:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Final analysis failed',
      },
      { status: 500 }
    );
  }
}

