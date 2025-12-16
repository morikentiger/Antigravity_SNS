'use client';

import React, { useState, useEffect, forwardRef } from 'react';
import { ref, get, push, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Avatar from '@/components/common/Avatar';
import type { Highlight, HighlightComment } from './TextHighlighter';
import styles from './HighlightTooltip.module.css';

interface LikerInfo {
    uid: string;
    photoURL: string;
}

interface HighlightTooltipProps {
    position: { x: number; y: number };
    mode: 'create' | 'actions';
    highlight?: Highlight;
    isLiked?: boolean;
    threadId?: string;
    replyId?: string;
    onHighlight?: () => void;
    onLike?: () => void;
    onClose: () => void;
}

const HighlightTooltip = forwardRef<HTMLDivElement, HighlightTooltipProps>(({
    position,
    mode,
    highlight,
    isLiked,
    threadId,
    replyId,
    onHighlight,
    onLike,
    onClose,
}, forwardedRef) => {
    const { user } = useAuth();
    const [showCommentInput, setShowCommentInput] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [likers, setLikers] = useState<LikerInfo[]>([]);
    const [comments, setComments] = useState<HighlightComment[]>([]);

    // いいねしたユーザーのアバター情報を取得
    useEffect(() => {
        if (!highlight?.likedBy) {
            setLikers([]);
            return;
        }

        const fetchLikers = async () => {
            const likerIds = Object.keys(highlight.likedBy).filter(uid => highlight.likedBy[uid]);
            const likerInfos: LikerInfo[] = [];

            for (const uid of likerIds.slice(0, 5)) { // 最大5人まで表示
                try {
                    const userRef = ref(database, `users/${uid}`);
                    const snapshot = await get(userRef);
                    const userData = snapshot.val();
                    likerInfos.push({
                        uid,
                        photoURL: userData?.photoURL || '',
                    });
                } catch (error) {
                    console.error(`Error fetching liker ${uid}:`, error);
                }
            }

            setLikers(likerInfos);
        };

        fetchLikers();
    }, [highlight?.likedBy]);

    // コメントを配列に変換
    useEffect(() => {
        if (highlight?.comments) {
            const commentsArray = Object.entries(highlight.comments).map(([commentId, c]) => ({
                ...c,
                id: commentId,
            }));
            commentsArray.sort((a, b) => a.timestamp - b.timestamp);
            setComments(commentsArray);
        } else {
            setComments([]);
        }
    }, [highlight?.comments]);

    // コメント送信
    const handleSubmitComment = async () => {
        if (!user || !highlight || !commentText.trim() || !threadId) return;

        setIsSubmitting(true);
        try {
            const userDbRef = ref(database, `users/${user.uid}`);
            const userSnapshot = await get(userDbRef);
            const userData = userSnapshot.val();

            const highlightsPath = replyId
                ? `highlights/${threadId}/replies/${replyId}/${highlight.id}/comments`
                : `highlights/${threadId}/main/${highlight.id}/comments`;
            const commentsRef = ref(database, highlightsPath);

            await push(commentsRef, {
                userId: user.uid,
                userName: userData?.displayName || user.displayName || 'Anonymous',
                userAvatar: userData?.photoURL || user.photoURL || '',
                content: commentText.trim(),
                timestamp: Date.now(),
            });

            setCommentText('');
            setShowCommentInput(false);
        } catch (error) {
            console.error('Error posting comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div
            ref={forwardedRef}
            className={styles.tooltip}
            style={{
                left: `${position.x}px`,
                top: mode === 'create' ? `${position.y - 10}px` : `${position.y + 10}px`,
                transform: mode === 'create'
                    ? 'translate(-50%, -100%)'
                    : 'translate(-50%, 0)',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {mode === 'create' ? (
                <button className={styles.createButton} onClick={onHighlight}>
                    <span className={styles.icon}>✨</span>
                    <span>ハイライト</span>
                </button>
            ) : (
                <div className={styles.actionsContainer}>
                    <div className={styles.actions}>
                        {/* いいねボタン */}
                        <button
                            className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
                            onClick={onLike}
                            title="いいね"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                        </button>

                        {/* いいねしたユーザーのアイコン表示 */}
                        {likers.length > 0 && (
                            <div className={styles.likerAvatars}>
                                {likers.map((liker) => (
                                    <div key={liker.uid} className={styles.likerAvatar}>
                                        <Avatar src={liker.photoURL} alt="" size="xs" />
                                    </div>
                                ))}
                                {highlight && highlight.likes > 5 && (
                                    <span className={styles.moreCount}>+{highlight.likes - 5}</span>
                                )}
                            </div>
                        )}

                        {/* コメントボタン */}
                        <button
                            className={`${styles.actionButton} ${showCommentInput ? styles.active : ''}`}
                            onClick={() => setShowCommentInput(!showCommentInput)}
                            title="コメント"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                            {comments.length > 0 && (
                                <span className={styles.count}>{comments.length}</span>
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

                    {/* コメント表示・入力エリア */}
                    {(showCommentInput || comments.length > 0) && (
                        <div className={styles.commentsSection}>
                            {/* 既存コメント */}
                            {comments.length > 0 && (
                                <div className={styles.commentsList}>
                                    {comments.map((comment) => (
                                        <div key={comment.id} className={styles.commentItem}>
                                            <Avatar src={comment.userAvatar} alt={comment.userName} size="xs" />
                                            <div className={styles.commentContent}>
                                                <span className={styles.commentAuthor}>{comment.userName}</span>
                                                <span className={styles.commentText}>{comment.content}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* コメント入力 */}
                            {showCommentInput && user && (
                                <div className={styles.commentInput}>
                                    <input
                                        type="text"
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="コメントを入力..."
                                        className={styles.input}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSubmitComment();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleSubmitComment}
                                        disabled={!commentText.trim() || isSubmitting}
                                        className={styles.submitButton}
                                    >
                                        {isSubmitting ? '...' : '送信'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

HighlightTooltip.displayName = 'HighlightTooltip';

export default HighlightTooltip;
