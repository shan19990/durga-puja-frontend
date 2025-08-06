"use client"

import {useEffect, useRef, useState} from "react"
import {ChevronLeft, ChevronRight, MapPin, Heart} from "lucide-react"
import {Swiper, SwiperSlide} from "swiper/react"
import {Navigation} from "swiper/modules"
import 'swiper/css'
import 'swiper/css/navigation'
import type {Pandal} from "@/types/pandal"
import Cookies from "js-cookie"
import { showToast } from '@/lib/toast';

interface Props {
    pandals: Pandal[],
    onPandalClick: (pandal: Pandal) => void,
    userLikedPandals: Set<number>,
    pandalLikes: {[key: number]: number},
    onLikeUpdate: (pandalId: number, liked: boolean, likeCount: number) => void
}

export default function PandalList({pandals, onPandalClick, userLikedPandals, pandalLikes, onLikeUpdate}: Props) {
    const [activeAlphabet, setActiveAlphabet] = useState<string | null>(null)
    const [swiperInstance, setSwiperInstance] = useState<any>(null)
    const [filteredPandals, setFilteredPandals] = useState<Pandal[]>(pandals);

    const [canSlidePrev, setCanSlidePrev] = useState(false)
    const [canSlideNext, setCanSlideNext] = useState(true)

    const prevRef = useRef<HTMLButtonElement | null>(null)
    const nextRef = useRef<HTMLButtonElement | null>(null)

    const groupedPandals = pandals.reduce(
        (acc, pandal) => {
            const firstLetter = pandal.name.charAt(0).toUpperCase()
            if (!acc[firstLetter]) acc[firstLetter] = []
            acc[firstLetter].push(pandal)
            return acc
        },
        {} as Record<string, Pandal[]>,
    )

    const alphabets = Object.keys(groupedPandals).sort()

    // Only update filteredPandals when pandals change AND we need to apply the current filter
    useEffect(() => {
        if (activeAlphabet) {
            // Re-apply the current alphabet filter with updated pandal data
            const filtered = pandals.filter(
                (p) => p.name.charAt(0).toUpperCase() === activeAlphabet
            )
            setFilteredPandals(filtered)
        } else {
            // No filter active, show all pandals
            setFilteredPandals(pandals)
        }
    }, [pandals, activeAlphabet]);

    const handleAlphabetClick = (letter: string) => {
        if (activeAlphabet === letter) {
            setActiveAlphabet(null)
            setFilteredPandals(pandals)
        } else {
            setActiveAlphabet(letter)
            const filtered = pandals.filter(
                (p) => p.name.charAt(0).toUpperCase() === letter
            )
            setFilteredPandals(filtered)
        }

        if (swiperInstance) {
            swiperInstance.slideTo(0, 500)
        }
    }

    const handleLike = async (pandalId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // ✅ Check authentication FIRST before any state updates
        const accessToken = Cookies.get("access");
        
        if (!accessToken) {
            showToast.warning("Please login to like pandals 🔐");
            return; // Exit early - no optimistic updates when not authenticated
        }
        
        // ✅ Only proceed with optimistic update if user is authenticated
        const isCurrentlyLiked = userLikedPandals.has(pandalId);
        const currentLikes = pandalLikes[pandalId] || 0;
        
        // Optimistically update parent state
        onLikeUpdate(pandalId, !isCurrentlyLiked, isCurrentlyLiked ? currentLikes - 1 : currentLikes + 1);

        try {
            const response = await fetch(`https://durgapujo.in/api/pandals/${pandalId}/toggle-like/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to toggle like');
            }

            const data = await response.json();
            
            // Update with server response
            onLikeUpdate(pandalId, data.liked, data.like_count);

        } catch (error) {
            console.error('Error toggling like:', error);
            
            // Revert optimistic update on error
            onLikeUpdate(pandalId, isCurrentlyLiked, currentLikes);
            
            showToast.error("Failed to update like. Please try again.");
        }
    };

    // Only update navigation state when swiper instance changes
    useEffect(() => {
        if (swiperInstance) {
            const updateNavState = () => {
                swiperInstance.update()
                setCanSlidePrev(!swiperInstance.isBeginning)
                setCanSlideNext(!swiperInstance.isEnd)
            }

            updateNavState()
            swiperInstance.on('slideChange', updateNavState)
            return () => swiperInstance.off('slideChange', updateNavState)
        }
    }, [swiperInstance])

    // Initialize navigation state when filtered pandals change
    useEffect(() => {
        setCanSlidePrev(false)
        setCanSlideNext(filteredPandals.length > 4) // Assuming 4 slides per view on desktop
    }, [filteredPandals]);

    return (
        <section id="pandal-list" className="py-20 px-10 bg-gradient-to-br from-orange-50 to-red-50">
            <div className="max-w-[1400px] mx-auto">

                {/* Header */}
                <div className="text-center mb-12">
                    <h2 className="text-[1.9rem] md:text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                        Find Your Pandal
                    </h2>
                    <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
                        Browse through our comprehensive list of Durga Puja pandals.
                    </p>
                </div>

                {/* Alphabet Navigation */}
                <div className="mb-8 flex flex-wrap justify-center gap-2">
                    {alphabets.map((letter) => (
                        <button
                            key={letter}
                            onClick={() => handleAlphabetClick(letter)}
                            className={`w-12 h-12 rounded-lg font-bold text-lg transition-all duration-300 hover:scale-110 ${
                                activeAlphabet === letter
                                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                                    : "bg-white text-orange-600 border-2 border-orange-200 hover:border-orange-400"
                            }`}
                        >
                            {letter}
                        </button>
                    ))}
                </div>

                {/* Swiper Slider */}
                <Swiper
                    modules={[Navigation]}
                    spaceBetween={16}
                    slidesPerView={1.2}
                    breakpoints={{
                        640: {slidesPerView: 2},
                        768: {slidesPerView: 3},
                        1024: {slidesPerView: 4},
                    }}
                    navigation={{
                        prevEl: prevRef.current,
                        nextEl: nextRef.current,
                    }}
                    onBeforeInit={(swiper) => {
                        if (swiper.params.navigation) {
                            // @ts-ignore
                            swiper.params.navigation.prevEl = prevRef.current
                            // @ts-ignore
                            swiper.params.navigation.nextEl = nextRef.current
                        }
                    }}
                    onSwiper={(swiper) => {
                        setSwiperInstance(swiper);
                        setTimeout(() => {
                            swiper.update();
                            setCanSlidePrev(!swiper.isBeginning);
                            setCanSlideNext(!swiper.isEnd);
                        }, 0);
                    }}
                    className="pandal-swiper my-5"
                >
                    {filteredPandals?.map((pandal) => (
                        <SwiperSlide key={pandal.id}>
                            <div
                                className="flex flex-col justify-between bg-white rounded-xl shadow hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
                                style={{
                                    height: "340px",
                                    minWidth: "260px",
                                    maxWidth: "320px",
                                    width: "100%",
                                    display: "flex"
                                }}
                                onClick={(e) => {
                                    if ((e.target as HTMLElement).closest("button")) return;
                                    onPandalClick(pandal);
                                    document.getElementById("map")?.scrollIntoView({behavior: "smooth"});
                                }}
                            >
                                {/* Pandal Image */}
                                <img
                                    src={pandal.main_pic || "/images/pandal.png"}
                                    alt={pandal.name}
                                    className="w-full h-44 object-cover bg-orange-50"
                                    style={{borderBottom: "1px solid #f59e42"}}
                                />
                                <div className="flex items-center space-x-4 p-4">
                                    <MapPin
                                        className="text-orange-500 group-hover:text-red-500 transition-colors duration-300"
                                        size={24}
                                    />
                                    <div>
                                        <h3 className="font-semibold text-gray-800 group-hover:text-orange-600 transition-colors duration-300">
                                            {pandal.name}
                                        </h3>
                                        <p className="text-gray-600 text-sm">{pandal.region}</p>
                                    </div>
                                </div>
                                
                                {/* Buttons Section */}
                                <div className="px-4 pb-4 flex gap-2">
                                    {/* Like Button with Count - Blue when liked */}
                                    <button
                                        onClick={(e) => handleLike(pandal.id, e)}
                                        className={`flex items-center gap-1 px-2 py-2 border rounded-lg transition-all duration-200 ${
                                            userLikedPandals.has(pandal.id) 
                                                ? "bg-blue-50 border-blue-300 hover:bg-blue-100" 
                                                : "bg-white border-orange-300 hover:bg-orange-50"
                                        }`}
                                    >
                                        <Heart 
                                            className={`w-4 h-4 transition-all duration-200 ${
                                                userLikedPandals.has(pandal.id) 
                                                    ? "fill-blue-500 text-blue-500" 
                                                    : "text-orange-500 hover:text-red-500"
                                            }`}
                                        />
                                        <span className={`text-sm ${
                                            userLikedPandals.has(pandal.id) 
                                                ? "text-blue-600" 
                                                : "text-gray-600"
                                        }`}>
                                            {pandalLikes[pandal.id] || 0}
                                        </span>
                                    </button>
                                    
                                    {/* View Details Button */}
                                    <button
                                        className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(`/pandal/${pandal.id}`, "_blank");
                                        }}
                                    >
                                        View Pandal
                                    </button>
                                </div>
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>

                {/* Custom Navigation Buttons */}
                <div className="flex justify-center items-center gap-5 mt-6">
                    <button
                        ref={prevRef}
                        disabled={!canSlidePrev}
                        className={`flex items-center gap-2 pr-4 pl-2 py-2 rounded-lg shadow transition duration-300
              ${canSlidePrev
                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                        }`}
                    >
                        <ChevronLeft size={20}/>
                        Previous
                    </button>
                    <button
                        ref={nextRef}
                        disabled={!canSlideNext}
                        className={`flex items-center gap-2 pl-6 pr-4 py-2 rounded-lg shadow transition duration-300
              ${canSlideNext
                            ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-50"
                        }`}
                    >
                        Next
                        <ChevronRight size={20}/>
                    </button>
                </div>
            </div>
        </section>
    )
}
