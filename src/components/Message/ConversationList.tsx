'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import ProfileEditModal from '@/components/Profile/ProfileEditModal';
import NotificationSettings from '@/components/Notification/NotificationSettings';
import styles from './ConversationList.module.css';

interface Conversation {
    id: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar: string;
    lastMessage: string;
    lastMessageTime: number;
    unreadCount: number;
    lastMessageSender: string;
}

export default function ConversationList() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        // Load user's conversations
        const conversationsRef = ref(database, 'conversations');

        const unsubscribeConversations = onValue(conversationsRef, async (snapshot) => {
            const data = snapshot.val();

            if (data) {
                const conversationsArray: Conversation[] = [];

                for (const [conversationId, conversation] of Object.entries(data) as [string, any][]) {
                    // conversationId is formatted as "userId1_userId2" (sorted)
                    const userIds = conversationId.split('_');

                    // Check if current user is part of this conversation
                    if (!userIds.includes(user.uid)) continue;

                    const otherUserId = userIds.find((uid) => uid !== user.uid);
                    if (!otherUserId) continue;

                    // Get other user's info
                    let otherUserName = 'Unknown User';
                    let otherUserAvatar = '';

                    // Try to get from users node first
                    try {
                        const userRef = ref(database, `users/${otherUserId}`);
                        const userSnapshot = await get(userRef);
                        if (userSnapshot.exists()) {
                            const userData = userSnapshot.val();
                            otherUserName = userData.displayName || 'Unknown User';
                            otherUserAvatar = userData.photoURL || '';
                        }
                    } catch (error) {
                        console.error('Error fetching user:', error);
                    }

                    // If not found in users, try to get from conversation's userInfo
                    if (otherUserName === 'Unknown User' && conversation.userInfo?.[otherUserId]) {
                        otherUserName = conversation.userInfo[otherUserId].displayName || 'Unknown User';
                        otherUserAvatar = conversation.userInfo[otherUserId].photoURL || '';
                    }

                    // If still not found, try to get from messages in the conversation
                    if (otherUserName === 'Unknown User' && conversation.messages) {
                        const messages = Object.values(conversation.messages) as any[];
                        const otherUserMessage = messages.find(
                            (msg: any) => msg.senderId === otherUserId
                        );
                        if (otherUserMessage) {
                            otherUserName = otherUserMessage.senderName || 'Unknown User';
                            otherUserAvatar = otherUserMessage.senderAvatar || '';
                        }
                    }

                    // Count unread messages
                    let unreadCount = 0;
                    if (conversation.messages) {
                        Object.values(conversation.messages).forEach((msg: any) => {
                            if (msg.senderId !== user.uid && !msg.readBy?.[user.uid]) {
                                unreadCount++;
                            }
                        });
                    }

                    conversationsArray.push({
                        id: conversationId,
                        otherUserId,
                        otherUserName,
                        otherUserAvatar,
                        lastMessage: conversation.lastMessage || '',
                        lastMessageTime: conversation.lastMessageTime || 0,
                        unreadCount,
                        lastMessageSender: conversation.lastMessageSender || '',
                    });
                }

                conversationsArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                setConversations(conversationsArray);
            } else {
                setConversations([]);
            }
        }, (error) => {
            console.error('Firebase error loading conversations:', error);
        });

        return () => {
            unsubscribeConversations();
        };
    }, [user]);

    const formatTime = (timestamp: number) => {
        if (!timestamp) return '';
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '今';
        if (minutes < 60) return `${minutes}分前`;
        if (hours < 24) return `${hours}時間前`;
        return `${days}日前`;
    };

    const handleConversationClick = (conversation: Conversation) => {
        const params = new URLSearchParams({
            name: conversation.otherUserName,
            avatar: conversation.otherUserAvatar || '',
        });
        router.push(`/messages/${conversation.otherUserId}?${params.toString()}`);
    };

    return (
        <div className={styles.container}>
            <h2>メッセージ</h2>

            {/* プロフィール変更セクション */}
            <div className="mb-4 p-4 bg-gray-800/50 rounded-lg flex items-center justify-between border border-gray-700">
                <div className="flex items-center gap-3">
                    <Avatar src={user?.photoURL || ''} alt={user?.displayName || 'User'} size="md" />
                    <div>
                        <p className="font-bold text-white">{user?.displayName || 'ゲスト'}</p>
                        <p className="text-xs text-gray-400">プロフィールを編集</p>
                    </div>
                </div>
                <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition-colors"
                >
                    変更
                </button>
            </div>

            {/* 通知設定セクション */}
            <NotificationSettings />

            {conversations.length === 0 ? (
                <div className={styles.empty}>
                    <p>まだ会話がありません</p>
                    <p className={styles.emptySubtext}>誰かにメッセージを送ってみましょう！</p>
                </div>
            ) : (
                <div className={styles.list}>
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            onClick={() => handleConversationClick(conversation)}
                            className={`${styles.item} ${conversation.unreadCount > 0 ? styles.unread : ''}`}
                        >
                            <Avatar
                                src={conversation.otherUserAvatar}
                                alt={conversation.otherUserName}
                                size="md"
                            />
                            <div className={styles.info}>
                                <div className={styles.header}>
                                    <h4 className={styles.name}>{conversation.otherUserName}</h4>
                                    <time className={styles.time}>
                                        {formatTime(conversation.lastMessageTime)}
                                    </time>
                                </div>
                                <p className={styles.lastMessage}>{conversation.lastMessage}</p>
                            </div>
                            {conversation.unreadCount > 0 && (
                                <div className={styles.unreadBadge}>
                                    {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            <ProfileEditModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
            />
        </div>
    );
}
