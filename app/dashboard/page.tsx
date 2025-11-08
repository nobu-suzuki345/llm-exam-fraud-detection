'use client';

import { useState, useEffect } from 'react';
import type { StudentStatus } from '@/types';

export default function DashboardPage() {
  const [students, setStudents] = useState<StudentStatus[]>([]);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed' | 'flagged'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/students/status');
        const data = await response.json();

        if (data.success) {
          setStudents(data.data);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 初回取得
    fetchStatus();

    // 2秒ごとにポーリング
    const interval = setInterval(fetchStatus, 2000);

    return () => clearInterval(interval);
  }, [mounted]);

  const filteredStudents = students.filter((student) => {
    if (filter === 'all') return true;
    return student.status === filter;
  });

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRiskIcon = (score: number) => {
    if (score >= 70) return '🚨';
    if (score >= 40) return '⚠️';
    return '✅';
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return '進行中';
      case 'completed':
        return '完了';
      case 'flagged':
        return 'フラグ付き';
      default:
        return status;
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}分${secs}秒`;
  };

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                🎓 教師用ダッシュボード
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                リアルタイム不正検出モニター
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>更新中</span>
              </div>
              {mounted && lastUpdate && (
                <p className="text-xs text-gray-500 mt-1" suppressHydrationWarning>
                  最終更新: {lastUpdate.toLocaleTimeString('ja-JP')}
                </p>
              )}
            </div>
          </div>

          {/* フィルター */}
          <div className="mt-6 flex gap-2">
            {[
              { key: 'all', label: 'すべて' },
              { key: 'in_progress', label: '進行中' },
              { key: 'completed', label: '完了' },
              { key: 'flagged', label: 'フラグ付き' },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key as any)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === item.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 受験者リスト */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">データを読み込んでいます...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-500 text-lg">
              {filter === 'all'
                ? '現在、受験者はいません'
                : `「${getStatusLabel(filter)}」の受験者はいません`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredStudents.map((student) => (
              <div
                key={student.sessionId}
                className={`bg-white rounded-lg shadow-sm p-6 border-2 ${
                  student.riskScore >= 70
                    ? 'border-red-200'
                    : student.riskScore >= 40
                    ? 'border-yellow-200'
                    : 'border-green-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        👤 {student.studentName}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold border ${getRiskColor(
                          student.riskScore
                        )}`}
                      >
                        {getRiskIcon(student.riskScore)} リスク: {student.riskScore}%
                      </span>
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                        {getStatusLabel(student.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                      <span>
                        問題 {student.currentQuestion} / {student.totalQuestions}
                      </span>
                      <span>経過時間: {formatTime(student.elapsedTime)}</span>
                      {student.accuracy > 0 && (
                        <span className="font-semibold text-blue-600">
                          正解率: {student.accuracy}%
                        </span>
                      )}
                    </div>

                    {student.warnings.length > 0 && (
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="font-semibold text-red-800 mb-2">
                          ⚠️ 警告:
                        </p>
                        <ul className="space-y-1">
                          {student.warnings.map((warning, index) => (
                            <li key={index} className="text-sm text-red-700">
                              • {warning}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {student.riskScore < 30 && !student.finalReport && (
                      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-700">
                          ✅ 正常な行動パターンです
                        </p>
                      </div>
                    )}

                    {student.finalReport && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="font-semibold text-blue-800 mb-2">
                          📊 総合分析レポート:
                        </p>
                        <p className="text-sm text-blue-700 whitespace-pre-wrap">
                          {student.finalReport}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

