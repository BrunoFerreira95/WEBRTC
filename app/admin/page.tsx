'use client'; // Diretiva para renderizar no lado do cliente (Next.js)

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClientService";

// Criação do cliente Supabase
export default function Profiles() {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(false);

    // Função para carregar os perfis
    const fetchProfiles = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*");

            if (error) throw error;
            setProfiles(data);
        } catch (error) {
            console.error("Erro ao carregar perfis:", error.message);
        } finally {
            setLoading(false);
        }
    };

    // Função para alterar o role de um usuário
    const changeUserRole = async (userId, newRole) => {
        try {
            const { data, error } = await supabase.rpc('set_claim', {
                uid: userId,
                claim: 'userrole',
                value: `"${newRole}"`
            });

            if (error) {
                throw error;
            }

            console.log(`Role do usuário ${userId} alterado para ${newRole}`);
            console.log(`data?`,data,`error?`,error)
            fetchProfiles(); // Atualizar a lista de perfis
        } catch (error) {
            console.error("Erro ao alterar o role:", error.message);
        }
    };

    useEffect(() => {
        fetchProfiles();
    }, []);

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Perfis Públicos</h1>
            {loading ? (
                <p>Carregando...</p>
            ) : (
                <ul>
                    {profiles && profiles.length > 0 ? (
                        profiles.map((profile) => (
                            <li key={profile.id} style={{ marginBottom: "1.5rem" }} className="border-2 border-white">
                                <h2>{profile.email || "Usuário Anônimo"}</h2>
                                <p><strong>Username:</strong> {profile.username || "Não definido"}</p>
                                <p><strong>Última Atualização:</strong> {new Date(profile.updated_at).toLocaleString()}</p>
                                {/* Botão para alterar o role */}
                                <div className="bg-gray-600 w-fit p-5 flex flex-row gap-5">
                                    <button onClick={() => changeUserRole(profile.id, 'admin')}>Tornar ADMIN</button>
                                    <button onClick={() => changeUserRole(profile.id, 'call')}>Tornar Ligar</button>
                                    <button onClick={() => changeUserRole(profile.id, 'receiver')}>Tornar Atender</button>

                                </div>
                            </li>
                        ))
                    ) : (
                        <p>Nenhum perfil encontrado.</p>
                    )}
                </ul>
            )}
        </div>
    );
}
