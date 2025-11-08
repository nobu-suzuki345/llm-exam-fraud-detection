'use client';

import type { Question } from '@/types';

interface QuestionCardProps {
  question: Question;
  answer: string;
  onAnswerChange: (answer: string) => void;
}

export function QuestionCard({ question, answer, onAnswerChange }: QuestionCardProps) {
  const options = question.options 
    ? (typeof question.options === 'string' ? JSON.parse(question.options) : question.options)
    : null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'hard':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '初級';
      case 'medium':
        return '中級';
      case 'hard':
        return '上級';
      default:
        return difficulty;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">{question.title}</h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(question.difficulty)}`}>
            {getDifficultyLabel(question.difficulty)}
          </span>
          <span className="text-sm text-gray-600">{question.maxScore}点</span>
        </div>
      </div>

      {/* 問題文 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="prose prose-sm max-w-none">
          {question.questionText.split('\n').map((line, index) => {
            // **太字**を処理
            const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            return (
              <p
                key={index}
                className={`${line.startsWith('**') ? 'font-bold' : ''} ${!line.trim() ? 'h-2' : ''}`}
                dangerouslySetInnerHTML={{ __html: boldLine }}
              />
            );
          })}
        </div>
      </div>

      {/* 解答入力 */}
      <div>
        {options ? (
          // 選択式
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 mb-3">解答を選択してください：</p>
            {options.map((option: string, index: number) => (
              <label
                key={index}
                className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition"
              >
                <input
                  type="radio"
                  name="answer"
                  value={option.charAt(0)} // "A)", "B)" などから"A", "B"を取得
                  checked={answer === option.charAt(0)}
                  onChange={(e) => onAnswerChange(e.target.value)}
                  className="w-5 h-5 text-blue-600"
                />
                <span className="ml-3 text-gray-800">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          // 記述式
          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
              あなたの解答：
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => onAnswerChange(e.target.value)}
              className="w-full h-48 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              placeholder="こちらに解答を入力してください..."
            />
            <div className="mt-2 text-right text-sm text-gray-500">
              {answer.length} 文字
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

