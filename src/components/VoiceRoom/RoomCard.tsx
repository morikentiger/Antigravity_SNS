'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
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

    const handleJoin = () => {
        router.push(`/rooms/${room.id}`);
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
                    <button
                        onClick={handleJoin}
                        disabled={isFull}
                        className={styles.joinButton}
                    >
                        {isFull ? '満室' : '参加'}
                    </button>
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
