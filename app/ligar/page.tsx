'use client';
import 'webrtc';
import firebase from 'firebase/app';
import 'firebase/firestore';
import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Play from '../assets/icons/play.png';
import Fechar from '../assets/icons/Fechar.png';
import Message from '../assets/icons/message.svg';
import Dialog from '../../components/DialogCall';
import { connectFirebase } from '../../lib/firebase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Alert from '../assets/icons/alert.svg'
import React from 'react';

const GcmComunicasao = () => {
  // --- Estados e Refs ---
  const [modalCall, setModalCall] = useState(false);
  const [inputCallValue, setInputCallValue] = useState('');
  const [receive, setReceive] = useState(false);
  const [call, setCall] = useState(false);
  const [showStop, setShowStop] = useState(false);
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
    const [userIdCall, setUserIdCall] = useState();
  const webcamVideo = useRef<HTMLVideoElement>(null);
  const callButton = useRef<HTMLButtonElement>(null);
  const callInput = useRef<HTMLInputElement>(null);
  const answerButton = useRef<HTMLButtonElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const hangupButton = useRef<HTMLButtonElement>(null);
  const stopButtonRef = useRef<HTMLButtonElement>(null);
    const messageInput = useRef<HTMLInputElement>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);
  // -- Configurações Iniciais ---
  const { firestore, pc } = connectFirebase();
  const router = useRouter();
  const session = useSession();
    let localStream: MediaStream | null = null;
    let remoteStream: MediaStream | null = null;

      if(typeof window !== 'undefined'){
            remoteStream = new MediaStream();
      }


  // --- Aux Functions ---
  function stopCamera() {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      localStream = null;
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = null;
      }
    }
  }

  const handleInputCallChange = () => {
      const value = callInput.current?.value || '';
      setInputCallValue(value);
  };


  const fetchChat = async () => {
      const { data } = await supabase.from('chat').select('*');
      setChat(data);
  };

  const showToast = () => {
      toast.success('Sinal enviado para a central 😉', {
          position: 'top-center',
          autoClose: 30000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: 'light',
      });
  };

  async function SignalErrorConnect() {
    await supabase
        .from('signalApoioError')
        .insert([{ error: '1' }])
        .select();
  }


    async function signalSendToast() {
        await supabase.from('signalSendToast').insert([{ code: '1' }]).select();
    }

    const Signal = async () => {
    const dataAtual = new Date().toLocaleString('pt-BR', {
      timeZone: 'UTC'
    })
    const dataFormatada = dataAtual.replace(
      /(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/,
      '$3-$2-$1 $4:$5:$6'
    )
    await supabase
      .from('signalApoio')
      .insert([
        {
          name: session?.user.user_metadata.nome,
          telefone: session?.user.user_metadata.telefone,
          data: dataFormatada,
          IdUser: session?.user.id
        }
      ])
    };
  const sendMessage = async () => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    const formattedTime = currentDate.toLocaleTimeString();
      await supabase
          .from('chat')
          .insert([
              {
                  name: 'GCM',
                  mensagem: message,
                  data: ` ${formattedDate} ${formattedTime}`,
              },
          ])
          .select();
      setMessage('');
      if(messageInput.current){
          messageInput.current.value = '';
      }
  };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    };

    function reconectar() {
        router.refresh();
    }

    // --- Call Functions ---

    const startCall = async () => {
      localStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
      });

      localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
      });
        pc.ontrack = (event) => {
            event.streams[0].getTracks().forEach((track) => {
                remoteStream?.addTrack(track);
            });
        };
        const videoElementRemote = remoteVideo.current;
          if(videoElementRemote){
              videoElementRemote.srcObject = remoteStream;
          }

      callButton.disabled = false;
      answerButton.disabled = false;
      hangupButton.disabled = false;
      setCall(true);
      setReceive(true);
      setShowStop(true);
      answerButtonClick();
    };

    const answerButtonClick = async () => {
      if (remoteVideo.current) {
          remoteVideo.current.hidden = false;
      }
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
            sdp: answerDescription.sdp,
          };
        await callDoc.update({ answer });
        offerCandidates.onSnapshot((snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                let data = change.doc.data();
                pc.addIceCandidate(new RTCIceCandidate(data));
                 if (pc?.iceConnectionState === 'closed' || pc?.iceConnectionState === 'disconnected' || pc?.iceConnectionState === 'failed') {
                   setModalCall(true)
                    SignalErrorConnect()
                } else {
                }
            }
          });
        });
      }
        pc.ontrack = (event) => {
            if(remoteVideo.current){
                  remoteVideo.current.srcObject = event.streams[0];
            }
        };
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'connected') {
              signalSendToast()
                console.log('Conexão estabelecida com sucesso!');
          } else if (pc.iceConnectionState === 'disconnected') {
               setModalCall(true)
                SignalErrorConnect()
            }
        };
    };
  const stopOffer = async () => {
      await supabase.from('signalCancelCall').insert([{ code: '1' }]).select();
    stopCamera();
    if (pc) {
      const callDocId = callInput.current?.value;
        if (callDocId) {
          const callDoc = firestore.collection('calls').doc(callDocId);
        await callDoc.delete();
      }
      pc.close();
    }
    router.refresh();
    if (callInput.current) {
        callInput.current.value = '';
    }
    setInputCallValue('');
    if (remoteVideo.current) {
      remoteVideo.current.hidden = true;
    }
      if (stopButtonRef.current) {
          stopButtonRef.current.hidden = true;
      }
    };

    // --- Effects ---

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);

    useEffect(() => {
        window.addEventListener('popstate', stopOffer);
        return () => {
            window.removeEventListener('popstate', stopOffer);
        };
    }, []);

  useEffect(() => {
    if (
      session?.user.app_metadata &&
      session.user.app_metadata.userrole !== 'pm'
    ) {
      router.push('/404');
    }
    supabase
      .channel('custom-insert-channel2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'codigoComunicacao' },
        (payload) => {
          setInputCallValue(payload.new.codigo);
            setUserIdCall(payload.new.IdUser);
        }
      )
      .subscribe();
      supabase
        .channel('chat')
        .on(
          'postgres_changes',
          { event: 'insert', schema: 'public', table: 'chat' },
          () => {
            fetchChat();
          }
        )
        .subscribe();
  }, [session, router]);
    useEffect(() => {
        fetchChat();
    }, []);
  useEffect(() => {
      supabase
        .channel('custom-all-channelasd')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'signalInteligenciaReconectar' },
          () => {
            reconectar();
          }
        )
        .subscribe();
    }, [])
      useEffect(() => {
          supabase
              .channel('custom-all-channel')
              .on(
                  'postgres_changes',
                  { event: '*', schema: 'public', table: 'signalCancelInteligencia' },
                  () => {
                      reconectar();
                  }
              )
              .subscribe();
      }, [])
  useEffect(() => {
      showToast();
      Signal();
  }, []);
  useEffect(() => {
    if (inputCallValue.length > 0) {
      startCall();
    }
  }, [inputCallValue]);
  return (
      <div className="bg-fundo min-h-screen max-h-fit p-4">
          <div className="flex justify-center mb-5">
             <h2 className="text-2xl font-bold text-center">Painel do GCM</h2>
          </div>
        <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
              <div className="videos flex flex-col items-center w-full md:w-2/3">
              <div className="relative w-full max-w-2xl aspect-video mb-4">
                    <video
                      className="absolute top-0 left-0 w-full h-full rounded-lg object-cover"
                        ref={remoteVideo}
                      autoPlay
                      hidden
                        controls
                      playsInline
                        style={{backgroundColor: 'black'}}
                    />
            </div>
                  <div className="flex justify-center">
                        {showStop ? (
                        <button
                                    ref={stopButtonRef}
                          onClick={stopOffer}
                          className="bg-red-500 text-white font-bold px-4 py-2 rounded-md hover:bg-red-700 transition-all duration-300 flex items-center"
                            >
                          <Image src={Fechar} alt="Fechar" className="h-6 w-6 mr-2" />
                                Parar Ligação
                        </button>
                         ) : null}
                    </div>
        </div>
          {/* Controls Area */}
          <div className="flex flex-col w-full md:w-1/3 max-w-sm">
              <div className="bg-gray-100 p-4 rounded-md shadow-md flex flex-col gap-2 mb-4">
                  {/* Call Control  */}
                    <input
                          ref={callInput}
                          hidden
                          className="bg-white h-8 font-semibold rounded-md mb-2 "
                          onChange={handleInputCallChange}
                          value={inputCallValue}
                      />
                    {inputCallValue.length > 0 ? (
                        <>
                            <button
                                ref={callButton}
                                className="bg-blue-500 text-white font-bold py-2 rounded-md hover:bg-blue-700 transition-all duration-300 hidden"
                            >
                                Fazer Ligação
                            </button>
                        </>
                        ) : (
                        <button
                                ref={answerButton}
                            className="bg-blue-500 text-white font-bold py-2 rounded-md hover:bg-blue-700 transition-all duration-300"
                            onClick={answerButtonClick}
                        >
                                Atender Ligação
                            </button>
                    )}
              </div>
            </div>
          </div>
          {/* Chat Section */}
      <div className="flex justify-center">
        <div className="w-full max-w-3xl mt-4 bg-white p-4 rounded-md shadow-md">
              <div
                  ref={chatContainerRef}
                  className="h-60 overflow-y-auto mb-2 p-2 border rounded-md"
                  >
                {chat.map((message, index) => (
                      <div key={index} className="mb-2 p-2 rounded-md bg-gray-100">
                          <span className="font-semibold">{message.name}:</span>
                          <p className="whitespace-pre-line">{message.mensagem}</p>
                            <p className="text-xs text-gray-500">
                                {message.data}
                              </p>
                      </div>
                  ))}
              </div>
            <div className="flex gap-2 items-center">
                <input
                    ref={messageInput}
                    type="text"
                  className="flex-grow border p-2 rounded-md"
                  placeholder="Escreva sua mensagem..."
                    onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  />
                <button
                      onClick={sendMessage}
                  className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 p-2 rounded-md transition duration-300"
                    >
                        <Image src={Message} alt="Send Message" className="h-6 w-6" />
                </button>
            </div>
          </div>
        </div>
        {modalCall ? <Dialog setModal={setModalCall} /> : null}
        <ToastContainer />
    </div>
  );
};
export default GcmComunicasao;