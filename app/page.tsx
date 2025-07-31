'use client'

import Navigation from "@/components/navigation"
import Hero from "@/components/hero"
import dynamic from "next/dynamic" // ✅ Add this
import PandalList from "@/components/pandal-list"
import HistorySection from "@/components/history-section"
import ContactUsModal from "@/components/ContactUsModal"
import {useEffect, useState} from "react"
import type {Pandal} from "@/types/pandal"
import axios from "axios"

// ✅ Dynamically import InteractiveMap with SSR disabled
const InteractiveMap = dynamic(() => import("@/components/interactive-map"), {
    ssr: false,
})


export default function Home() {
    const [pandals, setPandals] = useState<Pandal[]>([])
    const [showContact, setShowContact] = useState(false)
    const [selectedPandal, setSelectedPandal] = useState<Pandal | null>(null) // <-- Add this

    useEffect(() => {
        async function getPandals() {
            try {
                const res = await axios.get("https://durgapujo.in/api/pandals", {
                    withCredentials: true
                })
                setPandals(res.data)
            } catch (error) {
                console.error("Error fetching pandals:", error)
            }
        }

        getPandals()
    }, [])

    return (
        <main className="min-h-screen">
            <Navigation/>
            <Hero/>
            <InteractiveMap pandals={pandals} selectedPandal={selectedPandal}/> {/* Pass selectedPandal */}
            <PandalList pandals={pandals} onPandalClick={setSelectedPandal}/> {/* Pass setter */}
            <HistorySection/>

            <button
                onClick={() => setShowContact((prev) => !prev)}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition duration-300 flex items-center justify-center"
                title="Contact Us"
            >
                📞
            </button>

            <ContactUsModal isOpen={showContact} onClose={() => setShowContact(false)}/>

            <footer className="bg-gradient-to-r from-orange-600 to-red-600 text-white py-12 px-4">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="flex items-center justify-center space-x-3 mb-4">
                        <img src="/images/durga.png" alt="Durga" className="h-12 w-12 rounded-full"/>
                        <h3 className="text-2xl font-bold">Durga Puja Pandals</h3>
                    </div>
                    <p className="text-orange-100 mb-4">
                        Celebrating the divine feminine and Bengal's rich cultural heritage
                    </p>
                    <p className="text-orange-200 text-sm">© 2024 Durga Puja Pandals. All rights reserved.</p>
                </div>
            </footer>
        </main>
    )
}
