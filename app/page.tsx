'use client'

import Navigation from "@/components/navigation"
import Hero from "@/components/hero"
import dynamic from "next/dynamic"
import PandalList from "@/components/pandal-list"
import HistorySection from "@/components/history-section"
import ContactUsModal from "@/components/ContactUsModal"
import {useEffect, useState, useCallback} from "react"
import axios from "axios"
import type {Pandal} from "@/types/pandal"
import Cookies from "js-cookie"

const InteractiveMap = dynamic(() => import("@/components/interactive-map"), {
    ssr: false,
})

export default function Home() {
    const [pandals, setPandals] = useState<Pandal[]>([])
    const [selectedPandal, setSelectedPandal] = useState<Pandal | null>(null)
    const [showContact, setShowContact] = useState(false)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [userLikedPandals, setUserLikedPandals] = useState<Set<number>>(new Set())
    const [pandalLikes, setPandalLikes] = useState<{[key: number]: number}>({})

    const getPandals = useCallback(async () => {
        try {
            setIsRefreshing(true)
            const accessToken = Cookies.get("access");
            
            // Set up headers - include auth token if available
            const headers: any = {};
            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }

            const res = await axios.get("https://durgapujo.in/api/pandals", {
                withCredentials: true,
                headers: headers
            })
            setPandals(res.data)
        } catch (error) {
            console.error("Error fetching pandals:", error)
        } finally {
            setIsRefreshing(false)
        }
    }, [])

    // Load user's liked pandals from API
    const loadUserLikedPandals = useCallback(async () => {
        const accessToken = Cookies.get("access");
        if (!accessToken) return;
        
        try {
            const response = await fetch('https://durgapujo.in/api/user/liked-pandals/', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const likedIds: number[] = Array.isArray(data.liked_pandal_ids) 
                    ? data.liked_pandal_ids.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
                    : [];
                setUserLikedPandals(new Set<number>(likedIds));
            }
        } catch (error) {
            console.error('Error loading liked pandals:', error);
        }
    }, []);

    // Initialize pandal likes from API data
    useEffect(() => {
        const likes: {[key: number]: number} = {};
        pandals.forEach(pandal => {
            likes[pandal.id] = pandal.like_count || 0;
        });
        setPandalLikes(likes);
    }, [pandals]);

    // Load user's liked pandals when pandals are loaded
    useEffect(() => {
        if (pandals.length > 0) {
            loadUserLikedPandals();
        }
    }, [pandals, loadUserLikedPandals]);

    // Function to handle like updates from any component
    const handleLikeUpdate = useCallback((pandalId: number, liked: boolean, likeCount: number) => {
        setUserLikedPandals(prev => {
            const newSet = new Set(prev);
            if (liked) {
                newSet.add(pandalId);
            } else {
                newSet.delete(pandalId);
            }
            return newSet;
        });
        
        setPandalLikes(prev => ({
            ...prev,
            [pandalId]: likeCount
        }));

        // Update the pandals array with new like count
        setPandals(prev => prev.map(pandal => 
            pandal.id === pandalId 
                ? { ...pandal, like_count: likeCount, liked_by_user: liked }
                : pandal
        ));

        // Also update selected pandal if it's the same one
        setSelectedPandal(prev => 
            prev && prev.id === pandalId 
                ? { ...prev, like_count: likeCount, liked_by_user: liked }
                : prev
        );
    }, []);

    useEffect(() => {
        getPandals()
    }, [getPandals])

    return (
        <main className="min-h-screen">
            <Navigation/>
            <Hero/>
            <InteractiveMap 
                pandals={pandals} 
                selectedPandal={selectedPandal}
                setSelectedPandal={setSelectedPandal}
                userLikedPandals={userLikedPandals}
                pandalLikes={pandalLikes}
                onLikeUpdate={handleLikeUpdate}
                isRefreshing={isRefreshing}
            />
            <PandalList 
                pandals={pandals} 
                onPandalClick={(pandal: Pandal) => setSelectedPandal(pandal)}
                userLikedPandals={userLikedPandals}
                pandalLikes={pandalLikes}
                onLikeUpdate={handleLikeUpdate}
            />
            <HistorySection/>

            <button
                onClick={() => setShowContact((prev) => !prev)}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 transition duration-300 flex items-center justify-center"
                title="Contact Us"
            >
                📞
            </button>

            <ContactUsModal isOpen={showContact} onClose={() => setShowContact(false)}/>
        </main>
    )
}
