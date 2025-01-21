// app/actions.ts
'use server';

import { createClient } from '@/lib/server';
import { redirect } from 'next/navigation';

export async function updateProfileAction(profileName: string) {
    const supabase = await createClient();

    try {
        const updates = {
            name: profileName,
        };

        await supabase.auth.updateUser({
            data: updates,
        });
        return { message: 'Perfil atualizado com sucesso!' };
    } catch (error: any) {
        return { error: `Erro ao atualizar perfil: ${error.message}` };
    }
}

export async function changePasswordAction(newPassword: string) {
    const supabase = await createClient();

    try {
        const { error } = await supabase.auth.updateUser({
            password: newPassword,
        });
        if (error) {
            throw error;
        }
        return { message: 'Senha alterada com sucesso!' };
    } catch (error: any) {
        return { error: `Erro ao alterar senha: ${error.message}` };
    }
}

export async function logoutAction() {
    const supabase = await createClient();

    try {
        await supabase.auth.signOut();
    } catch (error: any) {
       return { error: `Erro ao sair: ${error.message}` };
    }
    redirect('/login');
}