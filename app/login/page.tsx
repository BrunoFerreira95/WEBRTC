'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { login, signup } from './actions';
import React from 'react';

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [toastMessage, setToastMessage] = useState(null);
  const router = useRouter();

  const showToast = (message, redirectPath = null) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
      if (redirectPath) router.push(redirectPath);
    }, 1000);
  };

  const handleLogin = async (formData) => {
    startTransition(async () => {
      try {
        await login(formData);
        showToast('Login realizado com sucesso!', '/');
      } catch {
        showToast('Erro ao fazer login. Tente novamente.');
      }
    });
  };

  const handleSignup = async (formData) => {
    startTransition(async () => {
      try {
        await signup(formData);
        showToast('Registro realizado com sucesso!', '/');
      } catch {
        showToast('Erro ao registrar. Tente novamente.');
      }
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      {toastMessage && (
        <div
          className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-md shadow-lg transition-all"
          role="alert"
        >
          {toastMessage}
        </div>
      )}
      <form
        className="space-y-4 max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg"
        onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);

          if (e.nativeEvent && 'submitter' in e.nativeEvent) {
             const submitter = (e.nativeEvent as SubmitEvent).submitter;
            if(submitter instanceof HTMLButtonElement && submitter.name){
                 const action = submitter.name;
                 if (action === 'login') handleLogin(formData);
                 if (action === 'signup') handleSignup(formData);
             }
          }
        }}
      >
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email:
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 p-2 w-ful text-black border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Senha:
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 p-2 w-full border text-black border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            name="login"
            disabled={isPending}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isPending ? 'Carregando...' : 'Entrar'}
          </button>
          <button
            type="submit"
            name="signup"
            disabled={isPending}
            className="w-full py-2 px-4 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {isPending ? 'Carregando...' : 'Registrar'}
          </button>
        </div>
      </form>
    </div>
  );
}