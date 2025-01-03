'use client';
declare module '*.mp3';
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


export default function InteligenciaComunicacao() {
  // --- Estados e Refs ---
  const [showStop, setShowStop] = useState(false); // Controla a exibição do botão de parar
  const [inputCallValue, setInputCallValue] = useState(''); // Valor do input do código da chamada
  const [chat, setChat] = useState([]); // Lista de mensagens do chat
  const [signalCGM, setSignalCGM] = useState<any>([]); // Sinais de apoio do GCM
  const [buttonError, setButtonError] = useState(false); // Flag para erro de conexão
  const webcamButton = useRef<HTMLButtonElement>(null); // Botão de compartilhar tela
  const clientButton = useRef<HTMLButtonElement>(null); // Botão do cliente (não usado?)
  const webcamVideo = useRef<HTMLVideoElement>(null); // Vídeo local
  const callButton = useRef<HTMLButtonElement>(null); // Botão de chamada
  const stopButtonRef = useRef<HTMLButtonElement>(null); // Botão de parar
  const callInput = useRef<HTMLInputElement>(null); // Input do código da chamada
  const answerButton = useRef<HTMLButtonElement>(null); // Botão de resposta (não usado?)
  const remoteVideo = useRef<HTMLVideoElement>(null); // Vídeo remoto
  const hangupButton = useRef<HTMLButtonElement>(null); // Botão de desligar (não usado?)
  const voiceSound = useRef<HTMLAudioElement>(null); // Áudio de voz (não usado?)
  let localStream: MediaStream | null = null; // Stream local de mídia
    let remoteStream: MediaStream | null = null; // Stream remoto de mídia

    if(typeof window !== 'undefined'){
        remoteStream = new MediaStream();
    }
  // -- Configurações Iniciais ---
  const { firestore, pc } = connectFirebase(); // Conecta ao Firebase
  const router = useRouter(); // Roteador do Next.js
  const session = useSession(); // Sessão do usuário Supabase
  const chatContainerRef = useRef<HTMLDivElement>(null); // Ref para a div do chat

  // --- Funções Auxiliares ---
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
  // --- Funções de Chamada ---
  const webcamButtonClick = async () => {
      //Obter o stream da câmera e microfone
      localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
      });
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
      });
      // Adicionar cada track de vídeo e áudio da tela ao localStream
      displayStream.getTracks().forEach((track) => {
          localStream?.addTrack(track);
      });
      // Adicionar as tracks do localStream ao PeerConnection
      localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
      });
      // Pull tracks from remote stream, add to video stream
      pc.ontrack = (event) => {
          event.streams[0].getTracks().forEach((track) => {
              remoteStream?.addTrack(track);
          });
      };
    const videoElementLocal = webcamVideo.current;
    if(videoElementLocal){
            videoElementLocal.srcObject = localStream;
    }
        const videoElementRemote = remoteVideo.current;
    if(videoElementRemote){
      videoElementRemote.srcObject = remoteStream;
    }


    callButton.disabled = false;
    answerButton.disabled = false;
    webcamButton.disabled = true;
    hangupButton.disabled = false;
        if(webcamVideo.current){
            webcamVideo.current.hidden = false;
        }
    if(callButton.current){
        callButton.current.hidden = true;
    }
      if(webcamButton.current){
           webcamButton.current.hidden = true;
      }
    setShowStop(true);
  };
    const callButtonClick = async (id: string) => {
        const callDoc = firestore.collection('calls').doc();
    const offerCandidates = callDoc.collection('offerCandidates');
    const answerCandidates = callDoc.collection('answerCandidates');

      if(callInput.current){
             callInput.current.value = callDoc.id;
      }
    setInputCallValue(callInput.current?.value || '');

    await supabase.from('codigoComunicacao').insert([{ codigo: callInput.current?.value, IdUser: id }]);
      // Get candidates for caller, save to db
      pc.onicecandidate = (event) => {
        event.candidate && offerCandidates.add(event.candidate.toJSON());
      };

    // Create offer
        const offerDescription = await pc.createOffer();
        await pc.setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await callDoc.set({ offer });
    // Listen for remote answer
        callDoc.onSnapshot((snapshot) => {
            const data = snapshot.data();
            if (!pc.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.setRemoteDescription(answerDescription);
            }
        });
        // When answered, add candidate to peer connection
    answerCandidates.onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
      hangupButton.disabled = false;
    };


  const stopOffer = async () => {
    await supabase.from('signalCancelInteligencia').insert([{ code: '1' }]).select();

      stopCamera();
        if (pc) {
            const callDocId = callInput.current?.value;
            if (callDocId) {
                const callDoc = firestore.collection('calls').doc(callDocId);
                await callDoc.delete();
            }
            pc.close();
        }
        if(callInput.current){
            callInput.current.value = '';
        }
        setInputCallValue('');

    if (remoteVideo.current) {
      remoteVideo.current.hidden = true;
    }
    if (stopButtonRef.current) {
      stopButtonRef.current.hidden = true;
    }
    router.refresh();
    };

    // --- Efeitos Colaterais (useEffect) ---
  useEffect(() => {
    // Verifica se o usuário tem permissão (não-inteligencia)
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
    // --- JSX ---
    return (
        <div className="bg-fundo min-h-screen max-h-fit">
      <div ></div>
            <div className="flex justify-center">
        <div className="videos flex flex-row w-4/5 justify-center">
                <video
                    className="w-2/4 h-96"
                  ref={webcamVideo}
                  autoPlay
                  controls
                    hidden
                    muted
                  playsInline
                />
                <audio
                  className="bg w-52 h-32 pb-6 mb-5"
                  ref={remoteVideo}
                  autoPlay
                    hidden
                    controls
                  playsInline
                />
        </div>
        </div>
        <div className="flex justify-center">
        <div className="flex flex-col w-60 justify-auto">
                    <button
                        ref={webcamButton}
                        className="bg-green-400 h-8 font-semibold rounded-md mb-2"
                        onClick={webcamButtonClick}
                    >
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
                        hidden
                    />
                    <div className="flex justify-center">
                        {showStop ? (
                            <button ref={stopButtonRef} onClick={stopOffer}>
                                <Image src={Fechar} alt="Fechar" />
                            </button>
                        ) : null}
                    </div>
                    <button className="h-10 w-10 ml-24 mt-3" onClick={sendSignal}>
                        <Image src={Alerta} alt="Ícone" />
                    </button>
                    <div className="flex justify-start"></div>
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
            <button
              onClick={() => callButtonClick(signalUser.IdUser)}
              className="bg-slate-300 hover:bg-slate-400 active:bg-slate-500 p-2 m-2 rounded-lg text-black shadow-md transition duration-300 ease-in-out"
              key={signalUser.id}
            >
              <span>{signalUser.name}</span>
            </button>
                ))}
            </div>
            <div>
              <ToastContainer />
            </div>
        </div>
    );
}
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