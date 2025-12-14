'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { ref, onValue, set, remove, push, onChildAdded, get, onChildRemoved, query, limitToLast } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { database, storage } from '@/lib/firebase';
import { useAuth } from '@/components/AuthContext';
import { createPeer, getUserMedia, stopMediaStream } from '@/lib/webrtc';
import { SpeechSynthesisService } from '@/lib/speechServices';
import { useRouter } from 'next/navigation';

// New Components
import RoomHeader from './RoomHeader';
import CommentList, { Comment, WelcomeEvent } from './CommentList';
import SpeakerPanel, { Speaker } from './SpeakerPanel';
import ControlBar from './ControlBar';
import ParticipantPanel, { Participant } from './ParticipantPanel';
import { useYuiVoiceAssist } from './useYuiVoiceAssist';
import styles from './RoomView.module.css';
import type Peer from 'simple-peer';

interface RoomData {
    title: string;
    topic: string;
    hostId: string;
    autoGrantMic: boolean;
}

interface ParticipantData {
    id: string;
    name: string;
    avatar: string;
    muted: boolean;
    isSpeaker: boolean;
    isSpeaking?: boolean;
}

interface RoomViewProps {
    roomId: string;
}

export default function RoomView({ roomId }: RoomViewProps) {
    const { user } = useAuth();
    const router = useRouter();
    const [roomData, setRoomData] = useState<RoomData | null>(null);
    const [participants, setParticipants] = useState<ParticipantData[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [showParticipantPanel, setShowParticipantPanel] = useState(false);
    const [micRequests, setMicRequests] = useState<{ userId: string; userName: string }[]>([]);
    const [autoGrantMic, setAutoGrantMic] = useState(false);
    const [topic, setTopic] = useState('');
    const [yuiAvatar, setYuiAvatar] = useState<string>('');
    const [yuiName, setYuiName] = useState<string>('YUi');
    const [welcomeEvent, setWelcomeEvent] = useState<WelcomeEvent | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const peersRef = useRef<{ [key: string]: Peer.Instance }>({});
    const audioElementsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
    const otherYuiTtsRef = useRef<SpeechSynthesisService | null>(null);

    // YUi Voice Assist Hook
    const yuiAssist = useYuiVoiceAssist();

    // Check if current user is host
    const isHost = roomData?.hostId === user?.uid;

    // Check if current user is a speaker
    const currentParticipant = participants.find(p => p.id === user?.uid);
    const isSpeaker = currentParticipant?.isSpeaker || isHost;

    // ルームデータの監視
    useEffect(() => {
        if (!user) return;

        const roomRef = ref(database, `rooms/${roomId}`);
        const unsubscribe = onValue(roomRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setRoomData({
                    title: data.title || '音声ルーム',
                    topic: data.topic || '',
                    hostId: data.hostId || '',
                    autoGrantMic: data.autoGrantMic || false,
                });
                setAutoGrantMic(data.autoGrantMic || false);
                setTopic(data.topic || '');
            }
        });

        return () => unsubscribe();
    }, [roomId, user]);

    // ユーザーのYUiアバターと名前を取得
    useEffect(() => {
        if (!user) return;

        const userRef = ref(database, `users/${user.uid}`);
        get(userRef).then((snapshot) => {
            const data = snapshot.val();
            if (data?.yuiAvatar) {
                setYuiAvatar(data.yuiAvatar);
            }
            if (data?.yuiName) {
                setYuiName(data.yuiName);
            }
        }).catch(console.error);

        // TTSサービスを初期化（他の人のYUi発話再生用）
        otherYuiTtsRef.current = new SpeechSynthesisService();

        return () => {
            otherYuiTtsRef.current?.stop();
            otherYuiTtsRef.current = null;
        };
    }, [user]);

    // 参加者、コメント、その他の監視（ホスト以外も共通）
    useEffect(() => {
        if (!user || !isConnected) return;

        // 参加者リストの監視
        const participantsRef = ref(database, `rooms/${roomId}/participants`);
        const unsubscribeParticipants = onValue(participantsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const participantsArray: ParticipantData[] = Object.entries(data).map(
                    ([id, participant]: [string, any]) => ({
                        id,
                        ...participant,
                        isSpeaker: participant.isSpeaker || id === roomData?.hostId,
                    })
                );
                setParticipants(participantsArray);
            } else {
                setParticipants([]);
            }
        });

        // コメントの監視
        const commentsRef = ref(database, `rooms/${roomId}/comments`);
        const unsubscribeComments = onChildAdded(commentsRef, (snapshot) => {
            const comment = snapshot.val();
            if (comment) {
                setComments(prev => [...prev, { id: snapshot.key!, ...comment }]);
            }
        });

        // YUi発話の監視（他ユーザーのYUi発話を再生）
        const yuiSpeechRef = ref(database, `rooms/${roomId}/yuiSpeech`);
        const yuiQuery = query(yuiSpeechRef, limitToLast(1));
        const unsubscribeYuiSpeech = onChildAdded(yuiQuery, (snapshot) => {
            const data = snapshot.val();
            if (Date.now() - data.timestamp < 5000) {
                // 自分以外のYUi発話のみ再生（自分はローカルで再生済み）
                if (data.speakerId !== user.uid) {
                    otherYuiTtsRef.current?.speak(data.text);
                }
                // データを受信したら削除（重複再生防止）
                remove(ref(database, `rooms/${roomId}/yuiSpeech/${snapshot.key}`)).catch(() => { });
            }
        });

        // ウェルカムイベントの監視
        const welcomeRef = ref(database, `rooms/${roomId}/welcomeEvents`);
        const welcomeQuery = query(welcomeRef, limitToLast(1));
        const unsubscribeWelcome = onChildAdded(welcomeQuery, (snapshot) => {
            const data = snapshot.val();
            // 5秒以内のイベントのみ処理
            if (Date.now() - data.timestamp < 5000) {
                setWelcomeEvent({
                    id: snapshot.key || '',
                    ...data
                });
            }
        });

        return () => {
            unsubscribeParticipants();
            unsubscribeComments();
            unsubscribeYuiSpeech();
            unsubscribeWelcome();
        };
    }, [roomId, user, isConnected]);

    // VAD (Voice Activity Detection) - 音声検知
    useEffect(() => {
        if (!localStream || !user) return;

        // ミュート時はSpeaking状態をOFFにする
        if (isMuted) {
            set(ref(database, `rooms/${roomId}/participants/${user.uid}/isSpeaking`), false);
            return;
        }

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(localStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let animationId: number;
        let lastSpeakTime = 0;
        let isSpeakingState = false;

        const update = () => {
            analyser.getByteFrequencyData(dataArray);
            const sum = dataArray.reduce((a, b) => a + b, 0);
            const average = sum / dataArray.length;

            // 閾値: 環境によるが10-20程度で調整
            const isNowSpeaking = average > 10;

            if (isNowSpeaking) {
                lastSpeakTime = Date.now();
                if (!isSpeakingState) {
                    isSpeakingState = true;
                    set(ref(database, `rooms/${roomId}/participants/${user.uid}/isSpeaking`), true);
                }
            } else {
                // 保持時間 300ms (短すぎると点滅するので)
                if (isSpeakingState && Date.now() - lastSpeakTime > 300) {
                    isSpeakingState = false;
                    set(ref(database, `rooms/${roomId}/participants/${user.uid}/isSpeaking`), false);
                }
            }
            animationId = requestAnimationFrame(update);
        };

        update();

        return () => {
            cancelAnimationFrame(animationId);
            analyser.disconnect();
            source.disconnect();
            audioContext.close();
            // cleanup時はOFFにする
            if (user) {
                set(ref(database, `rooms/${roomId}/participants/${user.uid}/isSpeaking`), false).catch(() => { });
            }
        };
    }, [localStream, isMuted, roomId, user]);

    // マイク申請の監視（ホストのみ）
    useEffect(() => {
        if (!user || !isHost) return;

        const requestsRef = ref(database, `rooms/${roomId}/micRequests`);
        const unsubscribe = onValue(requestsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const requests = Object.entries(data).map(([userId, request]: [string, any]) => ({
                    userId,
                    userName: request.userName,
                }));
                setMicRequests(requests);
            } else {
                setMicRequests([]);
            }
        });

        return () => unsubscribe();
    }, [roomId, user, isHost]);

    // 他の人のYUi発話を監視してTTS再生
    useEffect(() => {
        if (!user || !isConnected) return;

        const yuiSpeechRef = ref(database, `rooms/${roomId}/yuiSpeech`);
        const unsubscribe = onChildAdded(yuiSpeechRef, (snapshot) => {
            const data = snapshot.val();
            if (!data) return;

            // 自分の発話は無視（自分のYUiは自分でTTS再生済み）
            if (data.speakerId === user.uid) return;

            // 古い発話は無視（5秒以上前）
            if (Date.now() - data.timestamp > 5000) return;

            // 他の人のYUi発話をTTSで再生
            if (otherYuiTtsRef.current && data.text) {
                otherYuiTtsRef.current.speak(
                    { text: data.text },
                    () => console.log(`Playing ${data.yuiName}'s speech`),
                    () => {
                        // 再生完了後にFirebaseから削除
                        remove(ref(database, `rooms/${roomId}/yuiSpeech/${snapshot.key}`));
                    }
                );
            }
        });

        return () => unsubscribe();
    }, [roomId, user?.uid, isConnected]);

    const playAudio = useCallback((userId: string, stream: MediaStream) => {
        if (audioElementsRef.current[userId]) {
            const existingAudio = audioElementsRef.current[userId];
            if (existingAudio.srcObject !== stream) {
                existingAudio.srcObject = stream;
            }
            return;
        }

        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.volume = 1.0;
        audioElementsRef.current[userId] = audio;

        audio.play().catch(err => {
            console.error('Error playing audio:', err);
        });
    }, []);

    // ピア接続の管理
    const connectToPeer = useCallback((peerId: string, initiator: boolean = true, incomingSignal?: any) => {
        if (!streamRef.current || !user) return;

        if (peersRef.current[peerId] && !incomingSignal) {
            console.log('Already connected to:', peerId);
            return;
        }

        if (peersRef.current[peerId] && incomingSignal) {
            console.log('Passing signal to existing peer:', peerId);
            peersRef.current[peerId].signal(incomingSignal);
            return;
        }

        console.log(`Creating peer connection to ${peerId}. Initiator: ${initiator}`);
        const peer = createPeer(initiator, streamRef.current);

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

        if (!initiator && incomingSignal) {
            peer.signal(incomingSignal);
        }
    }, [user, roomId, playAudio]);

    // WebRTC シグナリング
    useEffect(() => {
        if (!user || !isConnected) return;

        const signalsRef = ref(database, `rooms/${roomId}/signals`);
        const unsubscribe = onChildAdded(signalsRef, async (snapshot) => {
            const signal = snapshot.val();
            if (!signal || signal.from === user.uid) return;
            if (signal.to && signal.to !== user.uid) return;

            try {
                if (peersRef.current[signal.from]) {
                    peersRef.current[signal.from].signal(signal.signal);
                } else if (signal.signal.type === 'offer') {
                    console.log('Received offer from:', signal.from);
                    connectToPeer(signal.from, false, signal.signal);
                }
            } catch (error) {
                console.error('Error handling signal:', error);
            }
        });

        return () => unsubscribe();
    }, [roomId, user, isConnected, connectToPeer]);

    // ホスト（既に参加者として登録済み）の自動接続
    useEffect(() => {
        if (!user || isConnected) return;

        // 自分が既に参加者リストにいるかチェック
        const alreadyParticipant = participants.find(p => p.id === user.uid);
        if (alreadyParticipant && isHost) {
            // ホストとして既に登録済みなら自動でマイク接続を開始
            joinRoom();
        }
    }, [user, participants, isHost, isConnected]);

    const joinRoom = async () => {
        if (!user) return;

        try {
            const stream = await getUserMedia();
            streamRef.current = stream;
            setLocalStream(stream);
            setIsConnected(true);

            yuiAssist.startListening(stream);

            // 自分の参加情報を登録
            const userRef = ref(database, `rooms/${roomId}/participants/${user.uid}`);
            await set(userRef, {
                name: user.displayName || 'Anonymous',
                avatar: user.photoURL || '',
                muted: false,
                isSpeaker: false, // デフォルトはリスナー
            });

            // 入室通知コメントを追加
            const commentRef = push(ref(database, `rooms/${roomId}/comments`));
            await set(commentRef, {
                type: 'join',
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                timestamp: Date.now(),
            });

            // 古いシグナルをクリーンアップ
            const signalsRef = ref(database, `rooms/${roomId}/signals`);
            const signalsSnapshot = await get(signalsRef);
            if (signalsSnapshot.exists()) {
                const data = signalsSnapshot.val();
                Object.entries(data).forEach(([key, signal]: [string, any]) => {
                    if (signal.from === user.uid || signal.to === user.uid) {
                        remove(ref(database, `rooms/${roomId}/signals/${key}`));
                    }
                });
            }

            // 既存の参加者全員に接続
            const participantsSnapshot = await get(ref(database, `rooms/${roomId}/participants`));
            if (participantsSnapshot.exists()) {
                const data = participantsSnapshot.val();
                Object.keys(data).forEach((participantId) => {
                    if (participantId !== user.uid) {
                        console.log('Joining: initiating connection to:', participantId);
                        connectToPeer(participantId, true);
                    }
                });
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('マイクへのアクセスを許可してください');
        }
    };

    const leaveRoom = async () => {
        if (!user) return;

        yuiAssist.stopListening();

        if (streamRef.current) {
            stopMediaStream(streamRef.current);
            streamRef.current = null;
        }

        Object.values(peersRef.current).forEach((peer) => {
            peer.destroy();
        });
        peersRef.current = {};

        Object.values(audioElementsRef.current).forEach((audio) => {
            audio.srcObject = null;
            audio.remove();
        });
        audioElementsRef.current = {};

        const userRef = ref(database, `rooms/${roomId}/participants/${user.uid}`);
        await remove(userRef);
        setIsConnected(false);
        setComments([]);
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

    // Handlers
    const handleMinimize = () => {
        // 音声ルームを維持したまま他の画面へ
        router.push('/');
    };

    const handleLeave = () => {
        leaveRoom();
    };

    const handleSettings = () => {
        // TODO: 設定メニューを表示
        console.log('Open settings');
    };

    const handleSendMessage = async (message: string) => {
        if (!user || !message.trim()) return;

        const commentRef = push(ref(database, `rooms/${roomId}/comments`));
        await set(commentRef, {
            type: 'message',
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            userAvatar: user.photoURL || '',
            content: message,
            timestamp: Date.now(),
        });
    };

    const handleSendImage = () => {
        // 画像選択ダイアログを表示
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            // Storageにアップロード
            const imageRef = storageRef(storage, `room-images/${roomId}/${Date.now()}_${file.name}`);
            await uploadBytes(imageRef, file);
            const imageUrl = await getDownloadURL(imageRef);

            // コメントとして送信
            const commentRef = push(ref(database, `rooms/${roomId}/comments`));
            await set(commentRef, {
                type: 'image',
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                userAvatar: user.photoURL || '',
                imageUrl: imageUrl,
                timestamp: Date.now(),
            });

            // 入力をクリア
            e.target.value = '';
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('画像の送信に失敗しました');
        }
    };

    const handleSharePost = () => {
        // 投稿でシェア - 投稿画面に遷移してルームリンクを含める
        const roomUrl = `${window.location.origin}/rooms/${roomId}`;
        const shareText = `🎙️ 音声ルーム「${roomData?.title || '音声ルーム'}」に参加しよう！\n${roomUrl}`;

        // ローカルストレージに一時保存して投稿画面で使用
        localStorage.setItem('sharedRoomContent', shareText);

        // 新しいタブで投稿ページを開く（音声ルームを維持）
        window.open('/?compose=true', '_blank');
    };

    const handleShareDM = () => {
        // DMでシェア - クリップボードにコピーしてDMページへ
        const roomUrl = `${window.location.origin}/rooms/${roomId}`;
        const shareText = `🎙️ 音声ルーム「${roomData?.title || '音声ルーム'}」に参加しよう！\n${roomUrl}`;

        navigator.clipboard.writeText(shareText).then(() => {
            alert('ルームリンクをコピーしました！\nDMに貼り付けてシェアできます。');
            // 新しいタブでDMページを開く
            window.open('/messages', '_blank');
        }).catch(() => {
            alert('コピーに失敗しました');
        });
    };

    const handleGame = (gameId: string) => {
        // ゲーム画面を新しいタブで開く
        let gameUrl = '';
        switch (gameId) {
            case 'summon-shogi':
                gameUrl = 'https://morikentiger.github.io/SummonShogi/';
                break;
            case 'quiz':
                // TODO: クイズゲームURL
                alert('クイズゲームは準備中です');
                return;
            case 'word-chain':
                // TODO: しりとりゲームURL
                alert('しりとりゲームは準備中です');
                return;
            case 'drawing':
                // TODO: お絵描きゲームURL
                alert('お絵描きゲームは準備中です');
                return;
            default:
                return;
        }

        // 新しいタブでゲームを開く
        window.open(gameUrl, '_blank');
    };

    const handleRequestMic = async () => {
        if (!user) return;

        const requestRef = ref(database, `rooms/${roomId}/micRequests/${user.uid}`);
        await set(requestRef, {
            userName: user.displayName || 'Anonymous',
            timestamp: Date.now(),
        });
    };

    const handleToggleAutoGrant = async (enabled: boolean) => {
        if (!isHost) return;

        const roomRef = ref(database, `rooms/${roomId}/autoGrantMic`);
        await set(roomRef, enabled);
        setAutoGrantMic(enabled);
    };

    const handleTopicChange = async (newTopic: string) => {
        if (!isHost) return;

        const topicRef = ref(database, `rooms/${roomId}/topic`);
        await set(topicRef, newTopic);
        setTopic(newTopic);
    };

    const handleWelcome = async (userId: string, userName: string, userAvatar: string) => {
        if (!user) return;

        // ウェルカムメッセージをコメントとして送信
        const commentRef = push(ref(database, `rooms/${roomId}/comments`));
        await set(commentRef, {
            type: 'message',
            userId: user.uid,
            userName: user.displayName || 'Anonymous',
            userAvatar: user.photoURL || '',
            content: `${userName}さん、ようこそ！`,
            timestamp: Date.now(),
        });

        // ウェルカムイベントを送信（全員にエフェクトを表示するため）
        const eventRef = push(ref(database, `rooms/${roomId}/welcomeEvents`));
        await set(eventRef, {
            recipientId: userId,
            recipientName: userName,
            recipientAvatar: userAvatar,
            senderId: user.uid,
            senderName: user.displayName || 'Anonymous',
            senderAvatar: user.photoURL || '',
            timestamp: Date.now(),
        });
    };

    const handleAvatarClick = (userId: string) => {
        // TODO: プロフィールページへ遷移
        console.log('Navigate to profile:', userId);
    };

    const handleKick = async (userId: string) => {
        if (!isHost) return;
        // TODO: ユーザーを退出させる
        console.log('Kick user:', userId);
    };

    const handleGrantMic = async (userId: string) => {
        if (!isHost) return;

        const participantRef = ref(database, `rooms/${roomId}/participants/${userId}/isSpeaker`);
        await set(participantRef, true);

        // 申請リストから削除
        const requestRef = ref(database, `rooms/${roomId}/micRequests/${userId}`);
        await remove(requestRef);
    };

    const handleStepDownMic = async () => {
        if (!user || isHost) return; // ホストはマイクを降りれない

        const participantRef = ref(database, `rooms/${roomId}/participants/${user.uid}/isSpeaker`);
        await set(participantRef, false);
    };

    // YUi発話を選択した時：ローカルTTS + Firebase経由で他の人に送信
    const handleYuiSpeechBroadcast = async (type: 'summary' | 'emotion' | 'encourage') => {
        if (!user || !yuiAssist.suggestions) return;

        const text = yuiAssist.suggestions[type];
        if (!text) return;

        // 自分のYUiはローカルで再生
        yuiAssist.speakSuggestion(type);

        // Firebaseに発話を送信（他の人が聞けるように）
        const speechRef = push(ref(database, `rooms/${roomId}/yuiSpeech`));
        await set(speechRef, {
            speakerId: user.uid,
            speakerName: user.displayName || 'Anonymous',
            yuiName: yuiName,
            yuiAvatar: yuiAvatar,
            text: text,
            type: type,
            timestamp: Date.now(),
        });
    };

    // スピーカーデータを生成
    const speakers: Speaker[] = participants
        .filter(p => p.isSpeaker || p.id === roomData?.hostId)
        .map(p => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar,
            muted: p.muted,
            isSpeaking: p.isSpeaking || false, // Firebase同期されたVAD状態を使用
            isHost: p.id === roomData?.hostId,
            hasYui: true, // TODO: YUi割り当てロジック
        }));

    // 参加者データを生成
    const allParticipants: Participant[] = participants.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        isHost: p.id === roomData?.hostId,
        isSpeaker: p.isSpeaker || p.id === roomData?.hostId,
    }));

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

    // 未接続時のUI
    if (!isConnected) {
        return (
            <div className={styles.room}>
                <RoomHeader
                    title={roomData?.title || '音声ルーム'}
                    onMinimize={handleMinimize}
                    onLeave={() => router.back()}
                    onSettings={handleSettings}
                />
                <div className={styles.joinContainer}>
                    <h2 className={styles.joinTitle}>{roomData?.title || '音声ルーム'}</h2>
                    <p className={styles.joinDescription}>参加者: {participants.length}人</p>
                    <button
                        onClick={joinRoom}
                        className={styles.joinButton}
                    >
                        🎤 参加する
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.room}>
            {/* ヘッダー */}
            <RoomHeader
                title={roomData?.title || '音声ルーム'}
                onMinimize={handleMinimize}
                onLeave={handleLeave}
                onSettings={handleSettings}
            />

            {/* メインエリア */}
            <div className={styles.mainArea}>
                <div className={styles.commentArea}>
                    <CommentList
                        comments={comments}
                        currentUserId={user?.uid || ''}
                        currentUserName={user?.displayName || 'Anonymous'}
                        currentUserAvatar={user?.photoURL || ''}
                        topic={topic}
                        isHost={isHost}
                        welcomeEvent={welcomeEvent}
                        onTopicChange={handleTopicChange}
                        onWelcome={handleWelcome}
                        onAvatarClick={handleAvatarClick}
                    />
                </div>

                {/* 右側: スピーカーエリア (2/5) */}
                <div
                    className={styles.speakerArea}
                    onClick={() => setShowParticipantPanel(true)}
                >
                    <SpeakerPanel
                        speakers={speakers}
                        yuiAvatar={yuiAvatar}
                        onAvatarClick={handleAvatarClick}
                        onEmptySlotClick={() => setShowParticipantPanel(true)}
                    />
                </div>
            </div>

            <ControlBar
                isHost={isHost}
                isSpeaker={isSpeaker}
                isMuted={isMuted}
                hasMicRequest={micRequests.length > 0}
                micRequestCount={micRequests.length}
                micRequests={micRequests}
                autoGrantMic={autoGrantMic}
                yuiSuggestions={yuiAssist.suggestions}
                isYuiLoading={yuiAssist.isLoading}
                yuiAvatar={yuiAvatar}
                realtimeTranscript={yuiAssist.realtimeTranscript}
                onSendMessage={handleSendMessage}
                onSendImage={handleSendImage}
                onSharePost={handleSharePost}
                onShareDM={handleShareDM}
                onGame={handleGame}
                onToggleMute={toggleMute}
                onRequestMic={handleRequestMic}
                onGrantMic={handleGrantMic}
                onStepDownMic={handleStepDownMic}
                onToggleAutoGrant={handleToggleAutoGrant}
                onRequestYuiSuggestions={yuiAssist.requestSuggestions}
                onSelectYuiSuggestion={handleYuiSpeechBroadcast}
            />

            {/* 参加者パネル */}
            <ParticipantPanel
                isVisible={showParticipantPanel}
                isHost={isHost}
                participants={allParticipants}
                onClose={() => setShowParticipantPanel(false)}
                onKick={handleKick}
                onGrantMic={handleGrantMic}
                onAvatarClick={handleAvatarClick}
            />

            {/* 画像送信用の隠し入力 */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*"
                onChange={handleFileChange}
            />
        </div>
    );
}
