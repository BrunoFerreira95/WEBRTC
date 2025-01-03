'use client'
import 'webrtc'

import firebase from 'firebase/app'
import 'firebase/firestore'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useSession } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import Play from '../assets/icons/play.png'
import Image from 'next/image'
import Fechar from '../assets/icons/Fechar.png'
import Message from '../assets/icons/message.svg'
import Alert from '../assets/icons/alert.svg'
import Dialog from '../../components/DialogCall'
import { connectFirebase } from '../../lib/firebase'

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function GcmComunicasao() {
  const [modalCall, setModalCall] = useState(false)

  const { firestore, pc } = connectFirebase()
  function playSound() {
    const audio = new Audio(audioFile)
    audio.play()
  }


  let localStream = null
  let remoteStream = null

  // HTML elements
  const webcamButton = useRef(null)
  const clientButton = useRef(null)
  const webcamVideo = useRef<HTMLVideoElement>(null)
  const callButton = useRef(null)
  const callInput = useRef<HTMLInputElement>({ current: null })
  const answerButton = useRef(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const hangupButton = useRef(null)
  const [inputCallValue, setInputCallValue] = useState('')
  const [receive, setReceive] = useState(false)
  const [call, setCall] = useState(false)
  const stopButtonRef = useRef(null)
  const [showStop, setShowStop] = useState(false)
  const voiceSound = useRef(null)

  // 1. Setup media sources ---------------------------------------------------------------------------------------

  const clientButtonClick = async () => {
    if (userIdCall != session?.user.id) {
      return
    }
    localStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true
    })
    remoteStream = new MediaStream()

    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream)
    })

    // Pull tracks from remote stream, add to video stream
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
      })
    }
    const videoElementLocal = webcamVideo.current
    const videoElementRemote = remoteVideo.current
    videoElementRemote.srcObject = remoteStream

    callButton.disabled = false
    answerButton.disabled = false
    webcamButton.disabled = true
    hangupButton.disabled = false
    setCall(true)
    setReceive(true)
    setShowStop(true)

    answerButtonClick()
  }



  useEffect(() => {
    // Listen for the 'popstate' event to handle the back button clicks
    window.addEventListener('popstate', stopOffer);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('popstate', stopOffer);
    };
  }, []);

  const handleInputCallChange = () => {
    const value = callInput.current?.value || ''
    setInputCallValue(value)
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

  useEffect(() => { })

  // Função para parar a oferta
  async function stopOffer() {

    await supabase
      .from('signalCancelCall')
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

    router.refresh()



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

  }



  useEffect(() => {
    supabase.channel('custom-all-channelasd')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signalInteligenciaReconectar' },
        (payload) => {
          reconectar()
        }
      )
      .subscribe()




  })

  useEffect(() => {
    supabase.channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signalCancelInteligencia' },
        (payload) => {
          reconectar()
        }
      )
      .subscribe()
  })
  const answerButtonClick = async () => {

    remoteVideo.current.hidden = false;
    const callId = inputCallValue;
    const callDoc = firestore.collection('calls').doc(callId);
    const answerCandidates = callDoc.collection('answerCandidates');
    const offerCandidates = callDoc.collection('offerCandidates');

    pc.onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON());
    };

    const callData = (await callDoc.get()).data();

    if (callData) {
      const offerDescription = callData.offer;
      await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

      const answerDescription = await pc.createAnswer();
      await pc.setLocalDescription(answerDescription);

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      };

      await callDoc.update({ answer });

      offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          console.log(change);
          if (change.type === 'added') {
            let data = change.doc.data();
            pc.addIceCandidate(new RTCIceCandidate(data));
            if (pc?.iceConnectionState === 'closed' || pc?.iceConnectionState === 'disconnected' || pc?.iceConnectionState === 'failed') {
              console.log('Failed to connect to screen')
              setModalCall(true)
              SignalErrorConnect()
            } else {
            }
          }
        });
      });
    }
    // Estabelecer eventos para manipular a conexão

    pc.ontrack = (event) => {
      // Adicionar lógica para manipular o stream de mídia recebido
      const remoteVideoElement = remoteVideo;
      remoteVideoElement.srcObject = event.streams[0];
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        signalSendToast()
        // A conexão foi estabelecida com sucesso, você pode adicionar lógica adicional aqui, se necessário
        console.log('Conexão estabelecida com sucesso!');
      } else if (pc.iceConnectionState === 'disconnected') {
        // A conexão foi encerrada, você pode adicionar lógica adicional aqui, se necessário
        console.log('Conexão encerrada.');
        setModalCall(true)
        SignalErrorConnect()
      }
    };

    voiceReceiverCall()
  };




  // ------------------------------------------------------------------- VOICE CALL --------------------------------------------------------------------------------
  // // VOICE CALL ---------------------------------------------------------------------------------
  const voiceClick = async () => {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: true
    })
    remoteStream = new MediaStream()

    // Push tracks from local stream to peer connection
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream)
    })

    // Pull tracks from remote stream, add to video stream
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.addTrack(track)
      })
    }
    const videoElementRemote = voiceSound.current
    videoElementRemote.srcObject = remoteStream

    callButton.disabled = false
    answerButton.disabled = false
    webcamButton.disabled = true
    hangupButton.disabled = false
  }

  // 3. Answer the call with the unique ID
  const voiceReceiverCall = async () => {
    const callId = callInput.current.value
    const callDoc = firestore.collection('voice').doc(callId)
    const answerCandidates = callDoc.collection('answerCandidates')
    const offerCandidates = callDoc.collection('offerCandidates')

    pc.onicecandidate = (event) => {
      event.candidate && answerCandidates.add(event.candidate.toJSON())
    }

    const callData = (await callDoc.get()).data()

    if (callData) {

      const offerDescription = callData.offer
      await pc.setRemoteDescription(new RTCSessionDescription(offerDescription))

      const answerDescription = await pc.createAnswer()
      await pc.setLocalDescription(answerDescription)

      const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      }

      await callDoc.update({ answer })

      offerCandidates.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          console.log(change)
          if (change.type === 'added') {
            let data = change.doc.data()
            pc.addIceCandidate(new RTCIceCandidate(data))
          }
        })
      })
    }
  }

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
          name: 'GCM',
          mensagem: message,
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

  const session = useSession()
  const router = useRouter()
  const [userIdCall, setUserIdCall] = useState()

  useEffect(() => {
    if (
      session?.user.app_metadata && session?.user.app_metadata.userrole !== 'pm'
    ) {
      router.push('/404')
    }
  })

  useEffect(() => {
    if (
      session?.user.app_metadata &&
      session.user.app_metadata.userrole !== 'pm'
    ) {
      router.push('/404')
    }

    supabase
      .channel('custom-insert-channel2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'codigoComunicacao' },
        (payload) => {
          setInputCallValue(payload.new.codigo)
          setUserIdCall(payload.new.IdUser)

        }
      )
      .subscribe()

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

  if (inputCallValue.length > 0) {
    clientButtonClick()
  }

  const Signal = async () => {
    const dataAtual = new Date().toLocaleString('pt-BR', {
      timeZone: 'UTC'
    })
    const dataFormatada = dataAtual.replace(
      /(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/,
      '$3-$2-$1 $4:$5:$6'
    )
    const { data, error } = await supabase.from('signalApoio').insert([
      {
        name: session?.user.user_metadata.nome,
        telefone: session?.user.user_metadata.telefone,
        data: dataFormatada,
        IdUser: session?.user.id
      }
    ])
  }


  useEffect(() => {
    showToast()
    Signal()
  }, [])

  async function SignalErrorConnect() {

    await supabase
      .from('signalApoioError')
      .insert([
        { error: '1' },
      ])
      .select()

  }

  function reconectar() {
    router.refresh()
  }


  return (
    <>
      <div className="bg-fundo min-h-screen max-h-fit">
        <div>
          
        </div>
        <div className="flex justify-center mb-5 ml-24 mr-10">
          <div className="videos flex flex-row">
            <span>
              <video
                controls
                className="w-4/5 h-96  "
                ref={remoteVideo}
                autoPlay
                hidden
                playsInline></video>
            </span>
          </div>
        </div>
        <div className="flex justify-center sm:mr-20 ml-2 sm:mt-4">
          {inputCallValue.length > 0 ? (
            <>
              <button hidden ref={clientButton} onClick={clientButtonClick}>
                <Image src={Play} alt="play" />
              </button>
            </>
          ) : (
            <></>
          )}

          <input
            ref={callInput}
            hidden
            className="bg-write sm:h-8 sm:w-72 w-32 h-auto font-bold"
            defaultValue={inputCallValue}
          />
          {inputCallValue.length < 0 ? (
            <button
              ref={answerButton}
              className="bg-red-600 sm:h-8 font-semibold sm:w-52 sm:rounded-md rounded-sm ml-4 text-sm"
              onClick={answerButtonClick}>
              Receber
            </button>
          ) : (
            <></>
          )}
          {showStop ? (
            <button ref={stopButtonRef} onClick={stopOffer}>
              <Image src={Fechar} alt="Fechar" />
            </button>
          ) : null}
        </div>
        <div>
          <div className="flex justify-center">
            <div
              className="h-44 overflow-auto w-full rounded mb-4 mt-6 bg-white bg-write border border-gray-300 m-5"
              ref={chatContainerRef}>
              {chat.map((mensagem) => (
                <div key={mensagem.id + 1} className="flex flex-col">
                  <div className="ml-2 mr-2">
                    {mensagem.name === 'GCM' ? (
                      <>
                        <div className="flex justify-end">
                          <span className="p-1 bg-blue-100 text-black rounded-tl-lg rounded-br-lg rounded-bl-lg">
                            {mensagem.name}:{mensagem.mensagem}
                          </span>
                        </div>
                        <div className="flex justify-end">
                          <span className="text-sm text-gray-400 mt-1 ">
                            {mensagem.data}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-start">
                          <span className="p-1 bg-gray-200 rounded-tr-lg rounded-br-lg rounded-bl-lg text-black ">
                            {mensagem.name}:{mensagem.mensagem}
                          </span>
                        </div>
                        <div className="flex justify-start">
                          <span className="text-sm text-gray-400 mt-1 ">
                            {mensagem.data}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="border-2 border-gray-300 px-4 py-2 w-full rounded-lg ml-5 focus:outline-none focus:border-blue-500"
              onKeyDown={handleKeyDown} // Adicione este atributo para detectar a tecla "Enter"
              placeholder="Digite uma mensagem"
            />
            <button
              className="py-2 px-4 flex items-center"
              onClick={sendMessage}>
              <Image src={Message} alt="icon" className="w-5 h-5 mr-2" />
            </button>
          </div>
          {modalCall ? (
            <Dialog setModal={setModalCall} />
          ) : null}
        </div>
        <ToastContainer/>
        </div>
    </>
  )
}

async function signalSendToast() {
    
  await supabase
  .from('signalSendToast')
  .insert([
    { code: '1' },
  ])
  .select()

}

const showToast = () => {
  toast.success('Sinal enviado para a central 😉', {
      position: "top-center",
      autoClose: 30000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
  });
}