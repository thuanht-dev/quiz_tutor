import { NextResponse, type NextRequest } from "next/server";

const PUBLIC = ["/login"];
const MOCK_COOKIE = "tq_mock_session";

function isMockMode() {
  return (
    process.env.NEXT_PUBLIC_USE_MOCK === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function hasSupabaseSession(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth"))
    );
}

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;

    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      pathname.includes(".")
    ) {
      return NextResponse.next();
    }

    const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

    if (isMockMode()) {
      const session = request.cookies.get(MOCK_COOKIE)?.value;
      if (!session && !isPublic) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Edge-safe: only check cookie presence.
    // Session refresh + role checks run in Server Components / layouts.
    if (!hasSupabaseSession(request) && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (hasSupabaseSession(request) && pathname === "/login") {
      // Let the login page redirect by role after reading the profile.
      return NextResponse.next();
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sounds|samples).*)"],
};
