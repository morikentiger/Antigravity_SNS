'use client';

import React from 'react';
import styles from './YuiVoicePanel.module.css';
import type { YuiSuggestions, SuggestionType } from './useYuiVoiceAssist';

interface YuiVoicePanelProps {
    isSupported: boolean;
    isListening: boolean;
    isSpeaking: boolean;
    isLoading: boolean;
    suggestions: YuiSuggestions | null;
    capturedContext: string | null;
    realtimeTranscript: string | null;
    showForgottenMessage: boolean;
    error: string | null;
    onRequestSuggestions: () => void;
    onSelectSuggestion: (type: SuggestionType) => void;
    onCancel: () => void;
}

export default function YuiVoicePanel({
    isSupported,
    isListening,
    isSpeaking,
    isLoading,
    suggestions,
    capturedContext,
    realtimeTranscript,
    showForgottenMessage,
    error,
    onRequestSuggestions,
    onSelectSuggestion,
    onCancel,
}: YuiVoicePanelProps) {
    // サポートされていない場合は非表示
    if (!isSupported) {
        return null;
    }

    // ルームに参加していない場合は非表示
    if (!isListening) {
        return null;
    }

    return (
        <div className={styles.panel}>
            {/* 発話中の場合 */}
            {isSpeaking && (
                <div className={styles.speakingState}>
                    <div className={styles.speakingIndicator}>
                        <span className={styles.speakingDot}></span>
                        <span className={styles.speakingDot}></span>
                        <span className={styles.speakingDot}></span>
                    </div>
                    <span className={styles.speakingText}>YUiが話しています...</span>
                    <button
                        className={styles.cancelButton}
                        onClick={onCancel}
                        type="button"
                    >
                        ✕ 停止
                    </button>
                </div>
            )}

            {/* 候補表示中の場合 */}
            {!isSpeaking && suggestions && (
                <div className={styles.suggestionsState}>
                    {/* 聞いた内容の表示 */}
                    <div className={styles.contextBox}>
                        <span className={styles.contextLabel}>👂 聞いた内容:</span>
                        {capturedContext ? (
                            <p className={styles.contextText}>「{capturedContext}」</p>
                        ) : (
                            <p className={styles.contextTextMuted}>（会話が取得できませんでした）</p>
                        )}
                    </div>
                    <p className={styles.suggestionsLabel}>YUiの一言を選んでね</p>
                    <div className={styles.suggestionButtons}>
                        <button
                            className={`${styles.suggestionButton} ${styles.summary}`}
                            onClick={() => onSelectSuggestion('summary')}
                            type="button"
                        >
                            <span className={styles.suggestionIcon}>📝</span>
                            <span className={styles.suggestionText}>{suggestions.summary}</span>
                        </button>
                        <button
                            className={`${styles.suggestionButton} ${styles.emotion}`}
                            onClick={() => onSelectSuggestion('emotion')}
                            type="button"
                        >
                            <span className={styles.suggestionIcon}>💭</span>
                            <span className={styles.suggestionText}>{suggestions.emotion}</span>
                        </button>
                        <button
                            className={`${styles.suggestionButton} ${styles.encourage}`}
                            onClick={() => onSelectSuggestion('encourage')}
                            type="button"
                        >
                            <span className={styles.suggestionIcon}>✨</span>
                            <span className={styles.suggestionText}>{suggestions.encourage}</span>
                        </button>
                    </div>
                    <button
                        className={styles.dismissButton}
                        onClick={onCancel}
                        type="button"
                    >
                        やっぱりやめる
                    </button>
                </div>
            )}

            {/* 通常状態（トリガーボタン） */}
            {!isSpeaking && !suggestions && (
                <>
                    <button
                        className={styles.triggerButton}
                        onClick={onRequestSuggestions}
                        disabled={isLoading}
                        type="button"
                    >
                        {isLoading ? (
                            <>
                                <span className={styles.loadingSpinner}></span>
                                <span>考え中...</span>
                            </>
                        ) : (
                            <>
                                <span className={styles.triggerIcon}>🤍</span>
                                <span>ナビ一言</span>
                            </>
                        )}
                    </button>

                    {/* リアルタイム聞き取り表示 */}
                    {realtimeTranscript && (
                        <div className={styles.realtimeBox}>
                            <span className={styles.realtimeLabel}>👂 今聞いています:</span>
                            <p className={styles.realtimeText}>「{realtimeTranscript}」</p>
                        </div>
                    )}
                </>
            )}

            {/* 忘却サイン */}
            {showForgottenMessage && (
                <div className={styles.forgottenMessage}>
                    🫧 この音声は保存されていません
                </div>
            )}

            {/* エラー表示 */}
            {error && (
                <p className={styles.errorText}>{error}</p>
            )}
        </div>
    );
}
