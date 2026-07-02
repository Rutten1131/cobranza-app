import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that don't require authentication
const publicRoutes = ["/", "/login"];

// Routes that require admin role
const adminRoutes = ["/admin"];

// Routes that require user role
const userRoutes = ["/app"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname === route)) {
    return NextResponse.next();
  }

  // Check for auth token
  const token = req.cookies.get("auth_token")?.value;

  if (!token) {
    // Redirect to login
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token (simple base64 decode for role check)
  // In production, you'd verify the JWT properly
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );

    // Check admin routes
    if (adminRoutes.some((route) => pathname.startsWith(route))) {
      if (payload.role !== "admin") {
        return NextResponse.redirect(new URL("/app/dashboard", req.url));
      }
    }

    // Check user routes
    if (userRoutes.some((route) => pathname.startsWith(route))) {
      if (payload.role !== "user" && payload.role !== "admin") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    return NextResponse.next();
  } catch {
    // Invalid token, redirect to login
    const response = NextResponse.redirect(new URL("/login", req.url));
    response.cookies.delete("auth_token");
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};