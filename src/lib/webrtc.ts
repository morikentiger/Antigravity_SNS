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
        trickle: false,
        config: {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
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
