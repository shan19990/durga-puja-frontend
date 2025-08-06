"use client"

import {useEffect, useRef, useState} from "react"
import Link from "next/link"
import {Calendar, Home, Info, MapPin, Menu, X} from "lucide-react"
import {useAuth} from '@/context/AuthContext';
import Cookies from "js-cookie"
import showToast from "@/lib/toast";

export default function Navigation() {
    const [isOpen, setIsOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const [showLoginPopup, setShowLoginPopup] = useState(false)
    const [step, setStep] = useState<"choose" | "email" | "code">("choose")
    const [email, setEmail] = useState("")
    const [code, setCode] = useState(["", "", "", "", "", ""])
    const [loggedIn, setLoggedIn] = useState(false)
    const [timer, setTimer] = useState(60)
    const [canResend, setCanResend] = useState(false)

    const modalRef = useRef<HTMLDivElement>(null)
    const {setIsLoggedIn} = useAuth();

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault()
        const paste = e.clipboardData.getData("text").slice(0, 6)
        if (!/^\d{1,6}$/.test(paste)) return // Only accept digits

        const newCode = [...code]
        for (let i = 0; i < paste.length; i++) {
            newCode[i] = paste[i]
        }
        setCode(newCode)

        // Focus next empty input if any
        const nextEmpty = paste.length < 6 ? document.getElementById(`code-${paste.length}`) : null
        nextEmpty?.focus()
    }

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // ✅ Unified auth check: OAuth URL, verify, refresh — all in one place
    useEffect(() => {
        const authCheck = async () => {
            const url = new URL(window.location.href)
            const oauthAccess = url.searchParams.get("access")
            const oauthRefresh = url.searchParams.get("refresh")

            if (oauthAccess && oauthRefresh) {
                Cookies.set("access", oauthAccess)
                Cookies.set("refresh", oauthRefresh)
                setLoggedIn(true);
                setIsLoggedIn(true); // ✅ update global login state
                window.history.replaceState({}, document.title, "/")
                return
            }

            const access = Cookies.get("access")
            const refresh = Cookies.get("refresh")

            if (!access && refresh) {
                // Only refresh is present
                await tryRefresh(refresh)
                return
            }

            if (access) {
                console.log("🔐 Verifying access token...");
                try {
                    const verifyRes = await fetch("https://durgapujo.in/api/token/verify/", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify({token: access}),
                    });

                    if (verifyRes.ok) {
                        console.log("✅ Access token is valid.");
                        setLoggedIn(true);
                        setIsLoggedIn(true);
                    } else if (verifyRes.status === 401) {
                        // Don't log this as an error; this is expected
                        console.log("🔄 Access token expired. Trying refresh...");
                        if (refresh) {
                            await tryRefresh(refresh);
                        } else {
                            logout();
                        }
                    } else {
                        console.warn("⚠️ Unexpected response during token verification:", verifyRes.status);
                        logout();
                    }
                } catch (err) {
                    console.error("💥 Network error verifying access token:", err);
                    logout();
                }
            } else {
                console.warn("🚫 No access token found.");
                logout();
            }
        }
        const tryRefresh = async (refresh: string) => {
            try {
                const res = await fetch("https://durgapujo.in/api/token/refresh/", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({refresh}),
                })
                if (res.ok) {
                    const data = await res.json()
                    Cookies.set("access", data.access)
                    setLoggedIn(true);
                    setIsLoggedIn(true); // ✅ update global login state
                } else {
                    logout()
                    showToast.warning("Session expired. Please login again.")
                }
            } catch (err) {
                console.error(err)
                logout()
            }
        }

        authCheck()
    }, [])

    // ✅ Handle outside click & Escape for modal
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                closeModal()
            }
        }

        function handleEscape(e: KeyboardEvent) {
            if (e.key === "Escape") {
                closeModal()
            }
        }

        if (showLoginPopup) {
            document.addEventListener("mousedown", handleClickOutside)
            document.addEventListener("keydown", handleEscape)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            document.removeEventListener("keydown", handleEscape)
        }
    }, [showLoginPopup])

    // ✅ Resend timer
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null
        if (timer > 0) {
            interval = setInterval(() => setTimer((t) => t - 1), 1000)
        } else {
            setCanResend(true)
        }
        return () => {
            if (interval) clearInterval(interval)
        }
    }, [timer])

    const closeModal = () => {
        setShowLoginPopup(false)
        resetLoginState()
    }

    const resetLoginState = () => {
        setStep("choose")
        setEmail("")
        setCode(["", "", "", "", "", ""])
        setTimer(60)
        setCanResend(false)
    }

    const requestCode = async () => {
        try {
            const res = await fetch("https://durgapujo.in/api/accounts/request-otp/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email}),
            })
            if (res.ok) {
                setStep("code")
                setTimer(60)
                setCanResend(false)
            } else {
                showToast.error("Failed to request code")
            }
        } catch (err) {
            console.error(err)
        }
    }

    const verifyCode = async () => {
        const fullCode = code.join("")
        try {
            const res = await fetch("https://durgapujo.in/api/accounts/verify-otp/", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({email, code: fullCode}),
            })
            if (res.ok) {
                const tokens = await res.json()
                Cookies.set("access", tokens.access)
                Cookies.set("refresh", tokens.refresh)
                setLoggedIn(true);
                setIsLoggedIn(true); // ✅ update global login state
                closeModal()
            } else {
                showToast.warning("Invalid code")
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleCodeChange = (value: string, index: number) => {
        if (/^[0-9]?$/.test(value)) {
            const updated = [...code]
            updated[index] = value
            setCode(updated)
            if (value && index < 5) {
                const next = document.getElementById(`code-${index + 1}`)
                next?.focus()
            }
        }
    }

    const logout = async () => {
        const refresh = Cookies.get("refresh");
        const access = Cookies.get("access");

        try {
            if (refresh && access) {
                await fetch("https://durgapujo.in/api/accounts/logout/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${access}`,
                    },
                    body: JSON.stringify({refresh}),
                });
            }
        } catch (err) {
            console.warn("Logout failed, maybe token already expired:", err);
        }

        // Now clear frontend state and cookies
        Cookies.remove("access");
        Cookies.remove("refresh");
        setLoggedIn(false);
        setIsLoggedIn(false);
        resetLoginState();
    };

    const navItems = [
        {href: "/", label: "Home", icon: Home},
        {
            href: "/#map",
            label: "Pandal Map",
            icon: MapPin,
            scrollTo: "map"
        },
        {href: "/planner", label: "Plan Journey", icon: Calendar},
        {
            href: "/#history",
            label: "History",
            icon: Info,
            scrollTo: "history"
        },
    ]

    return (
        <>
            <nav
                className={`fixed top-0 w-full z-[2000] transition-all duration-300 ${
                    scrolled
                        ? "bg-white/95 backdrop-blur-md shadow-lg"
                        : "bg-gradient-to-r from-orange-600 to-red-600"
                }`}
            >
                <div className="max-w-[1440px] mx-auto px-10">
                    <div className="flex justify-between items-center h-16">
                        <Link href="/" className="flex items-center space-x-3 group">
                            <div className="relative">
                                <img
                                    src="/images/durga.png"
                                    alt="Durga"
                                    className="h-10 w-10 rounded-full"
                                />
                            </div>
                            <span
                                className={`font-bold text-lg ${
                                    scrolled ? "text-orange-600" : "text-white"
                                }`}
                            >
                  Durga Puja Pandals
                </span>
                        </Link>

                        <div className="hidden md:flex items-center space-x-8">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                                            scrolled
                                                ? "text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                                                : "text-white hover:text-yellow-300 hover:bg-white/10"
                                        }`}
                                    >
                                        <Icon size={18}/>
                                        <span>{item.label}</span>
                                    </Link>
                                )
                            })}

                            {loggedIn ? (
                                <button
                                    onClick={logout}
                                    className="px-4 py-2 bg-red-500 text-white rounded-lg"
                                >
                                    Logout
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowLoginPopup(true)}
                                    className={`px-4 py-2 rounded-lg font-semibold ${
                                        scrolled
                                            ? "bg-orange-500 text-white"
                                            : "bg-white text-orange-600"
                                    }`}
                                >
                                    Login
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={`md:hidden p-2 rounded-lg ${
                                scrolled
                                    ? "text-gray-700 hover:bg-gray-100"
                                    : "text-white hover:bg-white/10"
                            }`}
                        >
                            {isOpen ? <X size={24}/> : <Menu size={24}/>}
                        </button>
                    </div>

                    {isOpen && (
                        <div className="md:hidden bg-white/95 rounded-lg mt-2 mb-4 shadow-lg">
                            <div className="px-2 pt-2 pb-3 space-y-1">
                                {navItems.map((item) => {
                                    const Icon = item.icon
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={(e) => {
                                                if (item.scrollTo) {
                                                    e.preventDefault();
                                                    window.location.href = `/${item.scrollTo === "map" ? "#map" : "#history"}`;
                                                }
                                                setIsOpen(false);
                                            }}
                                            className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-700 hover:text-orange-600 hover:bg-orange-50"
                                        >
                                            <Icon size={18}/>
                                            <span>{item.label}</span>
                                        </Link>
                                    )
                                })}
                                {loggedIn ? (
                                    <button
                                        onClick={() => {
                                            logout()
                                            setIsOpen(false)
                                        }}
                                        className="w-full px-4 py-2 bg-red-500 text-white rounded-lg"
                                    >
                                        Logout
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            setShowLoginPopup(true)
                                            setIsOpen(false)
                                        }}
                                        className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg"
                                    >
                                        Login
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {showLoginPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50">
                    <div ref={modalRef} className="bg-white p-8 rounded-lg w-full max-w-sm">
                        {step === "choose" && (
                            <>
                                <h2 className="text-2xl font-bold mb-4 text-center">Login</h2>
                                <button
                                    onClick={() => setStep("email")}
                                    className="w-full mb-3 px-4 py-2 bg-orange-500 text-white rounded-lg"
                                >
                                    Login with Email
                                </button>
                                <button
                                    onClick={() =>
                                        (window.location.href =
                                            "https://durgapujo.in/api/oauth/login/google-oauth2/")
                                    }
                                    className="w-full mb-3 px-4 py-2 bg-blue-500 text-white rounded-lg"
                                >
                                    Login with Google
                                </button>
                                <button
                                    onClick={() =>
                                        (window.location.href =
                                            "https://durgapujo.in/api/oauth/login/twitter/")
                                    }
                                    className="w-full px-4 py-2 bg-blue-400 text-white rounded-lg"
                                >
                                    Login with Twitter
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="mt-4 text-gray-600 hover:text-gray-800 text-sm underline block mx-auto"
                                >
                                    Cancel
                                </button>
                            </>
                        )}

                        {step === "email" && (
                            <>
                                <h2 className="text-xl mb-4 text-center font-bold">Enter Email</h2>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full mb-4 px-4 py-2 border border-gray-300 rounded"
                                />
                                <button
                                    onClick={requestCode}
                                    className="w-full px-4 py-2 bg-orange-500 text-white rounded"
                                >
                                    Request OTP
                                </button>
                                <button
                                    onClick={() => setStep("choose")}
                                    className="mt-4 text-gray-600 hover:text-gray-800 text-sm underline block mx-auto"
                                >
                                    Back
                                </button>
                            </>
                        )}

                        {step === "code" && (
                            <>
                                <h2 className="text-xl mb-4 text-center font-bold">Enter Code</h2>
                                <div className="flex justify-between mb-4">
                                    {code.map((v, i) => (
                                        <input
                                            key={i}
                                            id={`code-${i}`}
                                            value={v}
                                            onChange={(e) => handleCodeChange(e.target.value, i)}
                                            onPaste={(e) => handlePaste(e)} // ✅ paste handler
                                            maxLength={1}
                                            className="w-10 h-10 text-center border border-gray-300 rounded"
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={verifyCode}
                                    className="w-full px-4 py-2 bg-green-500 text-white rounded"
                                >
                                    Verify
                                </button>
                                {!canResend ? (
                                    <p className="mt-2 text-center text-sm text-gray-500">
                                        Resend in {timer} sec
                                    </p>
                                ) : (
                                    <button
                                        onClick={requestCode}
                                        className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded"
                                    >
                                        Resend OTP
                                    </button>
                                )}
                                <button
                                    onClick={() => setStep("email")}
                                    className="mt-4 text-gray-600 hover:text-gray-800 text-sm underline block mx-auto"
                                >
                                    Back
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
