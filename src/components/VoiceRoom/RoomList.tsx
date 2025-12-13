'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, push, set, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { useRouter } from 'next/navigation';
import RoomCard from './RoomCard';
import Button from '@/components/common/Button';
import styles from './RoomList.module.css';

interface Room {
    id: string;
    name: string;
    topic: string;
    participants: number;
    maxParticipants: number;
    createdBy: string;
}

export default function RoomList() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomTopic, setNewRoomTopic] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const { user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const roomsRef = ref(database, 'rooms');

        const unsubscribe = onValue(roomsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const roomsArray: Room[] = Object.entries(data).map(([id, room]: [string, any]) => {
                    const participantCount = room.participants
                        ? Object.keys(room.participants).length
                        : 0;
                    return {
                        id,
                        name: room.name || room.title,
                        topic: room.topic,
                        participants: participantCount,
                        maxParticipants: room.maxParticipants || 10,
                        createdBy: room.createdBy || room.hostId,
                    };
                });
                setRooms(roomsArray);
            } else {
                setRooms([]);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('ログインしてください。');
            return;
        }

        if (!newRoomName.trim()) {
            alert('ルーム名を入力してください。');
            return;
        }

        setIsCreating(true);

        try {
            const roomsRef = ref(database, 'rooms');
            const newRoomRef = push(roomsRef);
            const roomId = newRoomRef.key;

            // ルームデータを作成（hostIdを設定）
            await set(newRoomRef, {
                name: newRoomName.trim(),
                title: newRoomName.trim(),
                topic: newRoomTopic.trim() || '自由に話そう',
                hostId: user.uid,
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                maxParticipants: 10,
                autoGrantMic: false,
            });

            // ホストを参加者として登録（スピーカーとして）
            const hostParticipantRef = ref(database, `rooms/${roomId}/participants/${user.uid}`);
            await set(hostParticipantRef, {
                name: user.displayName || 'Anonymous',
                avatar: user.photoURL || '',
                muted: false,
                isSpeaker: true,
            });

            setNewRoomName('');
            setNewRoomTopic('');
            setShowCreateModal(false);

            // 作成したルームに直接遷移
            router.push(`/rooms/${roomId}`);
        } catch (error: any) {
            console.error('Error creating room:', error);
            alert(`ルーム作成エラー: ${error.message}`);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>音声ルーム</h2>
                <Button onClick={() => setShowCreateModal(true)} variant="primary">
                    ルーム作成
                </Button>
            </div>

            {rooms.length === 0 ? (
                <div className={styles.empty}>
                    <p>まだルームがありません</p>
                    <p className={styles.emptySubtext}>最初のルームを作ってみましょう！</p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {rooms.map((room) => (
                        <RoomCard key={room.id} room={room} />
                    ))}
                </div>
            )}

            {showCreateModal && (
                <div className={styles.modal} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <h3>新しいルームを作成</h3>
                        <form onSubmit={handleCreateRoom} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label htmlFor="roomName">ルーム名</label>
                                <input
                                    id="roomName"
                                    type="text"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    placeholder="例: 雑談ルーム"
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="roomTopic">トピック（任意）</label>
                                <input
                                    id="roomTopic"
                                    type="text"
                                    value={newRoomTopic}
                                    onChange={(e) => setNewRoomTopic(e.target.value)}
                                    placeholder="例: ゲームの話をしよう"
                                />
                            </div>
                            <div className={styles.modalActions}>
                                <Button type="button" onClick={() => setShowCreateModal(false)} variant="ghost">
                                    キャンセル
                                </Button>
                                <Button type="submit" variant="primary">
                                    作成
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
