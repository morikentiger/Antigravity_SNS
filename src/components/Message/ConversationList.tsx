'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/common/Avatar';
import ProfileEditModal from '@/components/Profile/ProfileEditModal';
import styles from './ConversationList.module.css';

interface Conversation {
    id: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar: string;
    lastMessage: string;
    lastMessageTime: number;
    unread: boolean;
}

export default function ConversationList() {
    const { user } = useAuth();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [users, setUsers] = useState<any>({});
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        // Load all users for starting new conversations
        const usersRef = ref(database, 'users');
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUsers(data);
            }
        });

        // Load user's conversations
        const conversationsRef = ref(database, 'conversations');
        const unsubscribeConversations = onValue(conversationsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const conversationsArray: Conversation[] = [];
                Object.entries(data).forEach(([id, conversation]: [string, any]) => {
                    if (conversation.participants?.[user.uid]) {
                        const otherUserId = Object.keys(conversation.participants).find(
                            (uid) => uid !== user.uid
                        );
                        if (otherUserId && users[otherUserId]) {
                            conversationsArray.push({
                                id,
                                otherUserId,
                                otherUserName: users[otherUserId].displayName || 'Unknown User',
                                otherUserAvatar: users[otherUserId].photoURL || '',
                                lastMessage: conversation.lastMessage || '',
                                lastMessageTime: conversation.lastMessageTime || 0,
                                unread: conversation.lastMessageSender !== user.uid,
                            });
                        }
                    }
                });
                conversationsArray.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                setConversations(conversationsArray);
            }
        });

        return () => {
            unsubscribeUsers();
            unsubscribeConversations();
        };
    }, [user, users]);

    const formatTime = (timestamp: number) => {
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
        router.push(`/messages/${conversation.otherUserId}`);
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
                            className={`${styles.item} ${conversation.unread ? styles.unread : ''}`}
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
                            {conversation.unread && <div className={styles.unreadDot} />}
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
