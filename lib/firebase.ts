import firebase from 'firebase/app'
import 'firebase/firestore'
import { useEffect, useState } from 'react'
import 'webrtc'

export function connectFirebase() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_APIKEY,
    authDomain: process.env.NEXT_PUBLIC_AUTHDOMAIN,
    projectId: process.env.NEXT_PUBLIC_PROJECTID,
    storageBucket: process.env.NEXT_PUBLIC_STORAGEBUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_MESSAGINGSENDERID,
    appId: process.env.NEXT_PUBLIC_APPID,
    measurementId: process.env.NEXT_PUBLIC_MEASUREMENTID
  }

  if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig)
    }
    
    const firestore = firebase.firestore()
  
  const servers = {
      iceServers: [
          {
              urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
            }
        ],
        iceCandidatePoolSize: 10
    }

    const [pc, setPC] = useState<RTCPeerConnection>()

    useEffect(() => {
        const newpc = new RTCPeerConnection(servers)
        setPC(newpc)
      }, [])
    return {pc, firestore}
}
