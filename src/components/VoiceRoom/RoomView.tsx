'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ref, onValue, set, remove, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { createPeer, getUserMedia, stopMediaStream } from '@/lib/webrtc';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import styles from './RoomView.module.css';
import type Peer from 'simple-peer';

interface Participant {
    id: string;
    name: string;
    avatar: string;
    muted: boolean;
}

interface RoomViewProps {
    roomId: string;
}

export default function RoomView({ roomId }: RoomViewProps) {
    const { user } = useAuth();
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const peersRef = useRef<{ [key: string]: Peer.Instance }>({});

    useEffect(() => {
        if (!user) return;

        const participantsRef = ref(database, `rooms/${roomId}/participants`);

        const unsubscribe = onValue(participantsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const participantsArray: Participant[] = Object.entries(data).map(
                    ([id, participant]: [string, any]) => ({
                        id,
                        ...participant,
                    })
                );
                setParticipants(participantsArray);
            } else {
                setParticipants([]);
            }
        });

        return () => unsubscribe();
    }, [roomId, user]);

    const joinRoom = async () => {
        if (!user) return;

        try {
            const stream = await getUserMedia();
            streamRef.current = stream;
            setIsConnected(true);

            const userRef = ref(database, `rooms/${roomId}/participants/${user.uid}`);
            await set(userRef, {
                name: user.displayName || 'Anonymous',
                avatar: user.photoURL || '',
                muted: false,
            });

            // In a production app, you would set up WebRTC signaling here
            // For simplicity, this demo shows the UI without full P2P implementation
        } catch (error) {
            console.error('Error joining room:', error);
            alert('マイクへのアクセスを許可してください');
        }
    };

    const leaveRoom = async () => {
        if (!user) return;

        if (streamRef.current) {
            stopMediaStream(streamRef.current);
            streamRef.current = null;
        }

        Object.values(peersRef.current).forEach((peer) => {
            peer.destroy();
        });
        peersRef.current = {};

        const userRef = ref(database, `rooms/${roomId}/participants/${user.uid}`);
        await remove(userRef);
        setIsConnected(false);
    };

    const toggleMute = () => {
        if (!streamRef.current) return;

        const audioTrack = streamRef.current.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);

            if (user) {
                const userRef = ref(database, `rooms/${roomId}/participants/${user.uid}/muted`);
                set(userRef, !audioTrack.enabled);
            }
        }
    };

    useEffect(() => {
        return () => {
            if (streamRef.current) {
                stopMediaStream(streamRef.current);
            }
            Object.values(peersRef.current).forEach((peer) => {
                peer.destroy();
            });
        };
    }, []);

    return (
        <div className={styles.room}>
            <div className={styles.participants}>
                {participants.map((participant) => (
                    <div key={participant.id} className={styles.participant}>
                        <Avatar src={participant.avatar} alt={participant.name} size="lg" />
                        <div className={styles.participantInfo}>
                            <span className={styles.participantName}>{participant.name}</span>
                            {participant.muted && (
                                <span className={styles.mutedBadge}>ミュート中</span>
                            )}
                        </div>
                        <div className={`${styles.audioIndicator} ${!participant.muted ? styles.active : ''}`}>
                            <div className={styles.audioBar}></div>
                            <div className={styles.audioBar}></div>
                            <div className={styles.audioBar}></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={styles.controls}>
                {!isConnected ? (
                    <Button onClick={joinRoom} variant="primary" size="lg">
                        参加する
                    </Button>
                ) : (
                    <>
                        <Button
                            onClick={toggleMute}
                            variant={isMuted ? 'secondary' : 'primary'}
                            size="lg"
                        >
                            {isMuted ? '🔇 ミュート解除' : '🎤 ミュート'}
                        </Button>
                        <Button onClick={leaveRoom} variant="secondary" size="lg">
                            退出
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}
