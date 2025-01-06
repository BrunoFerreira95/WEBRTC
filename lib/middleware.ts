import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const currentPath = requestUrl.pathname;
  const origin = requestUrl.origin;
  let supabaseResponse = NextResponse.next({ request });

  // Skip redirection for /manifest.json
  if (currentPath === '/manifest.json') {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { call, receiver } = user.app_metadata || {};

    // if (currentPath.startsWith('/ligar') && !call) {
    //   return NextResponse.redirect(`${origin}/`);
    // }

    // if (currentPath.startsWith('/atender') && receiver) {
    //   return NextResponse.redirect(`${origin}/`);
    // }

    // if (currentPath === '/') {
    //   if (!call) {
    //     return NextResponse.redirect(`${origin}/ligar`);
    //   }
    //   if (!receiver) {
    //     return NextResponse.redirect(`${origin}/atender`);
    //   }
    // }
  }

  // Redirect to login if the user is not authenticated
  if (!user && !currentPath.startsWith('/login') && !currentPath.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
