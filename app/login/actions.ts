'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '../../lib/server';

export async function login(formData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    throw new Error('Falha no login. Verifique suas credenciais.');
  }

  // Opcional: Revalida o cache da página inicial
  revalidatePath('/');
}

export async function signup(formData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email'),
    password: formData.get('password'),
  };

  const { error } = await supabase.auth.signUp(data);

  if (error) {
    throw new Error('Falha no registro. Tente novamente.');
  }

  // Opcional: Revalida o cache da página inicial
  revalidatePath('/');
}
