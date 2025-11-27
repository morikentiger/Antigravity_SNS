'use client';

import React, { useEffect, useState } from 'react';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
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
    const { user } = useAuth();

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
                        name: room.name,
                        topic: room.topic,
                        participants: participantCount,
                        maxParticipants: room.maxParticipants || 10,
                        createdBy: room.createdBy,
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

        try {
            const roomsRef = ref(database, 'rooms');
            await push(roomsRef, {
                name: newRoomName.trim(),
                topic: newRoomTopic.trim() || '自由に話そう',
                createdBy: user.uid,
                createdAt: serverTimestamp(),
                maxParticipants: 10,
            });
            alert('ルームを作成しました！');
            setNewRoomName('');
            setNewRoomTopic('');
            setShowCreateModal(false);
        } catch (error: any) {
            console.error('Error creating room:', error);
            alert(`ルーム作成エラー: ${error.message}`);
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
