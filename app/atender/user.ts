'use server'
import { createClient } from "@/lib/server";
import { cookies } from 'next/headers'

export const getUser = async () => {
    const supabaseserver = createClient()
    const user = (await supabaseserver).auth.getUser();
    return user
}
