# 行動トラッキング詳細設計

## 🎯 目的

受験者の**不正につながりやすい行動パターン**を、プライバシーに配慮しつつ収集する。

---

## 📊 収集する行動データ

### 1. ウィンドウ・タブ操作

| イベント | 検出方法 | 収集データ | 不正との関連性 |
|:---|:---|:---|:---|
| **フォーカス喪失** | `blur` | 回数、各時間 | 翻訳サイトへの切り替え可能性 |
| **タブ非表示** | `visibilitychange` | 回数、各時間 | 別タブでのカンニング可能性 |
| **ページ離脱** | `beforeunload` | 回数 | 不正終了の検出 |

#### 実装例

```typescript
// components/BehaviorTracker.tsx
useEffect(() => {
  let blurStartTime: number | null = null;
  
  const handleBlur = () => {
    blurStartTime = Date.now();
    setBehaviorLogs(prev => ({
      ...prev,
      blurCount: prev.blurCount + 1,
    }));
  };
  
  const handleFocus = () => {
    if (blurStartTime) {
      const duration = Date.now() - blurStartTime;
      setBehaviorLogs(prev => ({
        ...prev,
        blurDurations: [...prev.blurDurations, duration],
      }));
      blurStartTime = null;
    }
  };
  
  const handleVisibilityChange = () => {
    if (document.hidden) {
      handleBlur();
    } else {
      handleFocus();
    }
  };
  
  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, []);
```

---

### 2. マウス操作

| イベント | 検出方法 | 収集データ | 不正との関連性 |
|:---|:---|:---|:---|
| **マウス移動** | `mousemove` | 移動回数 | アクティビティの証明 |
| **マウス停止** | `mousemove`の間隔 | 停止時間（累計） | 他人が解答している可能性 |
| **画面外移動** | `mouseleave` | 回数 | 別画面での作業可能性 |

#### 実装例

```typescript
useEffect(() => {
  let lastMoveTime = Date.now();
  let inactiveTimer: NodeJS.Timeout;
  
  const handleMouseMove = () => {
    const now = Date.now();
    const inactiveTime = now - lastMoveTime;
    
    // 5秒以上動いていなかった場合、停止時間として記録
    if (inactiveTime > 5000) {
      setBehaviorLogs(prev => ({
        ...prev,
        mouseInactiveTime: prev.mouseInactiveTime + inactiveTime,
      }));
    }
    
    setBehaviorLogs(prev => ({
      ...prev,
      mouseMoveCount: prev.mouseMoveCount + 1,
    }));
    
    lastMoveTime = now;
  };
  
  const handleMouseLeave = () => {
    setBehaviorLogs(prev => ({
      ...prev,
      mouseLeaveCount: prev.mouseLeaveCount + 1,
    }));
  };
  
  // スロットリング（100msごと）
  const throttledMouseMove = throttle(handleMouseMove, 100);
  
  document.addEventListener('mousemove', throttledMouseMove);
  document.addEventListener('mouseleave', handleMouseLeave);
  
  return () => {
    document.removeEventListener('mousemove', throttledMouseMove);
    document.removeEventListener('mouseleave', handleMouseLeave);
  };
}, []);

// スロットリング関数
function throttle(func: Function, delay: number) {
  let lastCall = 0;
  return function (...args: any[]) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}
```

---

### 3. コピー・ペースト操作

| イベント | 検出方法 | 収集データ | 不正との関連性 |
|:---|:---|:---|:---|
| **コピー** | `copy` | 回数、テキスト内容 | 問題文を外部ツールに貼り付け可能性 |
| **ペースト** | `paste` | 回数 | 外部から解答をコピペ |
| **カット** | `cut` | 回数 | コピーと同様 |

#### 実装例

```typescript
useEffect(() => {
  const handleCopy = (e: ClipboardEvent) => {
    const copiedText = window.getSelection()?.toString() || '';
    
    setBehaviorLogs(prev => ({
      ...prev,
      copyCount: prev.copyCount + 1,
      copiedTexts: [...prev.copiedTexts, copiedText.substring(0, 100)], // 最大100文字
    }));
  };
  
  const handlePaste = (e: ClipboardEvent) => {
    setBehaviorLogs(prev => ({
      ...prev,
      pasteCount: prev.pasteCount + 1,
    }));
  };
  
  document.addEventListener('copy', handleCopy);
  document.addEventListener('paste', handlePaste);
  
  return () => {
    document.removeEventListener('copy', handleCopy);
    document.removeEventListener('paste', handlePaste);
  };
}, []);
```

---

### 4. キーボード入力

| イベント | 検出方法 | 収集データ | 不正との関連性 |
|:---|:---|:---|:---|
| **キー入力** | `keydown` | 入力回数 | タイピング速度の計測 |
| **入力速度** | `keydown`の間隔 | 文字/秒 | 異常に速い場合、コピペの可能性 |

#### 実装例

```typescript
useEffect(() => {
  let keyPressTimestamps: number[] = [];
  
  const handleKeyDown = () => {
    const now = Date.now();
    keyPressTimestamps.push(now);
    
    // 直近10秒間のキー入力のみ保持
    keyPressTimestamps = keyPressTimestamps.filter(
      ts => now - ts < 10000
    );
    
    // タイピング速度を計算（文字/秒）
    const typingSpeed = keyPressTimestamps.length / 10;
    
    setBehaviorLogs(prev => ({
      ...prev,
      keyPressCount: prev.keyPressCount + 1,
      typingSpeed: typingSpeed,
    }));
  };
  
  const answerInput = document.getElementById('answer-input');
  answerInput?.addEventListener('keydown', handleKeyDown);
  
  return () => {
    answerInput?.removeEventListener('keydown', handleKeyDown);
  };
}, []);
```

---

### 5. その他の操作

| イベント | 検出方法 | 収集データ | 不正との関連性 |
|:---|:---|:---|:---|
| **右クリック** | `contextmenu` | 回数 | 翻訳拡張機能の使用可能性 |
| **スクロール** | `scroll` | 回数、スクロール量 | 問題文の読み方の分析 |

---

## 📦 BehaviorLog型定義

```typescript
// types/index.ts

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
```

---

## 🔧 BehaviorTrackerコンポーネント

```typescript
// components/BehaviorTracker.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { BehaviorLog } from '@/types';

interface BehaviorTrackerContextValue {
  behaviorLogs: BehaviorLog;
  resetLogs: () => void;
}

const BehaviorTrackerContext = createContext<BehaviorTrackerContextValue | null>(null);

export function useBehaviorTracker() {
  const context = useContext(BehaviorTrackerContext);
  if (!context) {
    throw new Error('useBehaviorTracker must be used within BehaviorTracker');
  }
  return context;
}

interface Props {
  children: ReactNode;
  onLogsChange?: (logs: BehaviorLog) => void;
}

export function BehaviorTracker({ children, onLogsChange }: Props) {
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog>({
    startTime: Date.now(),
    blurCount: 0,
    blurDurations: [],
    visibilityChangeCount: 0,
    mouseMoveCount: 0,
    mouseInactiveTime: 0,
    mouseLeaveCount: 0,
    copyCount: 0,
    copiedTexts: [],
    pasteCount: 0,
    cutCount: 0,
    keyPressCount: 0,
    typingSpeed: 0,
    rightClickCount: 0,
    scrollCount: 0,
    scrollDistance: 0,
  });

  const resetLogs = () => {
    setBehaviorLogs({
      startTime: Date.now(),
      blurCount: 0,
      blurDurations: [],
      visibilityChangeCount: 0,
      mouseMoveCount: 0,
      mouseInactiveTime: 0,
      mouseLeaveCount: 0,
      copyCount: 0,
      copiedTexts: [],
      pasteCount: 0,
      cutCount: 0,
      keyPressCount: 0,
      typingSpeed: 0,
      rightClickCount: 0,
      scrollCount: 0,
      scrollDistance: 0,
    });
  };

  // ここに上記の各イベントリスナーを実装
  // ...

  // ログ変更時のコールバック
  useEffect(() => {
    if (onLogsChange) {
      onLogsChange(behaviorLogs);
    }
  }, [behaviorLogs, onLogsChange]);

  return (
    <BehaviorTrackerContext.Provider value={{ behaviorLogs, resetLogs }}>
      {children}
    </BehaviorTrackerContext.Provider>
  );
}
```

---

## 🚨 不正パターンの定義

### パターン1: コピー → 切り替え → 高速解答

```typescript
function detectPattern1(logs: BehaviorLog, answerTime: number): boolean {
  return (
    logs.copyCount > 0 &&
    logs.blurCount > 0 &&
    answerTime < 60 && // 60秒未満
    logs.blurDurations.some(d => d > 3000) // 3秒以上の離脱
  );
}
```

### パターン2: マウス長時間停止 → 高品質な解答

```typescript
function detectPattern2(logs: BehaviorLog, answerQuality: number): boolean {
  return (
    logs.mouseInactiveTime > 60000 && // 60秒以上停止
    answerQuality > 0.8 // LLMによる品質評価
  );
}
```

### パターン3: 異常に速いタイピング

```typescript
function detectPattern3(logs: BehaviorLog): boolean {
  return logs.typingSpeed > 5; // 5文字/秒以上
}
```

### パターン4: 頻繁なウィンドウ切り替え

```typescript
function detectPattern4(logs: BehaviorLog): boolean {
  return logs.blurCount > 5; // 5回以上
}
```

---

## 📊 リスクスコア計算式

```typescript
function calculateRiskScore(
  logs: BehaviorLog,
  llmAnalysis: any,
  answerTime: number
): number {
  let score = 0;
  
  // 基本スコア（LLMの判断）
  score += llmAnalysis.baseRiskScore || 0;
  
  // 行動パターンによる加算
  if (detectPattern1(logs, answerTime)) score += 25;
  if (detectPattern2(logs, llmAnalysis.answerQuality)) score += 20;
  if (detectPattern3(logs)) score += 15;
  if (detectPattern4(logs)) score += 20;
  
  // 個別の行動による加算
  if (logs.blurCount > 3) score += 10;
  if (logs.copyCount > 2) score += 15;
  if (logs.pasteCount > 0) score += 20;
  if (logs.rightClickCount > 3) score += 10;
  
  // 翻訳可能性による加算
  if (llmAnalysis.translationLikelihood > 70) score += 25;
  
  return Math.min(100, Math.max(0, score));
}
```

---

## ⚠️ プライバシー配慮

### 収集しないデータ
- ❌ キー入力の具体的な内容
- ❌ マウスの座標（移動回数のみ）
- ❌ スクリーンショット
- ❌ カメラ・マイク
- ❌ 他サイトの閲覧履歴

### データの匿名化
- コピーしたテキストは最大100文字に制限
- 個人を特定できる情報は収集しない

### ユーザーへの通知
トップページで以下を明示：
> ⚠️ このテストでは、不正検出のため行動ログ（ウィンドウ切り替え、コピー操作など）を収集します。

---

次はLLM統合の設計を作成します！

