'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ref, onValue, set, remove, push, onChildAdded } from 'firebase/database';
import { database } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { createPeer, getUserMedia, stopMediaStream } from '@/lib/webrtc';
import Avatar from '@/components/common/Avatar';
import Button from '@/components/common/Button';
import YuiVoicePanel from './YuiVoicePanel';
import { useYuiVoiceAssist } from './useYuiVoiceAssist';
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

    // YUi Voice Assist Hook
    const yuiAssist = useYuiVoiceAssist();


    // 参加者リストの監視（表示用のみ。自動接続は行わない）
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

    const playAudio = useCallback((userId: string, stream: MediaStream) => {
        // 既存のオーディオ要素があれば、ストリームだけ更新
        if (audioElementsRef.current[userId]) {
            const existingAudio = audioElementsRef.current[userId];
            if (existingAudio.srcObject !== stream) {
                existingAudio.srcObject = stream;
            }
            return;
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
    }, []);

    // ピア接続の管理（発信・着信共通）
    const connectToPeer = useCallback((peerId: string, initiator: boolean = true, incomingSignal?: any) => {
        if (!streamRef.current || !user) return;

        // 既に接続済みの場合はスキップ（ただし、シグナル処理の場合は除く）
        if (peersRef.current[peerId] && !incomingSignal) {
            console.log('Already connected to:', peerId);
            return;
        }

        // 既にピアがある状態でシグナルが来た場合は、そのピアにシグナルを渡す
        if (peersRef.current[peerId] && incomingSignal) {
            console.log('Passing signal to existing peer:', peerId);
            peersRef.current[peerId].signal(incomingSignal);
            return;
        }

        console.log(`Creating peer connection to ${peerId}. Initiator: ${initiator}`);
        const peer = createPeer(initiator, streamRef.current);

        peer.on('signal', (signal) => {
            // シグナル（Offer/Answer/ICE）が発生したら相手に送信
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
            console.error(`Peer error with ${peerId}:`, err);
        });

        peer.on('close', () => {
            console.log(`Connection with ${peerId} closed`);
            delete peersRef.current[peerId];
            if (audioElementsRef.current[peerId]) {
                audioElementsRef.current[peerId].remove();
                delete audioElementsRef.current[peerId];
            }
        });

        peersRef.current[peerId] = peer;

        // 着信（Responder）の場合、受け取ったOfferシグナルを適用
        if (!initiator && incomingSignal) {
            peer.signal(incomingSignal);
        }
    }, [user, roomId, playAudio]);


    // WebRTC シグナリング（受信処理）
    useEffect(() => {
        if (!user || !isConnected) return;

        const signalsRef = ref(database, `rooms/${roomId}/signals`);

        const unsubscribe = onChildAdded(signalsRef, async (snapshot) => {
            const signal = snapshot.val();
            if (!signal || signal.from === user.uid) return;

            // このシグナルが自分宛てかチェック（toがない場合は全員宛てだが、基本はtoがあるべき）
            if (signal.to && signal.to !== user.uid) return;

            try {
                // 既存のピアがある、またはOfferを受け取った場合に処理
                if (peersRef.current[signal.from]) {
                    // 既存ピアにシグナルを適用
                    peersRef.current[signal.from].signal(signal.signal);
                } else if (signal.signal.type === 'offer') {
                    // 新しいOfferを受け取ったら、Responderとして接続を開始
                    console.log('Received offer from:', signal.from);
                    connectToPeer(signal.from, false, signal.signal);
                }
            } catch (error) {
                console.error('Error handling signal:', error);
            }
        });

        return () => unsubscribe();
    }, [roomId, user, isConnected, connectToPeer]);

    const joinRoom = async () => {
        if (!user) return;

        try {
            const stream = await getUserMedia();
            streamRef.current = stream;
            setIsConnected(true);

            // YUi音声認識を開始（仕様4: STTで会話を検知）
            yuiAssist.startListening(stream);

            // 自分の参加情報を登録
            const userRef = ref(database, `rooms/${roomId}/participants/${user.uid}`);
            await set(userRef, {
                name: user.displayName || 'Anonymous',
                avatar: user.photoURL || '',
                muted: false,
            });

            // 古いシグナルをクリーンアップ
            const signalsRef = ref(database, `rooms/${roomId}/signals`);
            const signalsSnapshot = await onValue(signalsRef, (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    Object.entries(data).forEach(([key, signal]: [string, any]) => {
                        if (signal.from === user.uid || signal.to === user.uid) {
                            remove(ref(database, `rooms/${roomId}/signals/${key}`));
                        }
                    });
                }
            }, { onlyOnce: true });

            // 既存の参加者全員に接続（新規参加者がInitiatorとなる）
            const participantsSnapshot = await onValue(
                ref(database, `rooms/${roomId}/participants`),
                (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        Object.keys(data).forEach((participantId) => {
                            if (participantId !== user.uid) {
                                console.log('Joining: initiating connection to:', participantId);
                                connectToPeer(participantId, true);
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


    const leaveRoom = async () => {
        if (!user) return;

        // YUi音声認識を停止（仕様5.4: 退出時の即停止）
        yuiAssist.stopListening();

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

            {/* YUi Voice Panel（仕様8: フルフロー） */}
            <YuiVoicePanel
                isSupported={yuiAssist.isSupported}
                isListening={isConnected}
                isSpeaking={yuiAssist.isSpeaking}
                isLoading={yuiAssist.isLoading}
                suggestions={yuiAssist.suggestions}
                error={yuiAssist.error}
                onRequestSuggestions={yuiAssist.requestSuggestions}
                onSelectSuggestion={yuiAssist.speakSuggestion}
                onCancel={yuiAssist.reset}
            />
        </div>
    );
}
