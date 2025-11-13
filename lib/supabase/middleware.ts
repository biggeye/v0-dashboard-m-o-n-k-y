import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // Development shortcut: allow skipping Supabase auth checks when explicitly enabled.
  // Set `DEV_SKIP_AUTH=true` in your local `.env` to bypass redirects and allow UI work
  // without an authenticated Supabase session. Do NOT enable in production.
  if (process.env.NODE_ENV === "development" && process.env.DEV_SKIP_AUTH === "true") {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
          },
        },
      },
    )

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && !request.nextUrl.pathname.startsWith("/auth") && !request.nextUrl.pathname.startsWith("/")) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return NextResponse.redirect(url)
    }
  } catch (err) {
    // If Supabase is misconfigured or returns an error, log and allow dev to continue.
    // This prevents the middleware from crashing the dev server.
    // In production we want to surface the error, so only swallow in development.
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn("[v0] Supabase middleware skipped due to error:", err)
      return supabaseResponse
    }
    throw err
  }

  return supabaseResponse
}
