import { createClient } from "@/lib/supabase/server"
import { NextResponse, type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const requestUrl = new URL(request.url)
  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocalEnv = process.env.NODE_ENV === "development"
  const origin = isLocalEnv
    ? requestUrl.origin
    : forwardedHost
      ? `https://${forwardedHost}`
      : requestUrl.origin

  return NextResponse.redirect(`${origin}/auth/login`)
}

