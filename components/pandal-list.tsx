"use client"

import {useEffect, useRef, useState} from "react"
import {ChevronLeft, ChevronRight, MapPin} from "lucide-react"
import {Swiper, SwiperSlide} from "swiper/react"
import {Navigation} from "swiper/modules"
import 'swiper/css'
import 'swiper/css/navigation'

interface Pandal {
    id: number;
    name: string;
    region: string;
    latitude: number;
    longitude: number;
    is_big: boolean;
    main_pic?: string | null;
}

interface Props {
    pandals: Pandal[],
    onPandalClick: (pandal: Pandal) => void
}

export default function PandalList({pandals, onPandalClick}: Props) {
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

    useEffect(() => {
        setFilteredPandals(pandals)
        setCanSlidePrev(false)
        setCanSlideNext(true)
    }, [pandals]);

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
                                    height: "340px",           // Increased height for uniformity
                                    minWidth: "260px",         // Minimum width for all cards
                                    maxWidth: "320px",         // Maximum width for all cards
                                    width: "100%",             // Responsive width
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
                                <div className="px-4 pb-4">
                                    <button
                                        className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
                                        onClick={() => window.open(`/pandal/${pandal.id}`, "_blank")}
                                    >
                                        View Details
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
