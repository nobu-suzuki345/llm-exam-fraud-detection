'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BehaviorTracker } from '@/components/BehaviorTracker';
import { QuestionCard } from '@/components/QuestionCard';
import type { Question, BehaviorLog } from '@/types';

function TestPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const studentName = searchParams.get('name');
  const useLLM = searchParams.get('useLLM') === 'true';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<number, string>>(new Map());
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog | null>(null);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());

  // セッションIDと名前のチェック
  useEffect(() => {
    if (!sessionId || !studentName) {
      router.push('/');
    }
  }, [sessionId, studentName, router]);

  // 問題の取得
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch('/api/questions');
        const data = await response.json();
        
        if (data.success) {
          setQuestions(data.data);
        } else {
          setError('問題の読み込みに失敗しました');
        }
      } catch (err) {
        setError('ネットワークエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  // 現在の問題が変わったら、保存済みの解答を復元
  useEffect(() => {
    if (questions.length > 0) {
      const currentQuestion = questions[currentIndex];
      const savedAnswer = answers.get(currentQuestion.id) || '';
      setCurrentAnswer(savedAnswer);
      setStartTime(Date.now());
    }
  }, [currentIndex, questions, answers]);

  const handleNext = async () => {
    if (!currentAnswer.trim()) {
      alert('解答を入力してください');
      return;
    }

    const currentQuestion = questions[currentIndex];
    
    // 既に送信済みの問題かチェック
    const isAlreadySubmitted = submittedQuestions.has(currentQuestion.id);

    setIsSubmitting(true);
    const answerTime = Math.floor((Date.now() - startTime) / 1000);

    try {
      // 未送信の問題のみAPIに送信
      if (!isAlreadySubmitted) {
        const response = await fetch('/api/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            studentName,
            questionId: currentQuestion.id,
            answer: currentAnswer,
            answerTime,
            behaviorLogs: behaviorLogs || {},
            useLLM, // LLMフラグを送信
          }),
        });

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || '送信に失敗しました');
        }

        // 送信済みとしてマーク
        setSubmittedQuestions(new Set(submittedQuestions.add(currentQuestion.id)));
      }

      // 解答を保存
      setAnswers(new Map(answers.set(currentQuestion.id, currentAnswer)));

      // 次の問題へ
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setCurrentAnswer('');
      } else {
        // 全問完了
        router.push(`/test/result?sessionId=${sessionId}&name=${encodeURIComponent(studentName || '')}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '送信エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentAnswer('');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">問題を読み込んでいます...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            トップページに戻る
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">問題が見つかりませんでした</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <BehaviorTracker onLogsChange={setBehaviorLogs}>
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* ヘッダー */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl font-bold text-gray-800">📝 英語テスト</h1>
                <p className="text-sm text-gray-600">{studentName}さん</p>
              </div>
              <div className="text-right">
                <div className="mb-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    useLLM 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {useLLM ? '🤖 AI分析' : '📊 統計分析'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  問題 {currentIndex + 1} / {questions.length}
                </p>
                <div className="flex gap-1 mt-2">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-8 h-1 rounded ${
                        index < currentIndex
                          ? 'bg-green-500'
                          : index === currentIndex
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 問題カード */}
          <QuestionCard
            question={currentQuestion}
            answer={currentAnswer}
            onAnswerChange={setCurrentAnswer}
          />

          {/* ナビゲーションボタン */}
          <div className="mt-6 flex justify-between gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← 前の問題
            </button>

            <div className="flex gap-4">
              <button
                onClick={handleSkip}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                スキップ
              </button>
              <button
                onClick={handleNext}
                disabled={isSubmitting || !currentAnswer.trim()}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-semibold"
              >
                {isSubmitting ? '送信中...' : currentIndex === questions.length - 1 ? '完了' : '次へ進む →'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </BehaviorTracker>
  );
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <TestPageContent />
    </Suspense>
  );
}

