# ページ設計

## 📄 ページ一覧

| URL | 名称 | 対象ユーザー | 認証 |
|:---|:---|:---|:---|
| `/` | トップページ | 受験者 | 不要 |
| `/test` | テスト画面 | 受験者 | 不要 |
| `/test/result` | 結果画面 | 受験者 | 不要 |
| `/dashboard` | ダッシュボード | 教師/管理者 | 不要（MVP） |

---

## 1️⃣ トップページ (`/`)

### 目的
受験者が名前を入力してテストを開始する

### UI設計

```
┌────────────────────────────────────┐
│                                    │
│    📚 英語テスト不正検出システム    │
│                                    │
│    ────────────────────────        │
│                                    │
│    お名前を入力してください         │
│    ┌─────────────────────┐        │
│    │ 田中太郎            │        │
│    └─────────────────────┘        │
│                                    │
│    ┌─────────────────────┐        │
│    │   テストを開始      │        │
│    └─────────────────────┘        │
│                                    │
│    ⚠️ このテストでは、不正検出の    │
│       ため行動ログを収集します     │
│                                    │
└────────────────────────────────────┘
```

### コンポーネント構成

```tsx
// app/page.tsx
export default function HomePage() {
  return (
    <main>
      <Hero />
      <NameInputForm />
      <PrivacyNotice />
    </main>
  );
}
```

### 機能要件

| No | 機能 | 詳細 |
|:---|:---|:---|
| 1.1 | 名前入力 | 1〜50文字、必須 |
| 1.2 | バリデーション | 空欄チェック |
| 1.3 | セッションID生成 | UUID v4で生成 |
| 1.4 | ルーティング | `/test?sessionId=xxx&name=xxx` |

### 状態管理

```typescript
interface HomePageState {
  name: string;
  isValid: boolean;
  isLoading: boolean;
}
```

### API呼び出し
なし（クライアント側のみ）

---

## 2️⃣ テスト画面 (`/test`)

### 目的
英語の問題を表示し、受験者の行動をリアルタイムで収集する

### UI設計

```
┌────────────────────────────────────────────┐
│ 📝 英語テスト               田中太郎さん  │
├────────────────────────────────────────────┤
│                                            │
│  問題 1 / 5                     残り時間: 10:00 │
│                                            │
│  【長文読解】環境問題                      │
│  ────────────────────────────────         │
│                                            │
│  Climate change is one of the most         │
│  pressing issues facing our planet...      │
│                                            │
│  Question: What is the main cause of       │
│  climate change according to the passage?  │
│                                            │
│  ────────────────────────────────         │
│                                            │
│  あなたの解答:                             │
│  ┌────────────────────────────┐           │
│  │ The main cause is...        │           │
│  │                             │           │
│  └────────────────────────────┘           │
│                                            │
│  ┌──────────┐  ┌──────────┐             │
│  │ スキップ │  │ 次へ進む │             │
│  └──────────┘  └──────────┘             │
│                                            │
└────────────────────────────────────────────┘
```

### コンポーネント構成

```tsx
// app/test/page.tsx
export default function TestPage() {
  return (
    <main>
      <TestHeader />
      <BehaviorTracker>  {/* 行動ログ収集 */}
        <QuestionCard />
        <AnswerInput />
        <NavigationButtons />
      </BehaviorTracker>
      <ProgressBar />
    </main>
  );
}
```

### 機能要件

#### 2.1 問題表示機能

| No | 機能 | 詳細 |
|:---|:---|:---|
| 2.1.1 | 問題取得 | APIから問題データを取得 |
| 2.1.2 | 問題タイプ対応 | 記述式/選択式/並び替え |
| 2.1.3 | シンタックスハイライト | コードブロックの強調表示 |

#### 2.2 解答入力機能

| No | 機能 | 詳細 |
|:---|:---|:---|
| 2.2.1 | テキストエリア | 自動リサイズ |
| 2.2.2 | 文字数カウント | リアルタイム表示 |
| 2.2.3 | 自動保存 | 5秒ごとにローカルストレージ |

#### 2.3 行動ログ収集機能（重要）

| No | イベント | 収集データ |
|:---|:---|:---|
| 2.3.1 | ウィンドウフォーカス | `blur`, `focus`, `visibilitychange` |
| 2.3.2 | マウス操作 | `mousemove`, `mouseleave`, 座標 |
| 2.3.3 | コピー操作 | `copy`, コピーされたテキスト |
| 2.3.4 | ペースト操作 | `paste`, ペーストされたテキスト |
| 2.3.5 | キーボード入力 | `keydown`, 入力速度 |
| 2.3.6 | 時間計測 | 問題表示〜解答完了 |

**詳細は [behavior-tracking.md](./behavior-tracking.md) を参照**

#### 2.4 ナビゲーション機能

| No | 機能 | 詳細 |
|:---|:---|:---|
| 2.4.1 | 次へ進む | 解答を保存して次の問題へ |
| 2.4.2 | スキップ | 解答なしで次へ |
| 2.4.3 | 前の問題に戻る | 解答の修正可能 |
| 2.4.4 | 進捗表示 | 「3 / 5」形式 |

### 状態管理

```typescript
interface TestPageState {
  // 問題データ
  questions: Question[];
  currentQuestionIndex: number;
  
  // 解答データ
  answers: Map<number, string>;
  currentAnswer: string;
  
  // タイマー
  startTime: number;
  elapsedTime: number;
  
  // 行動ログ
  behaviorLogs: BehaviorLog;
  
  // UI状態
  isSubmitting: boolean;
  error: string | null;
}
```

### API呼び出し

```typescript
// 1. 問題取得
GET /api/questions
Response: Question[]

// 2. 行動ログ送信（ポーリング）
POST /api/behavior-logs
Body: {
  sessionId: string;
  questionId: number;
  logs: BehaviorLog;
}

// 3. 解答送信
POST /api/submit
Body: {
  sessionId: string;
  questionId: number;
  answer: string;
  answerTime: number;
  behaviorLogs: BehaviorLog;
}
```

### ライフサイクル

```
マウント
  ↓
問題データ取得
  ↓
タイマー開始
  ↓
行動ログ収集開始（バックグラウンド）
  ↓
【ユーザー操作】
  ├─ 解答入力
  ├─ ウィンドウ切り替え（検出！）
  └─ コピー操作（検出！）
  ↓
解答送信
  ↓
LLM分析トリガー（バックエンド）
  ↓
次の問題 or 結果画面
```

---

## 3️⃣ 結果画面 (`/test/result`)

### 目的
受験完了を通知し、教師用ダッシュボードへ誘導

### UI設計

```
┌────────────────────────────────────┐
│                                    │
│    ✅ テスト完了                    │
│                                    │
│    田中太郎さん、お疲れ様でした！   │
│                                    │
│    回答した問題数: 5 / 5            │
│    所要時間: 15分32秒               │
│                                    │
│    結果は教師が確認します。         │
│                                    │
│    ┌─────────────────────┐        │
│    │ ダッシュボードを見る │        │
│    └─────────────────────┘        │
│                                    │
└────────────────────────────────────┘
```

### 機能要件

| No | 機能 | 詳細 |
|:---|:---|:---|
| 3.1 | 完了通知 | 受験完了をDBに記録 |
| 3.2 | 統計表示 | 所要時間、問題数 |
| 3.3 | ダッシュボードリンク | `/dashboard` へ遷移 |

---

## 4️⃣ ダッシュボード (`/dashboard`)

### 目的
教師が受験者の状況とリスクスコアをリアルタイムで確認

### UI設計

```
┌──────────────────────────────────────────────────────┐
│ 🎓 教師用ダッシュボード                    🔄 更新中  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  📊 リアルタイム状況                                  │
│  ─────────────────────────────────────────          │
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │ 👤 田中太郎              🚨 リスク: 85% │         │
│  │ 問題3を解答中              経過時間: 5分 │         │
│  │                                        │         │
│  │ ⚠️ 警告:                                │         │
│  │  • ウィンドウを5回離れています          │         │
│  │  • 問題文を2回コピーしました            │         │
│  │  • 解答の文体が機械翻訳に酷似           │         │
│  │                                        │         │
│  │ [詳細を見る]                           │         │
│  └────────────────────────────────────────┘         │
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │ 👤 佐藤花子              ✅ リスク: 12% │         │
│  │ 問題5を解答中              経過時間: 8分 │         │
│  │ 正常な行動パターン                      │         │
│  └────────────────────────────────────────┘         │
│                                                      │
│  ┌────────────────────────────────────────┐         │
│  │ 👤 鈴木一郎              ✅ 完了        │         │
│  │ 全問題完了                所要時間: 12分 │         │
│  │ リスクスコア: 8%                        │         │
│  └────────────────────────────────────────┘         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### コンポーネント構成

```tsx
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <main>
      <DashboardHeader />
      <RealtimeUpdater />  {/* ポーリング処理 */}
      <StudentList>
        <StudentCard />  {/* リスクスコア表示 */}
      </StudentList>
      <FilterControls />
    </main>
  );
}
```

### 機能要件

#### 4.1 リアルタイム更新

| No | 機能 | 詳細 |
|:---|:---|:---|
| 4.1.1 | ポーリング | 2秒ごとにAPIを呼び出し |
| 4.1.2 | 差分更新 | 変更があった部分のみ再レンダリング |
| 4.1.3 | 自動スクロール | 新規受験者を表示 |

#### 4.2 リスクスコア表示

| No | 機能 | 詳細 |
|:---|:---|:---|
| 4.2.1 | スコア算出 | LLM分析結果をもとに算出 |
| 4.2.2 | 色分け | 緑(0-30%), 黄(31-69%), 赤(70-100%) |
| 4.2.3 | アラート | 70%以上で警告アイコン |

#### 4.3 分析結果表示

| No | 機能 | 詳細 |
|:---|:---|:---|
| 4.3.1 | 行動パターン | ウィンドウ切り替え回数など |
| 4.3.2 | LLM分析 | 機械翻訳の可能性など |
| 4.3.3 | タイムライン | 行動の時系列表示 |

#### 4.4 フィルタリング

| No | 機能 | 詳細 |
|:---|:---|:---|
| 4.4.1 | リスク順 | 高リスクから表示 |
| 4.4.2 | ステータス別 | 進行中/完了/フラグ付き |
| 4.4.3 | 検索 | 受験者名で検索 |

### 状態管理

```typescript
interface DashboardState {
  // 受験者データ
  students: StudentStatus[];
  
  // フィルター
  filter: 'all' | 'in_progress' | 'completed' | 'flagged';
  sortBy: 'riskScore' | 'createdAt' | 'name';
  
  // リアルタイム更新
  isPolling: boolean;
  lastUpdate: number;
  
  // UI状態
  selectedStudentId: string | null;
  isDetailModalOpen: boolean;
}

interface StudentStatus {
  sessionId: string;
  name: string;
  currentQuestion: number;
  totalQuestions: number;
  riskScore: number;
  status: string;
  warnings: string[];
  elapsedTime: number;
}
```

### API呼び出し

```typescript
// リアルタイム状況取得（2秒ごと）
GET /api/students/status
Response: StudentStatus[]

// 詳細情報取得
GET /api/students/{sessionId}
Response: {
  student: StudentStatus;
  attempts: TestAttempt[];
  behaviorLogs: BehaviorLog[];
}
```

### ポーリング実装

```typescript
useEffect(() => {
  const interval = setInterval(async () => {
    const response = await fetch('/api/students/status');
    const data = await response.json();
    setStudents(data);
  }, 2000); // 2秒間隔

  return () => clearInterval(interval);
}, []);
```

---

## 🎨 デザインシステム

### カラーパレット

| 用途 | カラー | Tailwind |
|:---|:---|:---|
| プライマリ | #3B82F6 | `bg-blue-500` |
| 危険（高リスク） | #EF4444 | `bg-red-500` |
| 警告（中リスク） | #F59E0B | `bg-yellow-500` |
| 安全（低リスク） | #10B981 | `bg-green-500` |
| 背景 | #F9FAFB | `bg-gray-50` |
| テキスト | #111827 | `text-gray-900` |

### タイポグラフィ

| 要素 | フォント | サイズ |
|:---|:---|:---|
| 見出し1 | Noto Sans JP | 2xl (24px) |
| 見出し2 | Noto Sans JP | xl (20px) |
| 本文 | Noto Sans JP | base (16px) |
| キャプション | Noto Sans JP | sm (14px) |

### レスポンシブ

| ブレークポイント | 対象デバイス | 備考 |
|:---|:---|:---|
| sm (640px~) | タブレット | 縦持ち対応 |
| md (768px~) | タブレット | 横持ち対応 |
| lg (1024px~) | PC | デフォルト |

---

## 🔄 画面遷移図

```
┌─────────┐
│  / (TOP)│
└────┬────┘
     │ 名前入力
     ↓
┌─────────┐
│  /test  │←──┐
└────┬────┘   │
     │        │ 次の問題
     │ 全問完了│
     ↓        │
┌─────────────┐
│ /test/result│
└──────┬──────┘
       │
       ↓
┌──────────────┐
│ /dashboard   │ ← 教師が常時監視
└──────────────┘
```

---

## ⚡ パフォーマンス最適化

| 最適化項目 | 手法 |
|:---|:---|
| 初期ロード | Code Splitting（Next.js自動） |
| 画像最適化 | `next/image`使用 |
| フォント最適化 | `next/font`使用 |
| データ取得 | SWR/React Queryでキャッシュ |
| 再レンダリング抑制 | `useMemo`, `useCallback` |

---

次はAPI設計を作成します！

