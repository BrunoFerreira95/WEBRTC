// WebRTCManager.ts
import firebase from 'firebase/app';
import 'firebase/firestore';
import { supabase } from '../lib/supabaseClient';


export class WebRTCManager {
  private firestore: firebase.firestore.Firestore;
  public pc: RTCPeerConnection;
  public localStream: MediaStream | null = null;
  public remoteStream: MediaStream | null = null;
  private setInputCallValue: (value: string) => void;
  private setRemoteVideoSrc: (srcObject: MediaStream | null) => void;
  private setShowStop: (value: boolean) => void;
  private router: any;
  private stopButtonRef: any;
  private callInput: any;


  constructor(firestore: firebase.firestore.Firestore,
    setInputCallValue: (value: string) => void,
    setRemoteVideoSrc: (srcObject: MediaStream | null) => void,
    setShowStop: (value: boolean) => void,
    router: any,
    stopButtonRef: any,
    callInput: any) {
    this.firestore = firestore;
    this.pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
          ],
        },
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
  }
  async startLocalStream(isDisplay: boolean) {

    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true,
    });
    if (isDisplay) {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      displayStream.getTracks().forEach((track) => {
        this.localStream?.addTrack(track);
      });
    }
    this.localStream.getTracks().forEach((track) => {
      this.pc.addTrack(track, this.localStream as MediaStream);
    });
    this.pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      this.setRemoteVideoSrc(this.remoteStream)
    };
  }
  async createOffer() {
    const callDoc = this.firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

    if (this.callInput) {
      this.callInput.current.value = callDoc.id;
    }
    this.setInputCallValue(this.callInput?.current?.value || '');

    this.pc.onicecandidate = (event) => {
      event.candidate && offerCandidates.add(event.candidate.toJSON());
    };
    const offerDescription = await this.pc.createOffer();
    await this.pc.setLocalDescription(offerDescription);

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };

    await callDoc.set({ offer });

    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data();
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answerDescription);
      }
    });
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc.addIceCandidate(candidate);
        }
      });
    });
  }

  async answerCall(callId: string) {
    const callDoc = this.firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        answerCandidates.add(event.candidate.toJSON());
      }
    };


    const callData = (await callDoc.get()).data();
    if (callData) {
      const offerDescription = callData.offer;
      await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

      const answerDescription = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
      };
      await callDoc.update({ answer });


      const unsubscribeOfferCandidates = offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const data = change.doc.data();
          if (!data) return; // Handle cases where doc data is missing

          try {
            const candidate = new RTCIceCandidate(data);
            console.log(change.type)
            switch (change.type) {

              case 'added':
                this.pc.addIceCandidate(candidate);
                break;
              case 'modified':
                this.pc.addIceCandidate(candidate);
                break;
              case 'removed':
                //Handle removal if needed.
                break;
            }
          } catch (error) {
            console.error('Error adding ice candidate:', error, data);
          }


        });
      });
      this.pc.onconnectionstatechange = async () => {
        if (this.pc.connectionState === 'disconnected' || this.pc.connectionState === 'failed') {
          console.log(this.pc.connectionState)
          console.log('connection state changed, attempt re-connect')
          unsubscribeOfferCandidates();
          await this.reconnect(callId);
        }
      }
    }
    this.pc.ontrack = (event) => {
      if (this.remoteStream) {
        this.setRemoteVideoSrc(event.streams[0]);
      }
    };

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
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
      this.setRemoteVideoSrc(null);
    }
  }
  async stopCall() {
    await supabase.from('signalCancelCall').insert([{ code: '1' }]).select();
    this.stopCamera();
    if (this.pc) {
      const callDocId = this.callInput.current?.value;
      if (callDocId) {
        const callDoc = this.firestore.collection('calls').doc(callDocId);
        await callDoc.delete();
      }
      this.pc.close();
    }
    if (this.callInput) {
      this.callInput.current.value = '';
    }
    this.setInputCallValue('');
    this.setRemoteVideoSrc(null)
    if (this.stopButtonRef.current) {
      this.stopButtonRef.current.hidden = true;
    }
    this.router.refresh();
  }
}