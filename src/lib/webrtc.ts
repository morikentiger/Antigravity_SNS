import Peer, { SignalData } from 'simple-peer';

export interface PeerConnection {
    peer: Peer.Instance;
    userId: string;
    stream?: MediaStream;
}

export const createPeer = (
    initiator: boolean,
    stream?: MediaStream,
    signalData?: SignalData
): Peer.Instance => {
    const peer = new Peer({
        initiator,
        stream,
        trickle: true, // ICE候補を逐次送信（高速＆確実）
        config: {
            iceServers: [
                // STUN Servers (無料)
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                // TURN Servers (NAT越え用 - 公開TURNサーバー)
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject',
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject',
                },
                {
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject',
                },
            ],
        },
    });

    if (signalData) {
        peer.signal(signalData);
    }

    return peer;
};

export const getUserMedia = async (): Promise<MediaStream> => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            },
            video: false,
        });
        return stream;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        throw error;
    }
};

export const stopMediaStream = (stream: MediaStream) => {
    stream.getTracks().forEach((track) => track.stop());
};
