'use client';
import 'webrtc';
import 'firebase/firestore';
import { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Alerta from '../assets/icons/alerta.png';
import SignalApoio from '../../public/signalGCM.mp3';
import { connectFirebase } from '../../lib/firebase';
import Fechar from '../assets/icons/Fechar.png';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Message from '../assets/icons/message.svg';

import React from 'react';
import { WebRTCManager } from '../WebRTCManager';

const InteligenciaComunicacao = () => {
  // --- Estados e Refs ---
    const [showStop, setShowStop] = useState(false);
    const [inputCallValue, setInputCallValue] = useState('');
    const [chat, setChat] = useState([]);
    const [signalCGM, setSignalCGM] = useState<any>([]);
    const [buttonError, setButtonError] = useState(false);
    const webcamButton = useRef<HTMLButtonElement>(null);
    const webcamVideo = useRef<HTMLVideoElement>(null);
    const callButton = useRef<HTMLButtonElement>(null);
    const stopButtonRef = useRef<HTMLButtonElement>(null);
    const callInput = useRef<HTMLInputElement>(null);
    const remoteVideo = useRef<HTMLVideoElement>(null);
    const hangupButton = useRef<HTMLButtonElement>(null);
    const messageInput = useRef<HTMLInputElement>(null);
    const [message, setMessage] = useState<string>('');
    const { firestore } = connectFirebase();
    const router = useRouter();
    const session = useSession();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [remoteVideoSrc, setRemoteVideoSrc] = useState<MediaStream | null>(null);


    const webRTCManagerRef = useRef<WebRTCManager | null>(null);
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
        if(webRTCManagerRef.current) {
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
  if (typeof document !== 'undefined') {
    document.body.click();
  }


  const playSound = () => {
       const audio = new Audio(SignalApoio);
        audio.play();
  };
  const sendSignal = async () => {
    const dataAtual = new Date().toLocaleString('pt-BR', {
      timeZone: 'UTC'
    })
    const dataFormatada = dataAtual.replace(
      /(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/,
      '$3-$2-$1 $4:$5:$6'
    )
    await supabase
      .from('alertaGCM')
      .insert([{ gcm: 1, name: session?.user.user_metadata.nome, data: dataFormatada }])
      .select();
  };
  const mensagemAutomatica = async (texto: string | number) => {
    let mensagem = '';
    switch (texto) {
      case 0:
        mensagem = 'Aguarde alguns segundos...';
        break;
      case 1:
        mensagem = 'Posso compartilhar?';
        break;
      default:
        mensagem = String(texto);
        break;
    }
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    const formattedTime = currentDate.toLocaleTimeString();
    await supabase
      .from('chat')
      .insert([
        {
          name: session?.user.user_metadata.nome,
          mensagem: mensagem,
          data: ` ${formattedDate} ${formattedTime}`,
        },
      ])
      .select();
  };
  const sendMessage = async () => {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    const formattedTime = currentDate.toLocaleTimeString();
    await supabase
      .from('chat')
      .insert([
        {
          name: session?.user.user_metadata.nome,
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

  const feactSignalApoio = async () => {
    const { data: signalApoio } = await supabase
      .from('signalApoio')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setSignalCGM(signalApoio);
  };
  function reconectar() {
      router.refresh();
  }

  // --- Call Functions ---

  const webcamButtonClick = async () => {
        if(webRTCManagerRef.current) {
            await webRTCManagerRef.current.startLocalStream(true)
        }


      const videoElementLocal = webcamVideo.current;
      if(videoElementLocal){
        videoElementLocal.srcObject = webRTCManagerRef.current?.localStream;
      }
      const videoElementRemote = remoteVideo.current;
        if(remoteVideoSrc && videoElementRemote)
        {
            videoElementRemote.srcObject = remoteVideoSrc;
        }

    callButton.disabled = false;
    webcamButton.disabled = true;
    hangupButton.disabled = false;
    if (webcamVideo.current) {
      webcamVideo.current.hidden = false;
    }
    if (callButton.current) {
      callButton.current.hidden = true;
    }
    if (webcamButton.current) {
      webcamButton.current.hidden = true;
    }
    setShowStop(true);
  };
  const callButtonClick = async (id: string) => {
        if(webRTCManagerRef.current){
            await webRTCManagerRef.current.createOffer()
        }
      await supabase.from('codigoComunicacao').insert([{ codigo: callInput.current?.value, IdUser: id }]);
      hangupButton.disabled = false;
  };
  const stopOffer = async () => {
        if(webRTCManagerRef.current) {
            await webRTCManagerRef.current.stopCall();
        }
        if (remoteVideo.current) {
            remoteVideo.current.hidden = true;
        }
      if(stopButtonRef.current){
        stopButtonRef.current.hidden = true;
      }
    router.refresh();
  };
    useEffect(() => {
        if (remoteVideo.current) {
            remoteVideo.current.srcObject = remoteVideoSrc;
        }
      }, [remoteVideoSrc]);
  // --- Effects ---
  useEffect(() => {
    if (
      session?.user.app_metadata &&
      session?.user.app_metadata.userrole !== 'inteligencia'
    ) {
      router.push('/404');
    }
  }, [session, router]);
    useEffect(() => {
        supabase
            .channel('cancelcall')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'signalCancelCall' },
                () => {
                    router.refresh();
                }
            )
            .subscribe();
    }, [router]);
    useEffect(() => {

        supabase.channel('signalSendToast')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'signalSendToast' },
                () => {
                    showToast()
                }
            )
            .subscribe()

    })
    useEffect(() => {
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
    }, []);
    useEffect(() => {
        fetchChat();
    }, []);

    useLayoutEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chat]);

  useEffect(() => {
    supabase
      .channel('custom-insert-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'signalApoio' },
        () => {
          feactSignalApoio();
          playSound();
        }
      )
      .subscribe();
    feactSignalApoio();
  }, []);
  useEffect(() => {
    supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signalApoioError' },
        () => {
          setButtonError(true);
        }
      )
      .subscribe();
  }, []);

  return (
    <div className="bg-fundo min-h-screen max-h-fit p-4">
      <div className="flex justify-center">
        <h2 className="text-2xl font-bold mb-4 text-center">Painel de Inteligência</h2>
      </div>
      <div className="flex flex-col md:flex-row justify-center gap-4 mb-4">
        {/* Video Area */}
        <div className="videos flex flex-col items-center w-full md:w-2/3">
          <div className="relative w-full max-w-2xl aspect-video mb-4">
            <video
              className="absolute top-0 left-0 w-full h-full rounded-lg object-cover"
              ref={webcamVideo}
              autoPlay
              controls
              hidden
              muted
              playsInline
              style={{ backgroundColor: 'black' }}
            />
            <video
              className="absolute top-0 left-0 w-full h-full rounded-lg object-cover"
              ref={remoteVideo}
              autoPlay
              hidden
              controls
              playsInline
            />
          </div>
          <div className="flex  justify-center">
            {showStop ? (
              <button
                ref={stopButtonRef}
                onClick={stopOffer}
                className="bg-red-500 text-white font-bold px-4 py-2 rounded-md hover:bg-red-700 transition-all duration-300"
              >
                <Image src={Fechar} alt="Fechar" className="h-6 w-6" />
                Parar Compartilhamento
              </button>
            ) : null}
          </div>
        </div>
        {/* Controls Area */}
        <div className="flex flex-col w-full md:w-1/3 max-w-sm">
          <div className="bg-gray-100 p-4 rounded-md shadow-md flex flex-col gap-2 mb-4">
            <button
              ref={webcamButton}
              className="bg-green-500 text-white font-bold py-2 rounded-md hover:bg-green-700 transition-all duration-300"
              onClick={webcamButtonClick}
            >
              Compartilhar Tela
            </button>
            {buttonError && (
              <button
                onClick={reconectar}
                className="bg-orange-500 text-white font-bold py-2 rounded-md hover:bg-orange-700 transition-all duration-300"
              >
                Reconectar
              </button>
            )}
            {/* Call Control  */}
            <input
              ref={callInput}
              hidden
              className="bg-white h-8 font-semibold rounded-md mb-2 "
              onChange={handleInputCallChange}
              value={inputCallValue}
            />
            <button
              ref={callButton}
              className="bg-blue-500 text-white font-bold py-2 rounded-md hover:bg-blue-700 transition-all duration-300"
              onClick={() => callButtonClick(session?.user.id)}
              hidden
            >
              Fazer Ligação
            </button>

            <button
              onClick={sendSignal}
              className="bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 p-3 rounded-md transition duration-300 flex justify-center"
            >
              <Image src={Alerta} alt="Ícone" className="h-8 w-8" />
            </button>
          </div>

          {/*  Signal Button List */}
          <div className="mt-4 bg-gray-100 p-4 rounded-md shadow-md">
            <h3 className="text-xl font-semibold mb-2">Sinais de Apoio</h3>
            <div className="space-y-2">
              {signalCGM.map((signalUser) => (
                <button
                  key={signalUser.id}
                  onClick={() => callButtonClick(signalUser.IdUser)}
                  className="bg-slate-300 hover:bg-slate-400 active:bg-slate-500 p-2 m-2 rounded-lg text-black shadow-md transition duration-300 ease-in-out w-full text-left"
                >
                  <span>{signalUser.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center">
        {/* Chat Section */}
        <div className="w-full max-w-3xl mt-4 bg-white p-4 rounded-md shadow-md">
          <div
            ref={chatContainerRef}
            className="h-60 overflow-y-auto  mb-2 p-2 border rounded-md"
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
      <div>
        <ToastContainer />
      </div>
    </div>
  );
};

export function showToast() {
  toast.success('Compartilhamento de tela com sucesso 😉', {
    position: 'top-center',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
    theme: 'light',
  });
}

export default InteligenciaComunicacao;