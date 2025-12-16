'use client';

import React from 'react';
import type { Highlight } from './TextHighlighter';
import styles from './HighlightTooltip.module.css';

interface HighlightTooltipProps {
    position: { x: number; y: number };
    mode: 'create' | 'actions';
    highlight?: Highlight;
    isLiked?: boolean;
    onHighlight?: () => void;
    onLike?: () => void;
    onComment?: () => void;
    onClose: () => void;
}

export default function HighlightTooltip({
    position,
    mode,
    highlight,
    isLiked,
    onHighlight,
    onLike,
    onComment,
    onClose,
}: HighlightTooltipProps) {
    return (
        <div
            className={styles.tooltip}
            style={{
                left: `${position.x}px`,
                top: mode === 'create' ? `${position.y - 10}px` : `${position.y + 10}px`,
                transform: mode === 'create'
                    ? 'translate(-50%, -100%)'
                    : 'translate(-50%, 0)',
            }}
            onClick={(e) => e.stopPropagation()}
        >
            {mode === 'create' ? (
                <button className={styles.createButton} onClick={onHighlight}>
                    <span className={styles.icon}>✨</span>
                    <span>ハイライト</span>
                </button>
            ) : (
                <div className={styles.actions}>
                    <button
                        className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
                        onClick={onLike}
                        title="いいね"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {highlight && highlight.likes > 0 && (
                            <span className={styles.count}>{highlight.likes}</span>
                        )}
                    </button>
                    <button
                        className={styles.actionButton}
                        onClick={onComment}
                        title="コメント"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {highlight?.comments && Object.keys(highlight.comments).length > 0 && (
                            <span className={styles.count}>{Object.keys(highlight.comments).length}</span>
                        )}
                    </button>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        title="閉じる"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    );
}
