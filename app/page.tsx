'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [useLLM, setUseLLM] = useState(true);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // バリデーション
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }
    
    if (name.length > 50) {
      setError('名前は50文字以内で入力してください');
      return;
    }
    
    // セッションIDを生成
    const sessionId = uuidv4();
    
    // テスト画面へ遷移（LLMフラグも渡す）
    router.push(`/test?sessionId=${sessionId}&name=${encodeURIComponent(name)}&useLLM=${useLLM}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">📚</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            英語テスト不正検出システム
          </h1>
          <p className="text-gray-600">
            Kyouiku - AI-Powered Fraud Detection
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              お名前を入力してください
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="田中太郎"
              maxLength={50}
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>

          {/* LLM切り替えボタン */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              不正検出モード
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setUseLLM(true)}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                  useLLM
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg">🤖 AI分析</div>
                  <div className="text-xs mt-1 opacity-90">
                    高精度（約0.6円）
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setUseLLM(false)}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition ${
                  !useLLM
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg">📊 統計分析</div>
                  <div className="text-xs mt-1 opacity-90">
                    無料（標準）
                  </div>
                </div>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              {useLLM
                ? '✨ AIが文章の文体や機械翻訳を高精度に検出します'
                : '📈 行動パターンのみで統計的に分析します（コスト0円）'}
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 shadow-md hover:shadow-lg"
          >
            テストを開始
          </button>
        </form>

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <span className="text-yellow-600 text-xl mr-2">⚠️</span>
            <div className="text-sm text-yellow-800">
              <p className="font-semibold mb-1">プライバシーに関する通知</p>
              <p>
                このテストでは、不正検出のため以下の行動ログを収集します：
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>ウィンドウの切り替え</li>
                <li>コピー・ペースト操作</li>
                <li>マウスの動き</li>
                <li>解答時間</li>
              </ul>
              <p className="mt-2 text-xs">
                ※ 具体的なキー入力内容やマウス座標は収集しません
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            教師用ダッシュボードはこちら →
          </a>
        </div>
      </div>
    </main>
  );
}
