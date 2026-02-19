import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
}

/**
 * Hook for managing keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[], enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const altMatch = shortcut.altKey ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;

        if (keyMatch && ctrlMatch && altMatch && shiftMatch && metaMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);
};

/**
 * Common chess game shortcuts
 */
export const getGameShortcuts = (actions: {
  onUndo?: () => void;
  onRedo?: () => void;
  onFlip?: () => void;
  onNewGame?: () => void;
  onResign?: () => void;
  onDraw?: () => void;
  onAnalyze?: () => void;
  onFirst?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onLast?: () => void;
}): KeyboardShortcut[] => {
  const shortcuts: KeyboardShortcut[] = [];

  if (actions.onUndo) {
    shortcuts.push({
      key: 'z',
      ctrlKey: true,
      action: actions.onUndo,
      description: 'Undo move',
    });
  }

  if (actions.onRedo) {
    shortcuts.push({
      key: 'y',
      ctrlKey: true,
      action: actions.onRedo,
      description: 'Redo move',
    });
  }

  if (actions.onFlip) {
    shortcuts.push({
      key: 'f',
      action: actions.onFlip,
      description: 'Flip board',
    });
  }

  if (actions.onNewGame) {
    shortcuts.push({
      key: 'n',
      ctrlKey: true,
      action: actions.onNewGame,
      description: 'New game',
    });
  }

  if (actions.onResign) {
    shortcuts.push({
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      action: actions.onResign,
      description: 'Resign',
    });
  }

  if (actions.onDraw) {
    shortcuts.push({
      key: 'd',
      ctrlKey: true,
      shiftKey: true,
      action: actions.onDraw,
      description: 'Offer draw',
    });
  }

  if (actions.onAnalyze) {
    shortcuts.push({
      key: 'a',
      ctrlKey: true,
      action: actions.onAnalyze,
      description: 'Analyze game',
    });
  }

  // Navigation shortcuts
  if (actions.onFirst) {
    shortcuts.push({
      key: 'Home',
      action: actions.onFirst,
      description: 'Go to first move',
    });
  }

  if (actions.onPrevious) {
    shortcuts.push({
      key: 'ArrowLeft',
      action: actions.onPrevious,
      description: 'Previous move',
    });
  }

  if (actions.onNext) {
    shortcuts.push({
      key: 'ArrowRight',
      action: actions.onNext,
      description: 'Next move',
    });
  }

  if (actions.onLast) {
    shortcuts.push({
      key: 'End',
      action: actions.onLast,
      description: 'Go to last move',
    });
  }

  return shortcuts;
};
