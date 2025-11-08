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

const createInitialLogs = (): BehaviorLog => ({
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

export function BehaviorTracker({ children, onLogsChange }: Props) {
  const [behaviorLogs, setBehaviorLogs] = useState<BehaviorLog>(createInitialLogs());

  const resetLogs = () => {
    setBehaviorLogs(createInitialLogs());
  };

  useEffect(() => {
    let blurStartTime: number | null = null;
    let lastMoveTime = Date.now();
    let keyPressTimestamps: number[] = [];

    // 1. ウィンドウ・タブ操作の追跡
    const handleBlur = () => {
      blurStartTime = Date.now();
      setBehaviorLogs((prev) => ({
        ...prev,
        blurCount: prev.blurCount + 1,
      }));
    };

    const handleFocus = () => {
      if (blurStartTime) {
        const duration = Date.now() - blurStartTime;
        setBehaviorLogs((prev) => ({
          ...prev,
          blurDurations: [...prev.blurDurations, duration],
        }));
        blurStartTime = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleBlur();
        setBehaviorLogs((prev) => ({
          ...prev,
          visibilityChangeCount: prev.visibilityChangeCount + 1,
        }));
      } else {
        handleFocus();
      }
    };

    // 2. マウス操作の追跡
    const handleMouseMove = () => {
      const now = Date.now();
      const inactiveTime = now - lastMoveTime;

      // 5秒以上動いていなかった場合、停止時間として記録
      if (inactiveTime > 5000) {
        setBehaviorLogs((prev) => ({
          ...prev,
          mouseInactiveTime: prev.mouseInactiveTime + inactiveTime,
        }));
      }

      setBehaviorLogs((prev) => ({
        ...prev,
        mouseMoveCount: prev.mouseMoveCount + 1,
      }));

      lastMoveTime = now;
    };

    const handleMouseLeave = () => {
      setBehaviorLogs((prev) => ({
        ...prev,
        mouseLeaveCount: prev.mouseLeaveCount + 1,
      }));
    };

    // スロットリング（100msごと）
    const throttledMouseMove = throttle(handleMouseMove, 100);

    // 3. コピー・ペースト操作の追跡
    const handleCopy = () => {
      const copiedText = window.getSelection()?.toString() || '';

      setBehaviorLogs((prev) => ({
        ...prev,
        copyCount: prev.copyCount + 1,
        copiedTexts: [
          ...prev.copiedTexts,
          copiedText.substring(0, 100), // 最大100文字
        ].slice(-10), // 最大10個まで保持
      }));
    };

    const handlePaste = () => {
      setBehaviorLogs((prev) => ({
        ...prev,
        pasteCount: prev.pasteCount + 1,
      }));
    };

    const handleCut = () => {
      setBehaviorLogs((prev) => ({
        ...prev,
        cutCount: prev.cutCount + 1,
      }));
    };

    // 4. キーボード入力の追跡
    const handleKeyDown = () => {
      const now = Date.now();
      keyPressTimestamps.push(now);

      // 直近10秒間のキー入力のみ保持
      keyPressTimestamps = keyPressTimestamps.filter(
        (ts) => now - ts < 10000
      );

      // タイピング速度を計算（文字/秒）
      const typingSpeed = keyPressTimestamps.length / 10;

      setBehaviorLogs((prev) => ({
        ...prev,
        keyPressCount: prev.keyPressCount + 1,
        typingSpeed: typingSpeed,
      }));
    };

    // 5. その他の操作の追跡
    const handleContextMenu = (e: MouseEvent) => {
      // 右クリックを完全に無効化はしないが、カウントはする
      setBehaviorLogs((prev) => ({
        ...prev,
        rightClickCount: prev.rightClickCount + 1,
      }));
    };

    const handleScroll = () => {
      setBehaviorLogs((prev) => ({
        ...prev,
        scrollCount: prev.scrollCount + 1,
      }));
    };

    // イベントリスナーを登録
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', throttledMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('scroll', handleScroll);

    // クリーンアップ
    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', throttledMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

// スロットリング関数
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

