'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResultPageContent() {
  const searchParams = useSearchParams();
  const studentName = searchParams.get('name');
  const sessionId = searchParams.get('sessionId');
  const useLLM = searchParams.get('useLLM') === 'true';
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    const runFinalAnalysis = async () => {
      if (!sessionId) return;
      
      try {
        const response = await fetch('/api/analyze/final', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, useLLM }),
        });
        
        const data = await response.json();
        
        if (data.success) {
          console.log('✅ 総合分析完了:', data.data);
        }
      } catch (error) {
        console.error('総合分析エラー:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    // 少し遅延させてから実行（全ての個別分析が完了するのを待つ）
    const timer = setTimeout(runFinalAnalysis, 2000);
    return () => clearTimeout(timer);
  }, [sessionId]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="text-6xl mb-6">✅</div>

        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          テスト完了
        </h1>

        <p className="text-lg text-gray-700 mb-2">
          {studentName}さん、お疲れ様でした！
        </p>

        <div className="my-8 p-6 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">回答した問題数:</span>
              <span className="font-bold text-gray-800">5 / 5</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">ステータス:</span>
              <span className="font-bold text-green-600">完了</span>
            </div>
          </div>
        </div>

        {isAnalyzing ? (
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 text-blue-600">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p>総合分析を実行中...</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-600 mb-8">
            結果は教師が確認します。<br />
            総合分析が完了しました。
          </p>
        )}

        <div className="space-y-3">
          <Link
            href="/dashboard"
            className="block w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            ダッシュボードを見る
          </Link>

          <Link
            href="/"
            className="block w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            トップページに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResultPageContent />
    </Suspense>
  );
}

