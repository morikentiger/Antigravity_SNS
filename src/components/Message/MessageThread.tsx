'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ref, onValue, push, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import Avatar from '@/components/common/Avatar';
import MessageInput from './MessageInput';
import styles from './MessageThread.module.css';

interface Message {
    id: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    content: string;
    timestamp: number;
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
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const conversationId = [user?.uid, otherUserId].sort().join('_');

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
            } else {
                setMessages([]);
            }
        });

        return () => unsubscribe();
    }, [user, conversationId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
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
                    messages.map((message) => {
                        const isOwn = message.senderId === user?.uid;
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
                                <div className={styles.messageBubble}>
                                    <p className={styles.messageContent}>{message.content}</p>
                                    <time className={styles.messageTime}>
                                        {formatTime(message.timestamp)}
                                    </time>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <MessageInput conversationId={conversationId} otherUserId={otherUserId} />
        </div>
    );
}
