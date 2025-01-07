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
            // Set cookies in the response object
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
    const userrole = user?.app_metadata.userrole;
    console.log(userrole);

    // Fix redirection logic based on user role and path
    // Prevent redirecting if the user is already on the correct path
    if (currentPath.startsWith('/ligar') && (userrole !== '"call"' && userrole !== '"admin"')) {
      return NextResponse.redirect(`${origin}/`);
    }

    if (currentPath.startsWith('/atender') && (userrole !== '"receiver"' && userrole !== '"admin"')) {
      return NextResponse.redirect(`${origin}/`);
    }

    if (currentPath.startsWith('/admin') && userrole !== '"admin"') {
      return NextResponse.redirect(`${origin}/`);
    }

    if (currentPath === '/') {
      // Ensure that 'call' or 'admin' users are redirected to appropriate paths
      if (userrole === '"call"' && currentPath !== `${origin}/ligar`) {
        return NextResponse.redirect(`${origin}/ligar`);
      }
      if (userrole === '"receiver"' && currentPath !== `${origin}/atender`) {
        return NextResponse.redirect(`${origin}/atender`);
      }
      if (userrole === '"admin"' && currentPath !== `${origin}/admin`) {
        return NextResponse.redirect(`${origin}/admin`);
      }
    }
  }

  // Redirect to login if the user is not authenticated
  if (!user && !currentPath.startsWith('/login') && !currentPath.startsWith('/auth')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
