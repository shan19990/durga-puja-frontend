"use client"

import { useEffect } from "react"
import Cookies from "js-cookie"
import { useRouter } from "next/navigation"

export default function OAuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const url = new URL(window.location.href)
    const access = url.searchParams.get("access")
    const refresh = url.searchParams.get("refresh")

    if (access && refresh) {
      Cookies.set("access", access)
      Cookies.set("refresh", refresh)
    }

    // ✅ Redirect after short delay to ensure cookies are saved
    setTimeout(() => {
      router.push("/")
    }, 500) // slight delay helps with cookie write

  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-lg">Processing login, please wait...</p>
    </div>
  )
}
