// WebRTCManager.ts
import firebase from 'firebase/app';
import 'firebase/firestore';
import { supabase } from '../lib/supabaseClient';

export class WebRTCManager {
  private firestore: firebase.firestore.Firestore;
  private pc: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private setInputCallValue: (value: string) => void;
  private setRemoteVideoSrc: (srcObject: MediaStream | null) => void;
  private setShowStop: (value: boolean) => void;

  private router: any;
  private stopButtonRef: any;
  private callInput: any;

  constructor(
    firestore: firebase.firestore.Firestore,
    setInputCallValue: (value: string) => void,
    setRemoteVideoSrc: (srcObject: MediaStream | null) => void,
    setShowStop: (value: boolean) => void,
    router: any,
    stopButtonRef: any,
    callInput: any
  ) {
    this.firestore = firestore;
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      ],
    });
    if (typeof window !== 'undefined') {
      this.remoteStream = new MediaStream();
    }
    this.setInputCallValue = setInputCallValue;
    this.setRemoteVideoSrc = setRemoteVideoSrc;
    this.setShowStop = setShowStop;
    this.router = router;
    this.stopButtonRef = stopButtonRef;
    this.callInput = callInput;

    this.initConnectionEvents();
  }

  private initConnectionEvents() {
    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      this.setRemoteVideoSrc(this.remoteStream);
    };

    this.pc.onconnectionstatechange = async () => {
      if (['disconnected', 'failed'].includes(this.pc.connectionState)) {
        console.log('Connection failed, attempting reconnection...');
        await this.reconnect(this.callInput?.current?.value || '');
      }
    };
  }

  async startLocalStream(isDisplay: boolean) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
      if (isDisplay) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        displayStream.getTracks().forEach((track) => this.localStream?.addTrack(track));
      }
      this.localStream.getTracks().forEach((track) => this.pc.addTrack(track, this.localStream as MediaStream));
    } catch (error) {
      console.error('Error starting local stream:', error);
    }
  }

  async createOffer() {
    try {
      const callDoc = this.firestore.collection('calls').doc();
      const offerCandidates = callDoc.collection('offerCandidates');
      const answerCandidates = callDoc.collection('answerCandidates');

      this.setInputCallValue(callDoc.id);
      this.pc.onicecandidate = (event) => {
        if (event.candidate) offerCandidates.add(event.candidate.toJSON());
      };

      const offerDescription = await this.pc.createOffer();
      await this.pc.setLocalDescription(offerDescription);
      await callDoc.set({ offer: { type: offerDescription.type, sdp: offerDescription.sdp } });

      callDoc.onSnapshot((snapshot) => {
        const data = snapshot.data();
        if (!this.pc.currentRemoteDescription && data?.answer) {
          this.pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      answerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            this.pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
          }
        });
      });
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  async answerCall(callId: string) {
    try {
      const callDoc = this.firestore.collection('calls').doc(callId);
      const answerCandidates = callDoc.collection('answerCandidates');
      const offerCandidates = callDoc.collection('offerCandidates');

      this.pc.onicecandidate = (event) => {
        if (event.candidate) answerCandidates.add(event.candidate.toJSON());
      };

      const callData = (await callDoc.get()).data();
      if (callData) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(callData.offer));
        const answerDescription = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answerDescription);
        await callDoc.update({ answer: { type: answerDescription.type, sdp: answerDescription.sdp } });

        offerCandidates.onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              this.pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            }
          });
        });
      }
    } catch (error) {
      console.error('Error answering call:', error);
    }
  }

  async reconnect(callId: string) {
    try {
      console.log('Reconnecting...');
      this.pc = new RTCPeerConnection(this.pc.getConfiguration());
      await this.answerCall(callId);
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  }

  stopCamera() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.setRemoteVideoSrc(null);
  }

  async stopCall() {
    try {
      await supabase.from('signalCancelCall').insert([{ code: '1' }]).select();
      this.stopCamera();
      const callDocId = this.callInput?.current?.value;
      if (callDocId) {
        await this.firestore.collection('calls').doc(callDocId).delete();
      }
      this.pc.close();
      this.setInputCallValue('');
      this.router.refresh();
    } catch (error) {
      console.error('Error stopping call:', error);
    }
  }
}
