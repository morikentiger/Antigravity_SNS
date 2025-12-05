'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ref, push, serverTimestamp, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import styles from './MessageInput.module.css';

interface ReplyTo {
    id: string;
    content: string;
    senderName: string;
}

interface MessageInputProps {
    conversationId: string;
    otherUserId: string;
    replyingTo?: { id: string; content: string; senderName: string } | null;
    onCancelReply?: () => void;
    onMessageSent?: () => void;
}

export default function MessageInput({
    conversationId,
    otherUserId,
    replyingTo,
    onCancelReply,
    onMessageSent,
}: MessageInputProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { user } = useAuth();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Focus textarea when replying
    useEffect(() => {
        if (replyingTo && textareaRef.current) {
            textareaRef.current.focus();
        }
    }, [replyingTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !user) return;

        setIsSending(true);
        try {
            const messagesRef = ref(database, `conversations/${conversationId}/messages`);
            const messageData: any = {
                senderId: user.uid,
                senderName: user.displayName || 'Anonymous',
                senderAvatar: user.photoURL || '',
                content: message.trim(),
                timestamp: Date.now(),
                readBy: {
                    [user.uid]: Date.now(),
                },
            };

            // Add reply reference if replying
            if (replyingTo) {
                messageData.replyTo = {
                    messageId: replyingTo.id,
                    content: replyingTo.content,
                    senderName: replyingTo.senderName,
                };
            }

            await push(messagesRef, messageData);

            // Update conversation metadata (use update instead of set to avoid overwriting messages)
            const conversationRef = ref(database, `conversations/${conversationId}`);
            await update(conversationRef, {
                [`participants/${user.uid}`]: true,
                [`participants/${otherUserId}`]: true,
                lastMessage: message.trim(),
                lastMessageTime: serverTimestamp(),
                lastMessageSender: user.uid,
            });

            setMessage('');
            onMessageSent?.();
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className={styles.inputContainer}>
            {/* Reply preview */}
            {replyingTo && (
                <div className={styles.replyPreview}>
                    <div className={styles.replyPreviewContent}>
                        <span className={styles.replyPreviewLabel}>
                            {replyingTo.senderName} に返信
                        </span>
                        <span className={styles.replyPreviewText}>
                            {replyingTo.content.length > 60
                                ? replyingTo.content.substring(0, 60) + '...'
                                : replyingTo.content}
                        </span>
                    </div>
                    <button
                        type="button"
                        className={styles.replyPreviewCancel}
                        onClick={onCancelReply}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={replyingTo ? '返信を入力...' : 'メッセージを入力...'}
                    className={styles.textarea}
                    rows={1}
                />
                <Button type="submit" disabled={!message.trim() || isSending} variant="primary">
                    {isSending ? '送信中...' : '送信'}
                </Button>
            </form>
        </div>
    );
}
