'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ref, push, onValue, get, set, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import HighlightTooltip from './HighlightTooltip';
import styles from './TextHighlighter.module.css';

export interface Highlight {
    id: string;
    text: string;
    startOffset: number;
    endOffset: number;
    creatorId: string;
    creatorName: string;
    creatorAvatar: string;
    timestamp: number;
    likes: number;
    likedBy: { [key: string]: boolean };
    comments?: { [key: string]: HighlightComment };
}

export interface HighlightComment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    content: string;
    timestamp: number;
}

interface TextHighlighterProps {
    children: string;
    threadId: string;
    replyId?: string;
    className?: string;
}

export default function TextHighlighter({ children, threadId, replyId, className }: TextHighlighterProps) {
    const { user } = useAuth();
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [selectedText, setSelectedText] = useState<{
        text: string;
        startOffset: number;
        endOffset: number;
        position: { x: number; y: number };
    } | null>(null);
    const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
    const [showHighlightActions, setShowHighlightActions] = useState(false);
    const [highlightActionsPosition, setHighlightActionsPosition] = useState({ x: 0, y: 0 });

    // ハイライトデータを取得
    useEffect(() => {
        const highlightsPath = replyId
            ? `highlights/${threadId}/replies/${replyId}`
            : `highlights/${threadId}/main`;
        const highlightsRef = ref(database, highlightsPath);

        const unsubscribe = onValue(highlightsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const highlightsArray = Object.entries(data).map(([id, h]: [string, any]) => ({
                    id,
                    ...h,
                }));
                setHighlights(highlightsArray);
            } else {
                setHighlights([]);
            }
        });

        return () => unsubscribe();
    }, [threadId, replyId]);

    // テキスト選択を処理
    const handleMouseUp = useCallback((e: React.MouseEvent) => {
        if (!user) return;

        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || !containerRef.current) {
            return;
        }

        const text = selection.toString().trim();
        if (!text) return;

        const range = selection.getRangeAt(0);
        const containerElement = containerRef.current;

        // コンテナ内の選択かどうかを確認
        if (!containerElement.contains(range.commonAncestorContainer)) {
            return;
        }

        // オフセットを計算
        const preSelectionRange = range.cloneRange();
        preSelectionRange.selectNodeContents(containerElement);
        preSelectionRange.setEnd(range.startContainer, range.startOffset);
        const startOffset = preSelectionRange.toString().length;
        const endOffset = startOffset + text.length;

        // ツールチップ位置を計算
        const rect = range.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();

        setSelectedText({
            text,
            startOffset,
            endOffset,
            position: {
                x: rect.left + rect.width / 2 - containerRect.left,
                y: rect.top - containerRect.top,
            },
        });
    }, [user]);

    // ハイライトをクリックした時
    const handleHighlightClick = useCallback((highlight: Highlight, e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) return;

        setActiveHighlight(highlight);
        setShowHighlightActions(true);
        setHighlightActionsPosition({
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.bottom - containerRect.top,
        });
    }, []);

    // 新規ハイライト作成
    const handleCreateHighlight = useCallback(async () => {
        console.log('handleCreateHighlight called', { user, selectedText });
        if (!user || !selectedText) {
            console.log('Early return: user or selectedText missing');
            return;
        }

        try {
            console.log('Creating highlight...', { threadId, replyId });
            const userDbRef = ref(database, `users/${user.uid}`);
            const userSnapshot = await get(userDbRef);
            const userData = userSnapshot.val();

            const highlightsPath = replyId
                ? `highlights/${threadId}/replies/${replyId}`
                : `highlights/${threadId}/main`;
            const highlightsRef = ref(database, highlightsPath);

            await push(highlightsRef, {
                text: selectedText.text,
                startOffset: selectedText.startOffset,
                endOffset: selectedText.endOffset,
                creatorId: user.uid,
                creatorName: userData?.displayName || user.displayName || 'Anonymous',
                creatorAvatar: userData?.photoURL || user.photoURL || '',
                timestamp: Date.now(),
                likes: 0,
                likedBy: {},
            });

            setSelectedText(null);
            window.getSelection()?.removeAllRanges();
        } catch (error) {
            console.error('Error creating highlight:', error);
        }
    }, [user, selectedText, threadId, replyId]);

    // ハイライトにいいね
    const handleLikeHighlight = useCallback(async () => {
        if (!user || !activeHighlight) return;

        try {
            const highlightsPath = replyId
                ? `highlights/${threadId}/replies/${replyId}/${activeHighlight.id}`
                : `highlights/${threadId}/main/${activeHighlight.id}`;
            const highlightRef = ref(database, highlightsPath);
            const snapshot = await get(highlightRef);
            const current = snapshot.val();

            const isLiked = current.likedBy?.[user.uid];
            const updatedLikedBy = { ...(current.likedBy || {}) };

            if (isLiked) {
                delete updatedLikedBy[user.uid];
            } else {
                updatedLikedBy[user.uid] = true;
            }

            await set(highlightRef, {
                ...current,
                likes: Object.keys(updatedLikedBy).length,
                likedBy: updatedLikedBy,
            });
        } catch (error) {
            console.error('Error liking highlight:', error);
        }
    }, [user, activeHighlight, threadId, replyId]);

    // ツールチップを閉じる
    const handleClose = useCallback(() => {
        setSelectedText(null);
        setActiveHighlight(null);
        setShowHighlightActions(false);
        window.getSelection()?.removeAllRanges();
    }, []);

    // ドキュメントクリックでツールチップを閉じる
    useEffect(() => {
        const handleDocumentClick = (e: MouseEvent) => {
            // ツールチップ内のクリックは除外
            if (tooltipRef.current && tooltipRef.current.contains(e.target as Node)) {
                return;
            }
            // コンテナ外のクリックで閉じる
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                handleClose();
            }
        };

        document.addEventListener('mousedown', handleDocumentClick);
        return () => document.removeEventListener('mousedown', handleDocumentClick);
    }, [handleClose]);

    // テキストをハイライト付きでレンダリング
    const renderHighlightedText = () => {
        const text = children;
        if (highlights.length === 0) return text;

        // ハイライトを開始位置でソート
        const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

        const parts: React.ReactNode[] = [];
        let lastEnd = 0;

        sortedHighlights.forEach((highlight, index) => {
            // ハイライト前のテキスト
            if (highlight.startOffset > lastEnd) {
                parts.push(text.slice(lastEnd, highlight.startOffset));
            }

            // ハイライト部分
            const isActive = activeHighlight?.id === highlight.id;
            const isLiked = user && highlight.likedBy?.[user.uid];
            parts.push(
                <span
                    key={highlight.id}
                    className={`${styles.highlight} ${isActive ? styles.active : ''} ${isLiked ? styles.liked : ''}`}
                    onClick={(e) => handleHighlightClick(highlight, e)}
                    title={`${highlight.likes} いいね`}
                >
                    {text.slice(highlight.startOffset, highlight.endOffset)}
                </span>
            );

            lastEnd = highlight.endOffset;
        });

        // 最後のテキスト
        if (lastEnd < text.length) {
            parts.push(text.slice(lastEnd));
        }

        return parts;
    };

    return (
        <div
            ref={containerRef}
            className={`${styles.container} ${className || ''}`}
            onMouseUp={handleMouseUp}
        >
            {renderHighlightedText()}

            {/* 新規ハイライト作成ツールチップ */}
            {selectedText && user && (
                <HighlightTooltip
                    ref={tooltipRef}
                    position={selectedText.position}
                    mode="create"
                    onHighlight={handleCreateHighlight}
                    onClose={handleClose}
                />
            )}

            {/* 既存ハイライトのアクションツールチップ */}
            {showHighlightActions && activeHighlight && user && (
                <HighlightTooltip
                    ref={tooltipRef}
                    position={highlightActionsPosition}
                    mode="actions"
                    highlight={activeHighlight}
                    isLiked={!!activeHighlight.likedBy?.[user.uid]}
                    threadId={threadId}
                    replyId={replyId}
                    onLike={handleLikeHighlight}
                    onClose={handleClose}
                />
            )}
        </div>
    );
}
