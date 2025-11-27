'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ref, remove } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import styles from './RoomCard.module.css';

interface Room {
    id: string;
    name: string;
    topic: string;
    participants: number;
    maxParticipants: number;
    createdBy: string;
}

interface RoomCardProps {
    room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
    const router = useRouter();
    const { user } = useAuth();

    const handleJoin = () => {
        router.push(`/rooms/${room.id}`);
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('本当にこのルームを解散（削除）しますか？')) {
            return;
        }

        try {
            await remove(ref(database, `rooms/${room.id}`));
            // 削除後は自動的にリストから消える（onValueで監視しているため）
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('ルームの削除に失敗しました');
        }
    };

    const isFull = room.participants >= room.maxParticipants;

    return (
        <div className={styles.card}>
            <div className={styles.content}>
                <h3 className={styles.title}>{room.name}</h3>
                <p className={styles.topic}>{room.topic}</p>
                <div className={styles.footer}>
                    <div className={styles.participants}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        <span>
                            {room.participants}/{room.maxParticipants}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        {user && user.uid === room.createdBy && (
                            <button
                                onClick={handleDelete}
                                className="px-3 py-1 bg-red-900/50 text-red-200 rounded-md text-sm hover:bg-red-900 transition-colors"
                            >
                                解散
                            </button>
                        )}
                        <button
                            onClick={handleJoin}
                            disabled={isFull}
                            className={styles.joinButton}
                        >
                            {isFull ? '満室' : '参加'}
                        </button>
                    </div>
                </div>
            </div>
            <div className={styles.waveform}>
                <div className={styles.wave} style={{ animationDelay: '0s' }}></div>
                <div className={styles.wave} style={{ animationDelay: '0.1s' }}></div>
                <div className={styles.wave} style={{ animationDelay: '0.2s' }}></div>
                <div className={styles.wave} style={{ animationDelay: '0.3s' }}></div>
            </div>
        </div>
    );
}
