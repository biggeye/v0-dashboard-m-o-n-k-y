import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/bags"

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host") // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development"
      const redirectPath = next === "/" ? "/bags" : next
      if (isLocalEnv) {
        return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`)
      } else {
        return NextResponse.redirect(`${requestUrl.origin}${redirectPath}`)
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=auth_callback_error`)
}

