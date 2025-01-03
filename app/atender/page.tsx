'use client'
declare module '*.mp3';
import 'webrtc'
import 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import error from 'next/error'
import { useSession } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import Voice from '../components/Voice'
import Message from '../assets/icons/message.svg'
import Image from 'next/image'
import Alerta from '../assets/icons/alerta.png'
import SignalApoio from '../../public/signalGCM.mp3'
import { connectFirebase } from '../../lib/firebase'
import Fechar from '../assets/icons/Fechar.png'

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function InteligenciaComunicacao() {
  const { firestore, pc } = connectFirebase()
  let localStream = null
  let remoteStream = null

  // HTML elements
  const [showStop, setShowStop] = useState(false)
  const webcamButton = useRef(null)
  const clientButton = useRef(null)
  const webcamVideo = useRef<HTMLVideoElement>(null)
  const callButton = useRef(null)
  const stopButtonRef = useRef(null)
  const callInput = useRef<HTMLInputElement>({ current: null })
  const answerButton = useRef(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const hangupButton = useRef(null)
  const voiceSound = useRef(null)
  const [inputCallValue, setInputCallValue] = useState('')
  // 1. Setup media sources



  const webcamButtonClick = async () => {
    remoteStream = new MediaStream()

    // Push tracks from local stream to peer connection

      //Obter o stream da câmera e microfone
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })


    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });

    // Adicionar cada track de vídeo e áudio da tela ao localStream
    displayStream.getTracks().forEach(track => {
      localStream.addTrack(track);
    });

    // Agora 'localStream' contém as tracks da câmera/microfone e da tela
    // Adicione as tracks do localStream ao seu PeerConnection
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // Pull tracks from remote stream, add to video stream
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
      })
    }

    const videoElementLocal = webcamVideo.current
    videoElementLocal.srcObject = localStream
    const videoElementRemote = remoteVideo.current
    videoElementRemote.srcObject = remoteStream

    callButton.disabled = false
    answerButton.disabled = false
    webcamButton.disabled = true
    hangupButton.disabled = false

    webcamVideo.current.hidden = false
    callButton.current.hidden = true
    webcamButton.current.hidden = true

    setShowStop(true)
  }

  // 2. Create an offer
  const handleInputCallChange = () => {
    const value = callInput.current?.value || ''
    setInputCallValue(value)
  }
  // 2. Create an offer
  const callButtonClick = async (id: string) => {
    // Reference Firestore collections for signaling
    const callDoc = firestore.collection('calls').doc()
    const offerCandidates = callDoc.collection('offerCandidates')
    const answerCandidates = callDoc.collection('answerCandidates')

    callInput.current.value = callDoc.id
    setInputCallValue(callInput.current?.value)
    const { data, error } = await supabase
      .from('codigoComunicacao')
      .insert([{ codigo: callInput.current?.value, IdUser: id }])

    console.log(data)
    console.log(error)
    // Get candidates for caller, save to db
    pc.onicecandidate = (event) => {
      event.candidate && offerCandidates.add(event.candidate.toJSON())
    }

    // Create offer
    const offerDescription = await pc.createOffer()
    await pc.setLocalDescription(offerDescription)

    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type
    }

    await callDoc.set({ offer })

    // Listen for remote answer
    callDoc.onSnapshot((snapshot) => {
      const data = snapshot.data()
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer)
        pc.setRemoteDescription(answerDescription)
      }
    })

    // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data())
          pc.addIceCandidate(candidate)
        }
      })
    })

    hangupButton.disabled = false
  }

  function stopCamera() {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      localStream = null
      const videoElement = document.getElementById('videoElement')
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = null
      }
    }
  }

  // Função para parar a oferta
  async function stopOffer() {


    await supabase
      .from('signalCancelInteligencia')
      .insert([
        { code: '1' },
      ])
      .select()
    // Parar a transmissão de vídeo (se necessário)
    stopCamera()

    // Parar o peer connection (pc)
    if (pc) {
      // Encerrar a oferta
      const callDocId = callInput.current?.value
      if (callDocId) {
        const callDoc = firestore.collection('calls').doc(callDocId)
        await callDoc.delete()
      }

      // Reiniciar o peer connection
      pc.close()

    }




    // Limpar os valores do input e desabilitar o botão de parada
    if (callInput.current) {
      callInput.current.value = ''
    }
    setInputCallValue('')
    if (remoteVideo.current) {
      remoteVideo.current.hidden = true
    }
    if (stopButtonRef.current) {
      stopButtonRef.current.hidden = true
    }

    router.refresh()
  }

  useEffect(() => {

    supabase.channel('cancelcall')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'signalCancelCall' },
        (payload) => {
          router.refresh()
        }
      )
      .subscribe()
  })

  const router = useRouter()
  const session = useSession()
  const [message, setMessage] = useState('')
  const [chat, setChat] = useState([])
  const sendMessage = async () => {
    const currentDate = new Date()
    const formattedDate = currentDate.toLocaleDateString()
    const formattedTime = currentDate.toLocaleTimeString()
    const { data, error } = await supabase
      .from('chat')
      .insert([
        {
          name: session?.user.user_metadata.nome,
          mensagem: message,
          data: ` ${formattedDate} ${formattedTime}`
        }
      ])
      .select()

    setMessage('')
  }
  const mensagemAutomatica = async (texto) => {
    switch (texto) {
      case 0:
        texto = 'Aguarde alguns segundos...'
        break
      case 1:
        texto = 'Posso compartilhar?'
        break


    }
    const currentDate = new Date()
    const formattedDate = currentDate.toLocaleDateString()
    const formattedTime = currentDate.toLocaleTimeString()
    const { data, error } = await supabase
      .from('chat')
      .insert([
        {
          name: session?.user.user_metadata.nome,
          mensagem: texto,
          data: ` ${formattedDate} ${formattedTime}`
        }
      ])
      .select()

    setMessage('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      sendMessage()
    }
  }

  useEffect(() => {
    if (
      session?.user.app_metadata && session?.user.app_metadata.userrole !== 'inteligencia'
    ) {
      router.push('/404')
    }

  })

  useEffect(() => {


    supabase
      .channel('chat')
      .on(
        'postgres_changes',
        { event: 'insert', schema: 'public', table: 'chat' },
        (payload) => {
          fetchChat()
        }
      )
      .subscribe()
  }, [])

  const chatContainerRef = useRef(null)

  const fetchChat = async () => {
    const { data } = await supabase.from('chat').select('*')

    setChat(data)
  }
  useEffect(() => {
    fetchChat()
  }, [])

  useEffect(() => {
    // Rola a div do chat para a parte inferior sempre que houver uma nova mensagem
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chat])
  const sendSignal = async () => {
    const dataAtual = new Date().toLocaleString('pt-BR', {
      timeZone: 'UTC'
    })
    const dataFormatada = dataAtual.replace(
      /(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/,
      '$3-$2-$1 $4:$5:$6'
    )

    const { data, error } = await supabase
      .from('alertaGCM')
      .insert([{ gcm: 1, name: session?.user.user_metadata.nome, data: dataFormatada }])
      .select();
  }


  function playSound() {
    const audio = new Audio(SignalApoio)
    audio.play()
  }


  const [signalCGM, setSignalCGM] = useState<any>([])
  const feactSignalApoio = async () => {
    let { data: signalApoio, error } = await supabase
      .from('signalApoio')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    setSignalCGM(signalApoio)
  }
  useEffect(() => {

    supabase.channel('custom-insert-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'signalApoio' },
        (payload) => {
          feactSignalApoio()
          playSound()
        }
      )
      .subscribe()

    feactSignalApoio()

  }, [])

  const [buttonError, setButtonError] = useState(false)

  useEffect(() => {

    const signalApoioError = supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signalApoioError' },
        (payload) => {
          setButtonError(true)
        }
      )
      .subscribe()
  })



  async function reconectar() {

    await supabase
      .from('signalInteligenciaReconectar')
      .insert([
        { error: '1' },
      ])
      .select()

    router.refresh()
  }


  useEffect(() => {

    supabase.channel('signalSendToast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'signalSendToast' },
        (payload) => {
          showToast()
        }
      )
      .subscribe()

  })
  return (
    <>
      <div className="bg-fundo min-h-screen max-h-fit">
        <div>

        </div>
        <div className="flex justify-center">
          <div className="videos flex flex-row w-4/5 justify-center">
            <video
              className="w-2/4 h-96"
              ref={webcamVideo}
              autoPlay
              controls
              hidden
              muted
              playsInline></video>
            <audio
              className="bg w-52 h-32 pb-6 mb-5"
              ref={remoteVideo}
              autoPlay
              hidden
              controls
              playsInline></audio>
            <audio
              className="h-20 w-96 bg-black"
              ref={voiceSound}
              autoPlay
              hidden
              controls></audio>
          </div>
        </div>
        <div className="flex justify-center">
          <div className="flex flex-col w-60 justify-auto">
            <button
              ref={webcamButton}
              className="bg-green-400 h-8 font-semibold rounded-md mb-2"
              onClick={webcamButtonClick}>
              Compartilhar tela
            </button>
            {buttonError ? (
              <button
                onClick={reconectar}
                className="bg-orange-500 h-8 font-semibold rounded-md mb-2"
              >
                Reconectar
              </button>

            ) : null}
            <button
              ref={callButton}
              className="bg-orange-500 h-8 font-semibold rounded-md mb-2"
              onClick={callButtonClick}
              hidden>
            </button>
            <div className='flex justify-center'>
              {showStop ? (
                <button ref={stopButtonRef} onClick={stopOffer}>
                  <Image src={Fechar} alt="Fechar" />
                </button>
              ) : null}

            </div>
            <button className="h-10 w-10 ml-24 mt-3" onClick={sendSignal}>
              <Image src={Alerta} alt="Ícone" />
            </button>

            <div className="flex justify-start">

            </div>

            <input
              ref={callInput}
              hidden
              className="bg-white h-8 font-semibold rounded-md mb-2 "
              onChange={handleInputCallChange}
              value={inputCallValue}

            />
          </div>
        </div>
        <div>

          {signalCGM.map((signalUser) => (
            <button onClick={(e) => callButtonClick(signalUser.IdUser)} className='bg-slate-300 hover:bg-slate-400 active:bg-slate-500 p-2 m-2 rounded-lg text-black shadow-md transition duration-300 ease-in-out' key={signalUser.id}>
              <span>{signalUser.name}</span>
            </button>
          ))}
        </div>
        <div>



          <ToastContainer />
        </div>
      </div>
    </>
  )
}

export function showToast() {
  toast.success('Compartilhamento de tela com sucesso 😉', {
    position: "top-center",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: "light",
  });
}