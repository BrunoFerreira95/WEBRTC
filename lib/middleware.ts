import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const currentPath = requestUrl.pathname;
  const origin = requestUrl.origin;
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { call, receiver } = user.app_metadata || {};

    // Redirecionamento específico para '/ligar' se o usuário não tiver 'call'
    if (currentPath.startsWith('/ligar') && !call) {
      return NextResponse.redirect(`${origin}/`);
    }

    // Redirecionamento específico para '/atender' se o usuário não tiver 'receiver'
    if (currentPath.startsWith('/atender') && !receiver) {
      return NextResponse.redirect(`${origin}/`);
    }

    // Se o usuário estiver na página inicial e não tiver call ou receiver
    if (currentPath === '/') {
      if (call) {
        return NextResponse.redirect(`${origin}/ligar`);
      }
      if (receiver) {
        return NextResponse.redirect(`${origin}/atender`);
      }
    }
  }

  // Redireciona para login se o usuário não estiver autenticado
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/auth')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
