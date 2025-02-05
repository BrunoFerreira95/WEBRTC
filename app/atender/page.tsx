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
import { WebRTCManager } from '../WebRTCManager';
import { createClient } from '@/lib/server';
import { getUser } from './user';
import UserProfile from '@/components/UserProfile';
import AdminNav from '@/components/AdminNav';
import createToast from '../../components/toast';

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
  const { firestore } = connectFirebase();
  const router = useRouter();
  const session = useSession();
  const [remoteVideoSrc, setRemoteVideoSrc] = useState<MediaStream | null>(null);
  const webRTCManagerRef = useRef<WebRTCManager | null>(null);


  // -- Configurações Iniciais ---

  // --- Aux Functions ---
  useEffect(() => {
    webRTCManagerRef.current = new WebRTCManager(
      firestore,
      setInputCallValue,
      setRemoteVideoSrc,
      setShowStop,
      router,
      stopButtonRef,
      callInput
    );
    return () => {
      if (webRTCManagerRef.current) {
        webRTCManagerRef.current.stopCall()
      }
    }
  }, [firestore, setInputCallValue, setRemoteVideoSrc, setShowStop, router, stopButtonRef, callInput])
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
    const dataAtual = new Date();
    const dataFormatada = dataAtual.toLocaleString('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/, '$3-$2-$1 $4:$5:$6');

    const userResponse = await getUser();
    const user = userResponse?.data?.user;

    if (!user) {
      console.error("Usuário não encontrado.");
      return;
    }

    const displayName = user.user_metadata?.name || user.email;
    try {
      await supabase
        .from('signalApoio')
        .insert([
          {
            name: displayName,
            data: dataFormatada,
            IdUser: user.id,
          }
        ]);
      return { message: 'Sinal enviado com sucesso' };
    } catch (error: any) {
      return { error: `Erro ao enviar sinal: ${error.message}` };
    }

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
    if (messageInput.current) {
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
    const user = await getUser()
    if (userIdCall == user.data.user.id) {
      if (webRTCManagerRef.current) {
        await webRTCManagerRef.current.startLocalStream(false)
      }

      const videoElementRemote = remoteVideo.current;
      if (remoteVideoSrc && videoElementRemote) {
        videoElementRemote.srcObject = remoteVideoSrc;
      }

      callButton.disabled = false;
      answerButton.disabled = false;
      hangupButton.disabled = false;
      setCall(true);
      setReceive(true);
      setShowStop(true);
      answerButtonClick();
    }
  };

  const answerButtonClick = async () => {
    if (remoteVideo.current) {
      remoteVideo.current.hidden = false;
    }

    const callId = inputCallValue;
    if (webRTCManagerRef.current) {
      await webRTCManagerRef.current.answerCall(callId)
    }
  };
  const stopOffer = async () => {
    if (webRTCManagerRef.current) {
      await webRTCManagerRef.current.stopCall(userIdCall, 'desligar');
    }
    if (remoteVideo.current) {
      remoteVideo.current.hidden = true;
    }
    if (stopButtonRef.current) {
      stopButtonRef.current.hidden = true;
    }
    window.location.reload();

  };
  useEffect(() => {
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = remoteVideoSrc;
    }
  }, [remoteVideoSrc]);

  // --- Effects ---

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chat]);



  useEffect(() => {
    supabase
      .channel('custom-insert-channel2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'codigoComunicacao' },
        (payload) => {
          setInputCallValue(payload.new.codigo);
          setUserIdCall(payload.new.IdUser);
          console.log(payload)
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
  }, []);
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
  }, []);
  useEffect(() => {
    showToast();
    Signal();
  }, []);
  useEffect(() => {
    if (inputCallValue.length > 0) {
      startCall();
    }
  }, [inputCallValue]);

  useEffect(() => {


    const stopcall = supabase.channel(`user-channel-${userIdCall}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signalCancelCall',
          filter: `IntId=eq.${userIdCall}`
        },
        (payload) => {
          if (payload.new?.IntId == userIdCall) {
            createToast('O service desligou a chamada.', 'info');
            setTimeout(() => {
              window.location.reload(); // Recarrega a página
            }, 5000);
          }
        }
      )
      .subscribe()

    return () => {
      stopcall.unsubscribe()
    };
  }, [userIdCall]);
  return (
    <div className="bg-fundo min-h-screen max-h-fit p-4">
      <UserProfile />
      <AdminNav />
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
              style={{ backgroundColor: 'black' }}
            />
          </div>
          {showStop ? (
            <div className="flex justify-center">
              <button
                ref={stopButtonRef}
                onClick={stopOffer}
                className="bg-red-500 text-white font-bold px-4 py-2 rounded-md hover:bg-red-700 transition-all duration-300 flex items-center"
              >
                <Image src={Fechar} alt="Fechar" className="h-6 w-6 mr-2" />
                Parar Ligação
              </button>
            </div>
          ) : null}
        </div>
        {/* Controls Area */}
        <div className="flexflex-col w-full md:w-1/3 max-w-sm">
          <div className=" p-4 rounded-md shadow-md flex flex-col gap-2 mb-4">
            {/* Call Control  */}
            <input
              ref={callInput}
              hidden
              className=" h-8 font-semibold rounded-md mb-2 "
              onChange={handleInputCallChange}
              value={inputCallValue}
            />

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
                <p className="whitespace-pre-line text-black">{message.mensagem}</p>
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