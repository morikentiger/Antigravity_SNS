'use client';

import React, { useEffect, useState, useRef } from 'react';
import { ref, onValue, set, remove, push, onChildAdded } from 'firebase/database';
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
    const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});

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

    // WebRTC シグナリング
    useEffect(() => {
        if (!user || !isConnected) return;

        const signalsRef = ref(database, `rooms/${roomId}/signals`);

        const unsubscribe = onChildAdded(signalsRef, async (snapshot) => {
            const signal = snapshot.val();
            if (!signal || signal.from === user.uid) return;

            try {
                // 既存のピア接続がある場合
                if (peersRef.current[signal.from]) {
                    peersRef.current[signal.from].signal(signal.signal);
                    return;
                }

                // 新しいピア接続を作成
                if (streamRef.current) {
                    const peer = createPeer(false, streamRef.current);

                    peer.on('signal', (signalData) => {
                        const responseRef = push(ref(database, `rooms/${roomId}/signals`));
                        set(responseRef, {
                            from: user.uid,
                            to: signal.from,
                            signal: signalData,
                            timestamp: Date.now(),
                        });
                    });

                    peer.on('stream', (remoteStream) => {
                        console.log('Received stream from:', signal.from);
                        playAudio(signal.from, remoteStream);
                    });

                    peer.on('error', (err) => {
                        console.error('Peer error:', err);
                    });

                    peer.signal(signal.signal);
                    peersRef.current[signal.from] = peer;
                }
            } catch (error) {
                console.error('Error handling signal:', error);
            }
        });

        return () => unsubscribe();
    }, [roomId, user, isConnected]);

    const playAudio = (userId: string, stream: MediaStream) => {
        // 既存のオーディオ要素があれば削除
        if (audioElementsRef.current[userId]) {
            audioElementsRef.current[userId].srcObject = null;
            audioElementsRef.current[userId].remove();
        }

        // 新しいオーディオ要素を作成
        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.volume = 1.0;
        audioElementsRef.current[userId] = audio;

        audio.play().catch(err => {
            console.error('Error playing audio:', err);
        });
    };

    const joinRoom = async () => {
        if (!user) return;

        try {
            const stream = await getUserMedia();
            streamRef.current = stream;
            setIsConnected(true);

            // 自分の参加情報を登録
            const userRef = ref(database, `rooms/${roomId}/participants/${user.uid}`);
            await set(userRef, {
                name: user.displayName || 'Anonymous',
                avatar: user.photoURL || '',
                muted: false,
            });

            // 既存の参加者に接続
            const participantsSnapshot = await onValue(
                ref(database, `rooms/${roomId}/participants`),
                (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        Object.keys(data).forEach((participantId) => {
                            if (participantId !== user.uid && !peersRef.current[participantId]) {
                                connectToPeer(participantId);
                            }
                        });
                    }
                },
                { onlyOnce: true }
            );
        } catch (error) {
            console.error('Error joining room:', error);
            alert('マイクへのアクセスを許可してください');
        }
    };

    const connectToPeer = (peerId: string) => {
        if (!streamRef.current || !user) return;

        const peer = createPeer(true, streamRef.current);

        peer.on('signal', (signal) => {
            const signalRef = push(ref(database, `rooms/${roomId}/signals`));
            set(signalRef, {
                from: user.uid,
                to: peerId,
                signal: signal,
                timestamp: Date.now(),
            });
        });

        peer.on('stream', (remoteStream) => {
            console.log('Received stream from:', peerId);
            playAudio(peerId, remoteStream);
        });

        peer.on('error', (err) => {
            console.error('Peer error:', err);
        });

        peersRef.current[peerId] = peer;
    };

    const leaveRoom = async () => {
        if (!user) return;

        if (streamRef.current) {
            stopMediaStream(streamRef.current);
            streamRef.current = null;
        }

        // すべてのピア接続を破棄
        Object.values(peersRef.current).forEach((peer) => {
            peer.destroy();
        });
        peersRef.current = {};

        // すべてのオーディオ要素を削除
        Object.values(audioElementsRef.current).forEach((audio) => {
            audio.srcObject = null;
            audio.remove();
        });
        audioElementsRef.current = {};

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
            Object.values(audioElementsRef.current).forEach((audio) => {
                audio.srcObject = null;
                audio.remove();
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
