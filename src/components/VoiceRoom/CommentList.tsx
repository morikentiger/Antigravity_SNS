'use client';

import React, { useState, useEffect } from 'react';
import Avatar from '@/components/common/Avatar';
import styles from './CommentList.module.css';

export interface Comment {
    id: string;
    type: 'message' | 'join' | 'image';
    userId: string;
    userName: string;
    userAvatar: string;
    content?: string;
    imageUrl?: string;
    timestamp: number;
}

export interface WelcomeEvent {
    id: string;
    recipientId: string;
    recipientName: string;
    recipientAvatar: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    timestamp: number;
}

interface WelcomeFloatData {
    recipientName: string;
    recipientAvatar: string;
    senderName: string;
    senderAvatar: string;
}

interface CommentListProps {
    comments: Comment[];
    currentUserId: string;
    currentUserName: string;
    currentUserAvatar: string;
    topic: string;
    isHost: boolean;
    welcomeEvent: WelcomeEvent | null; // 同期用のウェルカムイベント
    onTopicChange: (topic: string) => void;
    onWelcome: (userId: string, userName: string, userAvatar: string) => void;
    onAvatarClick: (userId: string) => void;
}

export default function CommentList({
    comments,
    currentUserId,
    currentUserName,
    currentUserAvatar,
    topic,
    isHost,
    welcomeEvent,
    onTopicChange,
    onWelcome,
    onAvatarClick,
}: CommentListProps) {
    const [welcomedUsers, setWelcomedUsers] = useState<Set<string>>(new Set());
    const [floatingWelcome, setFloatingWelcome] = useState<WelcomeFloatData | null>(null);
    const [isEditingTopic, setIsEditingTopic] = useState(false);
    const [topicInput, setTopicInput] = useState(topic);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [comments]);

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    };

    // 外部からのウェルカムイベントを検知して表示
    useEffect(() => {
        if (!welcomeEvent) return;

        // イベントが自分のウェルカムアクションですでに表示済みの場合はスキップ
        // しかし、Firebase経由のイベントを正とするため、必ず表示する方針に変更
        // ローカルでの即時表示は廃止し、すべてFirebase同期経由にする

        setFloatingWelcome({
            recipientName: welcomeEvent.recipientName,
            recipientAvatar: welcomeEvent.recipientAvatar,
            senderName: welcomeEvent.senderName,
            senderAvatar: welcomeEvent.senderAvatar,
        });

        // 自分が送った相手ならwelcomedUsersに追加
        if (welcomeEvent.senderId === currentUserId) {
            setWelcomedUsers(prev => new Set(prev).add(welcomeEvent.recipientId));
        }

        const timer = setTimeout(() => {
            setFloatingWelcome(null);
        }, 3000);

        return () => clearTimeout(timer);
    }, [welcomeEvent, currentUserId]);

    const handleWelcomeClick = (userId: string, userName: string, userAvatar: string) => {
        if (welcomedUsers.has(userId)) return;
        // 親コンポーネント経由でFirebaseに送信
        onWelcome(userId, userName, userAvatar);
    };

    const handleTopicSave = () => {
        onTopicChange(topicInput);
        setIsEditingTopic(false);
    };

    const handleTopicKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTopicSave();
        } else if (e.key === 'Escape') {
            setTopicInput(topic);
            setIsEditingTopic(false);
        }
    };

    return (
        <div className={styles.commentList}>
            {/* トピック表示・編集エリア */}
            <div className={styles.topicArea}>
                {isEditingTopic ? (
                    <div className={styles.topicEditor}>
                        <input
                            type="text"
                            className={styles.topicInput}
                            value={topicInput}
                            onChange={(e) => setTopicInput(e.target.value)}
                            onKeyDown={handleTopicKeyPress}
                            onBlur={handleTopicSave}
                            placeholder="トピックを入力..."
                            autoFocus
                        />
                    </div>
                ) : (
                    <button
                        className={styles.topicDisplay}
                        onClick={() => isHost && setIsEditingTopic(true)}
                        type="button"
                        disabled={!isHost}
                    >
                        <span className={styles.topicLabel}>📢 トピック:</span>
                        <span className={styles.topicText}>
                            {topic || 'トピックなし'}
                        </span>
                        {isHost && <span className={styles.editHint}>（タップで編集）</span>}
                    </button>
                )}
            </div>

            {/* フローティングウェルカムメッセージ - 送信者と受信者を表示 */}
            {floatingWelcome && (
                <div className={styles.floatingWelcome}>
                    <div className={styles.welcomeSender}>
                        <Avatar
                            src={floatingWelcome.senderAvatar}
                            alt={floatingWelcome.senderName}
                            size="md"
                        />
                        <span className={styles.senderName}>{floatingWelcome.senderName}</span>
                    </div>
                    <div className={styles.welcomeArrow}>→</div>
                    <div className={styles.welcomeRecipient}>
                        <Avatar
                            src={floatingWelcome.recipientAvatar}
                            alt={floatingWelcome.recipientName}
                            size="lg"
                        />
                        <span className={styles.welcomeName}>{floatingWelcome.recipientName}</span>
                    </div>
                    <div className={styles.welcomeText}>
                        <span className={styles.welcomeLine}>WEL</span>
                        <span className={styles.welcomeLine}>COME</span>
                    </div>
                </div>
            )}

            {/* コメントリスト */}
            <div className={styles.commentsScroll} ref={scrollRef}>
                {comments.map((comment) => (
                    <div key={comment.id} className={styles.commentItem}>
                        {comment.type === 'join' ? (
                            /* 入室通知 */
                            <div className={styles.joinNotification}>
                                <button
                                    className={styles.avatarButton}
                                    onClick={() => onAvatarClick(comment.userId)}
                                    type="button"
                                >
                                    <Avatar
                                        src={comment.userAvatar}
                                        alt={comment.userName}
                                        size="sm"
                                    />
                                </button>
                                <div className={styles.joinContent}>
                                    <span className={styles.joinText}>
                                        {comment.userName}さんが音声ルームに参加しました
                                    </span>
                                    <span className={styles.timestamp}>{formatTimestamp(comment.timestamp)}</span>
                                </div>
                                {comment.userId !== currentUserId && !welcomedUsers.has(comment.userId) && (
                                    <button
                                        className={styles.welcomeButton}
                                        onClick={() => handleWelcomeClick(comment.userId, comment.userName, comment.userAvatar)}
                                        type="button"
                                    >
                                        👋 ようこそ
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* 通常コメント */
                            <div className={styles.messageItem}>
                                <button
                                    className={styles.avatarButton}
                                    onClick={() => onAvatarClick(comment.userId)}
                                    type="button"
                                >
                                    <Avatar
                                        src={comment.userAvatar}
                                        alt={comment.userName}
                                        size="sm"
                                    />
                                </button>
                                <div className={styles.messageContent}>
                                    <div className={styles.messageHeader}>
                                        <span className={styles.userName}>{comment.userName}</span>
                                        <span className={styles.timestamp}>{formatTimestamp(comment.timestamp)}</span>
                                    </div>
                                    {comment.type === 'image' && comment.imageUrl ? (
                                        <div className={styles.imageBubble}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={comment.imageUrl}
                                                alt="送信された画像"
                                                className={styles.commentImage}
                                                onClick={() => window.open(comment.imageUrl, '_blank')}
                                            />
                                        </div>
                                    ) : (
                                        <div className={styles.messageBubble}>
                                            {comment.content}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
