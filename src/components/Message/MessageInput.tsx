'use client';

import React, { useState } from 'react';
import { ref, push, serverTimestamp, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Button from '@/components/common/Button';
import styles from './MessageInput.module.css';

interface MessageInputProps {
    conversationId: string;
    otherUserId: string;
}

export default function MessageInput({ conversationId, otherUserId }: MessageInputProps) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const { user } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !user) return;

        setIsSending(true);
        try {
            const messagesRef = ref(database, `conversations/${conversationId}/messages`);
            await push(messagesRef, {
                senderId: user.uid,
                senderName: user.displayName || 'Anonymous',
                senderAvatar: user.photoURL || '',
                content: message.trim(),
                timestamp: Date.now(),
            });

            // Update conversation metadata
            const conversationRef = ref(database, `conversations/${conversationId}`);
            await set(conversationRef, {
                participants: {
                    [user.uid]: true,
                    [otherUserId]: true,
                },
                lastMessage: message.trim(),
                lastMessageTime: serverTimestamp(),
                lastMessageSender: user.uid,
            });

            setMessage('');
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
        <form onSubmit={handleSubmit} className={styles.form}>
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="メッセージを入力..."
                className={styles.textarea}
                rows={1}
            />
            <Button type="submit" disabled={!message.trim() || isSending} variant="primary">
                {isSending ? '送信中...' : '送信'}
            </Button>
        </form>
    );
}
