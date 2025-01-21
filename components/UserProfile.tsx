// components/UserProfile.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { updateProfileAction, changePasswordAction, logoutAction } from '../app/user.actions';
import { getUser } from '@/app/atender/user';

const UserProfile: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [profileName, setProfileName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const avatarRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const [user, setUser] = useState<any>(null);

     useEffect(() => {
        const fetchUser = async () => {
            const userRes = await getUser()
             setUser(userRes?.data?.user)
            if (userRes?.data?.user) {
                setProfileName(userRes.data.user.user_metadata.name || '');
                setEmail(userRes.data.user.email || '');
             }
        }
      fetchUser()
   }, []);

    const handleUpdateProfile = async () => {
        setLoading(true);
        setMessage(null);

        const result = await updateProfileAction(profileName);
        if (result?.message) {
            setMessage(result.message);
        }
        if (result?.error) {
            setMessage(result.error);
        }
        setLoading(false);
    };

    const handleChangePassword = async () => {
        setLoading(true);
        setMessage(null);
        const result = await changePasswordAction(newPassword);
        if (result?.message) {
            setMessage(result.message);
            setNewPassword('');
        }
         if (result?.error) {
            setMessage(result.error);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        setLoading(true);
        setMessage(null);
        await logoutAction();
        setLoading(false);
    };

    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                modalRef.current &&
                !modalRef.current.contains(event.target as Node) &&
                avatarRef.current &&
                !avatarRef.current.contains(event.target as Node)
            ) {
                setIsModalOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [avatarRef, modalRef]);

    return (
        <div className="relative">
            <div
                ref={avatarRef}
                className="absolute top-0 right-0 p-1 cursor-pointer flex items-center justify-center w-10 h-10 rounded-full bg-gray-200"
                onClick={toggleModal}
            >
              <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-6 h-6 text-gray-500"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                        />
                    </svg>
            </div>

            {isModalOpen && (
                <div
                    ref={modalRef}
                    className="absolute top-12 right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10"
                >
                    <div className="p-4">
                        <h2 className="text-lg font-semibold mb-4 text-gray-800">Configurações do Perfil</h2>

                        <div className="mb-4">
                            <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                readOnly
                            />
                        </div>

                        <div className="mb-4">
                            <label htmlFor="profileName" className="block text-gray-700 text-sm font-bold mb-2">
                                Nome de Exibição
                            </label>
                            <input
                                type="text"
                                id="profileName"
                                value={profileName}
                                onChange={(e) => setProfileName(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <button
                            onClick={handleUpdateProfile}
                            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4 w-full"
                            disabled={loading}
                        >
                            {loading ? 'Salvando...' : 'Salvar Nome de Exibição'}
                        </button>
                        <div className="mb-4">
                            <label htmlFor="newPassword" className="block text-gray-700 text-sm font-bold mb-2">
                                Nova Senha
                            </label>
                            <input
                                type="password"
                                id="newPassword"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            />
                        </div>
                        <button
                            onClick={handleChangePassword}
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline mb-4 w-full"
                            disabled={loading}
                        >
                            {loading ? 'Alterando Senha...' : 'Alterar Senha'}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
                            disabled={loading}
                        >
                            {loading ? 'Saindo...' : 'Sair'}
                        </button>
                        {message && (
                            <p className={`mt-4 text-sm ${message.startsWith('Erro') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;