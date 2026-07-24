import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { USE_MOCK } from "@/lib/constants";

const PUBLIC = ["/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const response = await updateSession(request);

  if (USE_MOCK) {
    const session = request.cookies.get("tq_mock_session")?.value;
    const isPublic = PUBLIC.some((p) => pathname.startsWith(p));

    if (!session && !isPublic) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (session && pathname === "/login") {
      // Role redirect happens on login page / layouts
      return response;
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sounds).*)"],
};
