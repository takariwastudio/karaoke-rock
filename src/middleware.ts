import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresca el token — no remover este await
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas protegidas
  const isProtected =
    request.nextUrl.pathname.startsWith("/home") ||
    request.nextUrl.pathname.startsWith("/profile");

  if (isProtected && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Si ya está logueado y va a /, redirige al home
  if (request.nextUrl.pathname === "/" && user) {
    return NextResponse.redirect(new URL("/home", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/", "/home/:path*", "/profile/:path*"],
};
