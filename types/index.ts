// 行動ログの型定義
export interface BehaviorLog {
  // タイムスタンプ
  startTime: number;           // テスト開始時刻（UNIX timestamp）
  endTime?: number;            // テスト終了時刻
  
  // ウィンドウ・タブ操作
  blurCount: number;           // フォーカス喪失回数
  blurDurations: number[];     // 各離脱時間（ミリ秒）
  visibilityChangeCount: number; // タブ非表示回数
  
  // マウス操作
  mouseMoveCount: number;      // マウス移動回数（スロットリング済み）
  mouseInactiveTime: number;   // マウス停止時間の累計（ミリ秒）
  mouseLeaveCount: number;     // 画面外への移動回数
  
  // コピー・ペースト
  copyCount: number;           // コピー回数
  copiedTexts: string[];       // コピーされたテキスト（最大100文字×10個）
  pasteCount: number;          // ペースト回数
  cutCount: number;            // カット回数
  
  // キーボード入力
  keyPressCount: number;       // キー入力回数
  typingSpeed: number;         // タイピング速度（文字/秒）
  
  // その他
  rightClickCount: number;     // 右クリック回数
  scrollCount: number;         // スクロール回数
  scrollDistance: number;      // スクロール距離の累計（ピクセル）
}

// 問題の型定義
export interface Question {
  id: number;
  title: string;
  questionText: string;
  questionType: 'reading' | 'vocabulary' | 'grammar' | 'writing';
  difficulty: 'easy' | 'medium' | 'hard';
  correctAnswer: string | null;
  options: string[] | null;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

// 解答の型定義
export interface TestAttempt {
  id: string;
  sessionId: string;
  studentName: string;
  questionId: number;
  answer: string;
  answerTime: number;
  behaviorLogs: BehaviorLog;
  riskScore: number | null;
  llmAnalysis: LLMAnalysisResult | null;
  status: 'in_progress' | 'completed' | 'flagged';
  createdAt: Date;
  completedAt: Date | null;
}

// LLM分析結果の型定義
export interface LLMAnalysisResult {
  riskScore: number;
  translationLikelihood: number;
  reasons: string[];
  suspiciousPatterns: string[];
  answerQuality: number;
  recommendation: string;
}

// 受験者の状態（ダッシュボード用）
export interface StudentStatus {
  sessionId: string;
  studentName: string;
  currentQuestion: number;
  totalQuestions: number;
  riskScore: number;
  status: string;
  warnings: string[];
  accuracy: number;
  finalReport?: string | null;
  elapsedTime: number;
  lastActivity: string;
}

