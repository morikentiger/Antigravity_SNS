'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ref, onValue, query, orderByChild, limitToLast, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Avatar from '@/components/common/Avatar';
import MessageInput from './MessageInput';
import styles from './MessageThread.module.css';

interface ReplyTo {
    messageId: string;
    content: string;
    senderName: string;
}

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    content: string;
    timestamp: number;
    readBy?: { [userId: string]: number };
    replyTo?: ReplyTo;
}

interface MessageThreadProps {
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar: string;
}

export default function MessageThread({
    otherUserId,
    otherUserName,
    otherUserAvatar,
}: MessageThreadProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([]);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationId = [user?.uid, otherUserId].sort().join('_');

    // Mark messages as read
    const markMessagesAsRead = useCallback(async (messagesToMark: Message[]) => {
        if (!user) return;

        const now = Date.now();
        const updates: { [key: string]: number } = {};

        messagesToMark.forEach((message) => {
            // Only mark messages from others that haven't been read by current user
            if (message.senderId !== user.uid && !message.readBy?.[user.uid]) {
                updates[`conversations/${conversationId}/messages/${message.id}/readBy/${user.uid}`] = now;
            }
        });

        if (Object.keys(updates).length > 0) {
            try {
                await update(ref(database), updates);
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        }
    }, [user, conversationId]);

    useEffect(() => {
        if (!user) return;

        const messagesRef = ref(database, `conversations/${conversationId}/messages`);
        const messagesQuery = query(messagesRef, orderByChild('timestamp'), limitToLast(100));

        const unsubscribe = onValue(messagesQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const messagesArray: Message[] = Object.entries(data).map(
                    ([id, message]: [string, any]) => ({
                        id,
                        ...message,
                    })
                );
                messagesArray.sort((a, b) => a.timestamp - b.timestamp);
                setMessages(messagesArray);
                // Mark messages as read when they are loaded/updated
                markMessagesAsRead(messagesArray);
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, [user, conversationId, markMessagesAsRead]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const handleReply = (message: Message) => {
        setReplyingTo(message);
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    const handleMessageSent = () => {
        setReplyingTo(null);
    };

    // Check if message is read by the other user
    const isReadByOther = (message: Message): boolean => {
        return !!message.readBy?.[otherUserId];
    };

    // Get the referenced message content for reply display
    const getReplyMessage = (replyTo: ReplyTo): Message | undefined => {
        return messages.find(m => m.id === replyTo.messageId);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <Avatar src={otherUserAvatar} alt={otherUserName} size="md" />
                <h3>{otherUserName}</h3>
            </div>

            <div className={styles.messages}>
                {messages.length === 0 ? (
                    <div className={styles.empty}>
                        <p>まだメッセージがありません</p>
                        <p className={styles.emptySubtext}>最初のメッセージを送ってみましょう！</p>
                    </div>
                ) : (
                    messages.map((message, index) => {
                        const isOwn = message.senderId === user?.uid;
                        const showReadStatus = isOwn && index === messages.length - 1;
                        return (
                            <div
                                key={message.id}
                                className={`${styles.messageWrapper} ${isOwn ? styles.own : ''}`}
                            >
                                {!isOwn && (
                                    <Avatar
                                        src={message.senderAvatar}
                                        alt={message.senderName}
                                        size="sm"
                                    />
                                )}
                                <div className={styles.messageContainer}>
                                    {/* Reply reference */}
                                    {message.replyTo && (
                                        <div className={styles.replyReference}>
                                            <span className={styles.replyToName}>
                                                {message.replyTo.senderName}
                                            </span>
                                            <span className={styles.replyToContent}>
                                                {message.replyTo.content.length > 50
                                                    ? message.replyTo.content.substring(0, 50) + '...'
                                                    : message.replyTo.content}
                                            </span>
                                        </div>
                                    )}
                                    <div className={styles.messageBubble}>
                                        <p className={styles.messageContent}>{message.content}</p>
                                        <div className={styles.messageFooter}>
                                            <time className={styles.messageTime}>
                                                {formatTime(message.timestamp)}
                                            </time>
                                            {showReadStatus && isReadByOther(message) && (
                                                <span className={styles.readStatus}>既読</span>
                                            )}
                                        </div>
                                    </div>
                                    {/* Reply button */}
                                    {!isOwn && (
                                        <button
                                            className={styles.replyButton}
                                            onClick={() => handleReply(message)}
                                            title="返信"
                                        >
                                            <svg
                                                width="16"
                                                height="16"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                            >
                                                <path d="M3 10l9-7v4c10 0 12 8 12 12-2-4-5-6-12-6v4l-9-7z" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <MessageInput
                conversationId={conversationId}
                otherUserId={otherUserId}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                onMessageSent={handleMessageSent}
            />
        </div>
    );
}
