import {useEffect, useMemo, useRef, useState} from "react";
import {Filter, MapPin, Search, Heart, X, Maximize, Minimize} from "lucide-react"; // Added Maximize and Minimize icons
import {MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {Pandal} from "@/types/pandal";
import Cookies from "js-cookie";
import { showToast } from '@/lib/toast';


const ZoomTracker = ({onZoomChange}: { onZoomChange: (zoom: number) => void }) => {
    useMapEvents({
        zoomend: (e) => {
            onZoomChange(e.target.getZoom()); // when zoom changes, send value to parent
        },
    });
    return null;
};

const kolkataRegions = {
    "North Kolkata": {
        name: "North Kolkata",
        bounds: {
            north: 22.640,
            south: 22.600,
            east: 88.390,
            west: 88.350
        }
    },
    "South Kolkata": {
        name: "South Kolkata",
        bounds: {
            north: 22.520,
            south: 22.470,
            east: 88.420,
            west: 88.320
        }
    },
    "East Kolkata": {
        name: "East Kolkata",
        bounds: {
            north: 22.610,   // Tops out around Salt Lake Sector V
            south: 22.530,   // Just below Science City
            east: 88.475,    // Rajarhat / New Town (reduced)
            west: 88.420     // EM Bypass (narrowed west boundary)
        }
    },
    "West Kolkata": {
        name: "West Kolkata",
        bounds: {
            north: 22.610,   // Howrah Maidan
            south: 22.520,   // Shibpur
            east: 88.340,    // Hooghly riverbank
            west: 88.290     // Just before Andul (narrowed)
        }
    },
    "Central Kolkata": {
        name: "Central Kolkata",
        bounds: {
            north: 22.600,
            south: 22.540,
            east: 88.390,
            west: 88.350
        }
    }
};


function isPointInRegion(lat: number, lng: number, bounds: any) {
    return lat >= bounds.south &&
        lat <= bounds.north &&
        lng >= bounds.west &&
        lng <= bounds.east;
}

function getRegionCenter(bounds: any): [number, number] {
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLng = (bounds.east + bounds.west) / 2;
    return [centerLat, centerLng];
}

function getRegionBounds(bounds: any): [[number, number], [number, number]] {
    return [
        [bounds.south, bounds.west],
        [bounds.north, bounds.east]
    ];
}

function FlyToLocation({center, zoom}: { center: [number, number] | null, zoom?: number }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, zoom || 14);
        }
    }, [center, zoom, map]);
    return null;
}

function FitToRegion({regionBounds, isIndividualRegion}: {
    regionBounds: [[number, number], [number, number]] | null,
    isIndividualRegion?: boolean
}) {
    const map = useMap();
    useEffect(() => {
        if (regionBounds) {
            const padding = isIndividualRegion ? [10, 10] : [50, 50];
            // @ts-ignore
            map.fitBounds(regionBounds, {padding});
        }
    }, [regionBounds, isIndividualRegion, map]);
    return null;
}

// Update the Props interface
interface Props {
    pandals: Pandal[],
    selectedPandal: Pandal | null,
    setSelectedPandal: (pandal: Pandal | null) => void,
    userLikedPandals: Set<number>,
    pandalLikes: {[key: number]: number},
    onLikeUpdate: (pandalId: number, liked: boolean, likeCount: number) => void,
    isRefreshing?: boolean
}

export default function InteractiveMap({
    pandals, 
    selectedPandal, 
    setSelectedPandal,
    userLikedPandals,
    pandalLikes,
    onLikeUpdate,
    isRefreshing
}: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [suggestions, setSuggestions] = useState<Pandal[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedRegion, setSelectedRegion] = useState<string>("all");
    const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null);
    const [flyToZoom, setFlyToZoom] = useState<number>(14);
    const [regionBounds, setRegionBounds] = useState<[[number, number], [number, number]] | null>(null);
    const [isIndividualRegion, setIsIndividualRegion] = useState(false);
    const [currentZoom, setCurrentZoom] = useState<number>(12);
    const [pendingPopupPandal, setPendingPopupPandal] = useState<Pandal | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const mapRef = useRef<any>(null);
    const markerRefs = useRef<{ [key: number]: L.Marker }>({});

    const allRegions = useMemo(() => {
        const uniqueRegions = Array.from(new Set(pandals?.map(p => p.town).filter(Boolean)));
        return ["all", ...uniqueRegions];
    }, [pandals]);

    const filteredPandals = useMemo(() => {
        if (selectedRegion === "all") return pandals;

        if (kolkataRegions[selectedRegion as keyof typeof kolkataRegions]) {
            const town = kolkataRegions[selectedRegion as keyof typeof kolkataRegions];
            return pandals;
        }

        return pandals.filter(p => p.town === selectedRegion);
    }, [pandals, selectedRegion]);

    useEffect(() => {
        if (pendingPopupPandal) {
            // Wait a bit more to ensure marker is rendered and zoom is complete
            const timer = setTimeout(() => {
                const marker = markerRefs.current[pendingPopupPandal.id];
                if (marker) {
                    marker.openPopup();
                    setPendingPopupPandal(null);
                } else {
                    // If marker still not found, try again
                    setTimeout(() => {
                        const retryMarker = markerRefs.current[pendingPopupPandal.id];
                        if (retryMarker) {
                            retryMarker.openPopup();
                        }
                        setPendingPopupPandal(null);
                    }, 300);
                }
            }, 200);
            
            return () => clearTimeout(timer);
        }
    }, [pendingPopupPandal, currentZoom]);

    useEffect(() => {
        if (selectedRegion === "all") {
            setRegionBounds(null);
            setFlyToCenter(null);
            setIsIndividualRegion(false);
            setFlyToCenter([22.57, 88.37]);
            setFlyToZoom(12);
        } else if (kolkataRegions[selectedRegion as keyof typeof kolkataRegions]) {
            const town = kolkataRegions[selectedRegion as keyof typeof kolkataRegions];
            setRegionBounds(getRegionBounds(town.bounds));
            setIsIndividualRegion(true);
            setFlyToCenter(null);
        } else {
            if (filteredPandals.length > 0) {
                const firstPandal = filteredPandals[0];
                setFlyToCenter([firstPandal.latitude, firstPandal.longitude]);
                setFlyToZoom(16); // max zoom you want
                setRegionBounds(null); // clear bounds
                setIsIndividualRegion(false);
            }
        }
    }, [selectedRegion, filteredPandals]);

    useEffect(() => {
        if (searchTerm.length > 0) {
            const filtered = pandals.filter(
                (pandal) =>
                    pandal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (pandal.town?.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            setSuggestions(filtered.slice(0, 5));
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    }, [searchTerm, pandals]);

    useEffect(() => {
        if (selectedPandal && mapRef.current) {
            setSelectedRegion('all')
            setRegionBounds(null);
            document.getElementById("map")?.scrollIntoView({behavior: "smooth"});
            
            // Clear browser history - erase all previous navigation
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
            
            setTimeout(() => {
                mapRef.current.flyTo([selectedPandal.latitude, selectedPandal.longitude], 16, {duration: 1.5});

                // For all pandals, set pending popup to open after zoom completes
                setTimeout(() => {
                    setPendingPopupPandal(selectedPandal);
                }, 1600); // Wait for flyTo animation to complete (1.5s + buffer)
            }, 400);
        }
    }, [selectedPandal?.id]);

    function getPandalIcon(pandal: Pandal) {
        return L.icon({
            iconUrl: pandal.is_big ? "/pandal.png" : "/pandal.png",
            iconSize: pandal.is_big ? [40, 40] : [30, 30],
            iconAnchor: pandal.is_big ? [20, 40] : [15, 30],
            // ✅ Restored to original position
            popupAnchor: [0, -40], // Changed back from [0, 35] to original position above the marker
        });
    }

    const handleLike = async (pandalId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // ✅ Check authentication FIRST
        const accessToken = Cookies.get("access");
        
        if (!accessToken) {
            showToast.warning("Please login to like pandals 🔐");
            return; // Exit early without any state updates
        }
        
        // ✅ Only do optimistic update if user is authenticated
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
            
            // Revert on error
            onLikeUpdate(pandalId, isCurrentlyLiked, currentLikes);
            showToast.error("Failed to update like. Please try again.");
        }
    };

    // Add this function to handle clearing the search
    const handleClearSearch = () => {
        setSearchTerm("");
        setShowSuggestions(false);
    };

    // Add fullscreen toggle function
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
        
        // ✅ Clear selected pandal when entering fullscreen to prevent auto-flying
        if (!isFullscreen) {
            setSelectedPandal(null);
        }
        
        // Force map to resize after fullscreen toggle
        setTimeout(() => {
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }
            
            // ✅ If exiting fullscreen, scroll back to the map section
            if (isFullscreen) {
                setTimeout(() => {
                    document.getElementById("map")?.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });
                }, 150); // Small delay to ensure DOM has updated
            }
        }, 100);
    };

    // Handle escape key to exit fullscreen
    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
                setTimeout(() => {
                    if (mapRef.current) {
                        mapRef.current.invalidateSize();
                    }
                    
                    // ✅ Scroll back to map section when exiting via Escape key
                    setTimeout(() => {
                        document.getElementById("map")?.scrollIntoView({
                            behavior: "smooth",
                            block: "center"
                        });
                    }, 150);
                }, 100);
            }
        };

        if (isFullscreen) {
            document.addEventListener('keydown', handleEscapeKey);
            // Prevent body scroll when in fullscreen
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
            document.body.style.overflow = 'unset';
        };
    }, [isFullscreen]);

    return (
        <>
            {/* Normal Section */}
            {!isFullscreen && (
                <section className="py-20 px-10">
                    <div id="map" className="max-w-[1400px] mx-auto">
                        {/* Header */}
                        <div className="text-center mb-12">
                            <h2 className="text-[1.9rem] sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                                Interactive Pandal Map
                            </h2>
                            <p className="text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
                                Discover pandals across Kolkata with our interactive map. Search,
                                filter, and explore the rich cultural heritage.
                            </p>
                        </div>

                        {/* Search and Filters */}
                        <div className="mb-8">
                            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                                {/* Search Bar */}
                                <div className="relative flex-1 w-full md:max-w-md">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20}/>
                                        <input
                                            type="text"
                                            placeholder="Search pandals or locations..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-10 pr-10 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors duration-300"
                                        />
                                        {/* Clear button */}
                                        {searchTerm && (
                                            <button
                                                onClick={handleClearSearch}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200 p-1 hover:bg-gray-100 rounded-full"
                                                type="button"
                                                aria-label="Clear search"
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {/* Search suggestions dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border-2 border-orange-200 rounded-lg mt-1 shadow-lg z-[10000]">
                                            {suggestions.map((pandal) => (
                                                <div
                                                    key={pandal.id}
                                                    className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors duration-200 border-b border-orange-100 last:border-b-0"
                                                    onClick={() => {
                                                        setSelectedRegion("all");
                                                        setRegionBounds(null);
                                                        document.getElementById("map")?.scrollIntoView({behavior: "smooth"});

                                                        // Clear browser history - erase all previous navigation
                                                        window.history.replaceState(null, '', window.location.pathname + window.location.search);

                                                        // Set selected pandal to trigger the main zoom effect
                                                        setSelectedPandal(pandal);
                                                        setSearchTerm(pandal.name);
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    <div className="flex items-center space-x-3">
                                                        <MapPin className="text-orange-500" size={16}/>
                                                        <div>
                                                            <p className="font-medium text-gray-800">{pandal.name}</p>
                                                            <p className="text-sm text-gray-500">{pandal.town}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Region Filter */}
                                <div className="flex w-full md:w-auto items-center space-x-2">
                                    <Filter className="text-gray-500" size={20}/>
                                    <select
                                        value={selectedRegion}
                                        onChange={(e) => setSelectedRegion(e.target.value)}
                                        className="px-4 w-full md:w-auto py-3 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors duration-300"
                                    >
                                        <option value="all">All Regions</option>
                                        {Object.keys(kolkataRegions).map((town) => (
                                            <option key={town} value={town}>
                                                {town}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Map Container with Fullscreen Button */}
                        <div className="h-[60vh] rounded-lg overflow-hidden relative">
                            {/* Fullscreen Toggle Button */}
                            <button
                                onClick={toggleFullscreen}
                                className="absolute top-4 right-4 z-[1000] bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-2 shadow-lg transition-all duration-200 hover:scale-105"
                                title="Enter Fullscreen"
                            >
                                <Maximize size={20} className="text-gray-600" />
                            </button>

                            <MapContainer
                                ref={mapRef}
                                center={[22.5726, 88.3639]}
                                zoom={12}
                                scrollWheelZoom
                                style={{height: "100%", width: "100%"}}
                                maxBounds={[[22.30, 88.10], [22.80, 88.60]]}
                                maxBoundsViscosity={1.0}
                                minZoom={11}
                                maxZoom={18}
                            >
                                <ZoomTracker onZoomChange={setCurrentZoom}/>
                                <TileLayer
                                    attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />

                                {/* Markers */}
                                {filteredPandals
                                    .filter(p => p.is_big || currentZoom >= 15 || selectedPandal?.id === p.id)
                                    .map((pandal) => (
                                        <Marker
                                            key={pandal.id}
                                            position={[pandal.latitude, pandal.longitude]}
                                            icon={getPandalIcon(pandal)}
                                            ref={(ref) => {
                                                if (ref) markerRefs.current[pandal.id] = ref;
                                            }}
                                        >
                                            <Popup>
                                                <div
                                                    style={{
                                                        width: 200,
                                                        height: 240,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        overflow: "hidden",
                                                        padding: 6,
                                                        boxSizing: "border-box",
                                                        backgroundColor: "#fed7aa"
                                                    }}
                                                >
                                                    <img
                                                        src={pandal.main_pic || "/images/pandal.png"}
                                                        alt={pandal.name}
                                                        style={{
                                                            width: "100%",
                                                            height: 130,
                                                            objectFit: "cover",
                                                            borderRadius: 6,
                                                            background: "#f3f3f3",
                                                            flexShrink: 0
                                                        }}
                                                    />
                                                    <div style={{
                                                        flex: 1,
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent: "center",
                                                        width: "100%",
                                                        padding: "4px 0"
                                                    }}>
                                                        <strong
                                                            style={{
                                                                fontSize: 14,
                                                                marginBottom: 2,
                                                                textAlign: "center",
                                                                width: "100%",
                                                                wordBreak: "break-word",
                                                                lineHeight: 1.1,
                                                                display: "-webkit-box",
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: "vertical",
                                                                overflow: "hidden"
                                                            }}
                                                        >
                                                            {pandal.name}
                                                        </strong>
                                                        <div style={{
                                                            fontSize: 12,
                                                            color: "#666",
                                                            textAlign: "center",
                                                            width: "100%",
                                                            marginBottom: 4
                                                        }}>
                                                            {pandal.town}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        display: "flex",
                                                        gap: "6px",
                                                        width: "100%",
                                                        flexShrink: 0
                                                    }}>
                                                        <button
                                                            onClick={(e) => handleLike(pandal.id, e)}
                                                            style={{
                                                                padding: "4px 6px",
                                                                border: userLikedPandals.has(pandal.id) ? "none" : "2px solid #3b82f6",
                                                                backgroundColor: userLikedPandals.has(pandal.id) ? "#3b82f6" : "transparent",
                                                                borderRadius: "4px",
                                                                cursor: "pointer",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                gap: "4px",
                                                                transition: "all 0.2s ease",
                                                                minWidth: "45px",
                                                                height: "32px"
                                                            }}
                                                            title={userLikedPandals.has(pandal.id) ? "Unlike" : "Like"}
                                                        >
                                                            <Heart 
                                                                size={12} 
                                                                fill={userLikedPandals.has(pandal.id) ? "white" : "transparent"}
                                                                color={userLikedPandals.has(pandal.id) ? "white" : "#3b82f6"}
                                                            />
                                                            <span style={{
                                                                fontSize: "10px",
                                                                fontWeight: "600",
                                                                color: userLikedPandals.has(pandal.id) ? "white" : "#3b82f6"
                                                            }}>
                                                                {pandalLikes[pandal.id] || 0}
                                                            </span>
                                                        </button>
                                                        <a
                                                            href={`/pandal/${pandal.id}`}
                                                            style={{
                                                                flex: 1,
                                                                padding: "6px 10px",
                                                                backgroundColor: "#f97316",
                                                                color: "white",
                                                                textAlign: "center",
                                                                display: "flex",
                                                                alignItems: "center",
                                                                justifyContent: "center",
                                                                borderRadius: "4px",
                                                                textDecoration: "none",
                                                                fontSize: "12px",
                                                                fontWeight: "600",
                                                                transition: "background-color 0.2s ease",
                                                                height: "32px"
                                                            }}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = "#ea580c";
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = "#f97316";
                                                            }}
                                                        >
                                                            View Pandal
                                                        </a>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    ))}

                                <FlyToLocation center={flyToCenter} zoom={flyToZoom}/>
                                <FitToRegion regionBounds={regionBounds} isIndividualRegion={isIndividualRegion}/>
                            </MapContainer>
                        </div>

                        {/* Bottom Region Buttons */}
                        <div className="mt-8">
                            <div className="flex items-center justify-center gap-4 flex-wrap">
                                <button
                                    onClick={() => setSelectedRegion("all")}
                                    className={`px-4 py-2.5 md:py-3 text-[0.9rem] md:text-base rounded-md font-medium transition-all duration-300 hover:scale-105 ${
                                        selectedRegion === "all"
                                            ? "bg-orange-500 text-white shadow-lg"
                                            : "bg-white text-gray-700 hover:bg-orange-50 border border-gray-200"
                                    }`}
                                >
                                    All Regions
                                </button>

                                {Object.keys(kolkataRegions).map((town) => (
                                    <button
                                        key={town}
                                        onClick={() => setSelectedRegion(town)}
                                        className={`px-4 py-2.5 md:py-3 text-[0.9rem] md:text-base rounded-md font-medium transition-all duration-300 hover:scale-105 ${
                                            selectedRegion === town
                                                ? "bg-orange-500 text-white shadow-lg"
                                                : "bg-white text-gray-700"
                                        }`}
                                    >
                                        {town}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Fullscreen Mode */}
            {isFullscreen && (
                <div className="fixed inset-0 z-[9999] bg-gray-900">
                    {/* Fullscreen Header - Mobile Responsive */}
                    <div className="absolute top-0 left-0 right-0 z-[10000] bg-white/95 backdrop-blur-sm border-b border-gray-200 p-2 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between max-w-7xl mx-auto gap-2 sm:gap-4">
                            {/* Title */}
                            <div className="flex items-center justify-between sm:justify-start">
                                <h3 className="text-lg sm:text-xl font-bold text-gray-800">Interactive Pandal Map</h3>
                                {/* Mobile Exit Button */}
                                <button
                                    onClick={toggleFullscreen}
                                    className="sm:hidden bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg p-2 transition-all duration-200"
                                    title="Exit Fullscreen"
                                >
                                    <Minimize size={18} className="text-gray-600" />
                                </button>
                            </div>

                            {/* Controls */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                                {/* Search Bar */}
                                <div className="relative flex-1 sm:flex-none">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18}/>
                                    <input
                                        type="text"
                                        placeholder="Search pandals..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10 pr-10 py-2 w-full sm:w-64 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={handleClearSearch}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                    {/* Fullscreen Search Suggestions - Mobile Responsive */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-lg mt-1 shadow-lg z-[10001] max-h-60 overflow-y-auto">
                                            {suggestions.map((pandal) => (
                                                <div
                                                    key={pandal.id}
                                                    className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-orange-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                                    onClick={() => {
                                                        setSelectedRegion("all");
                                                        setRegionBounds(null);
                                                        
                                                        // Clear browser history for fullscreen search
                                                        window.history.replaceState(null, '', window.location.pathname + window.location.search);
                                                        
                                                        // Set selected pandal to trigger the main zoom effect
                                                        setSelectedPandal(pandal);
                                                        setSearchTerm(pandal.name);
                                                        setShowSuggestions(false);
                                                    }}
                                                >
                                                    <div className="flex items-center space-x-2 sm:space-x-3">
                                                        <MapPin className="text-orange-500 flex-shrink-0" size={14}/>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-gray-800 text-sm truncate">{pandal.name}</p>
                                                            <p className="text-xs text-gray-500 truncate">{pandal.town}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 sm:gap-4">
                                    {/* Region Filter */}
                                    <select
                                        value={selectedRegion}
                                        onChange={(e) => setSelectedRegion(e.target.value)}
                                        className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm flex-1 sm:flex-none"
                                    >
                                        <option value="all">All Regions</option>
                                        {Object.keys(kolkataRegions).map((town) => (
                                            <option key={town} value={town}>
                                                {town}
                                            </option>
                                        ))}
                                    </select>

                                    {/* Desktop Exit Fullscreen Button */}
                                    <button
                                        onClick={toggleFullscreen}
                                        className="hidden sm:block bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg p-2 transition-all duration-200"
                                        title="Exit Fullscreen (Esc)"
                                    >
                                        <Minimize size={20} className="text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Fullscreen Map - Full Height */}
                    <div className="absolute inset-0 pt-16 sm:pt-20">
                        <MapContainer
                            ref={mapRef}
                            center={[22.5726, 88.3639]}
                            zoom={12}
                            scrollWheelZoom
                            style={{height: "100%", width: "100%"}}
                            maxBounds={[[22.30, 88.10], [22.80, 88.60]]}
                            maxBoundsViscosity={1.0}
                            minZoom={11}
                            maxZoom={18}
                        >
                            <ZoomTracker onZoomChange={setCurrentZoom}/>
                            <TileLayer
                                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            {/* Same markers as normal mode */}
                            {filteredPandals
                                .filter(p => p.is_big || currentZoom >= 15 || selectedPandal?.id === p.id)
                                .map((pandal) => (
                                    <Marker
                                        key={pandal.id}
                                        position={[pandal.latitude, pandal.longitude]}
                                        icon={getPandalIcon(pandal)}
                                        ref={(ref) => {
                                            if (ref) markerRefs.current[pandal.id] = ref;
                                        }}
                                    >
                                        <Popup>
                                            {/* Same popup content */}
                                            <div
                                                style={{
                                                    width: 200,
                                                    height: 240,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    alignItems: "center",
                                                    justifyContent: "space-between",
                                                    overflow: "hidden",
                                                    padding: 6,
                                                    boxSizing: "border-box",
                                                    backgroundColor: "#fed7aa"
                                                }}
                                            >
                                                <img
                                                    src={pandal.main_pic || "/images/pandal.png"}
                                                    alt={pandal.name}
                                                    style={{
                                                        width: "100%",
                                                        height: 130,
                                                        objectFit: "cover",
                                                        borderRadius: 6,
                                                        background: "#f3f3f3",
                                                        flexShrink: 0
                                                    }}
                                                />
                                                <div style={{
                                                    flex: 1,
                                                    display: "flex",
                                                    flexDirection: "column",
                                                    justifyContent: "center",
                                                    width: "100%",
                                                    padding: "4px 0"
                                                }}>
                                                    <strong
                                                        style={{
                                                            fontSize: 14,
                                                            marginBottom: 2,
                                                            textAlign: "center",
                                                            width: "100%",
                                                            wordBreak: "break-word",
                                                            lineHeight: 1.1,
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden"
                                                        }}
                                                    >
                                                        {pandal.name}
                                                    </strong>
                                                    <div style={{
                                                        fontSize: 12,
                                                        color: "#666",
                                                        textAlign: "center",
                                                        width: "100%",
                                                        marginBottom: 4
                                                    }}>
                                                        {pandal.town}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    display: "flex",
                                                    gap: "6px",
                                                    width: "100%",
                                                    flexShrink: 0
                                                }}>
                                                    <button
                                                        onClick={(e) => handleLike(pandal.id, e)}
                                                        style={{
                                                            padding: "4px 6px",
                                                            border: userLikedPandals.has(pandal.id) ? "none" : "2px solid #3b82f6",
                                                            backgroundColor: userLikedPandals.has(pandal.id) ? "#3b82f6" : "transparent",
                                                            borderRadius: "4px",
                                                            cursor: "pointer",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: "4px",
                                                            transition: "all 0.2s ease",
                                                            minWidth: "45px",
                                                            height: "32px"
                                                        }}
                                                        title={userLikedPandals.has(pandal.id) ? "Unlike" : "Like"}
                                                    >
                                                        <Heart 
                                                            size={12} 
                                                            fill={userLikedPandals.has(pandal.id) ? "white" : "transparent"}
                                                            color={userLikedPandals.has(pandal.id) ? "white" : "#3b82f6"}
                                                        />
                                                        <span style={{
                                                            fontSize: "10px",
                                                            fontWeight: "600",
                                                            color: userLikedPandals.has(pandal.id) ? "white" : "#3b82f6"
                                                        }}>
                                                            {pandalLikes[pandal.id] || 0}
                                                        </span>
                                                    </button>
                                                    <a
                                                        href={`/pandal/${pandal.id}`}
                                                        style={{
                                                            flex: 1,
                                                            padding: "6px 10px",
                                                            backgroundColor: "#f97316",
                                                            color: "white",
                                                            textAlign: "center",
                                                            display: "flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            borderRadius: "4px",
                                                            textDecoration: "none",
                                                            fontSize: "12px",
                                                            fontWeight: "600",
                                                            transition: "background-color 0.2s ease",
                                                            height: "32px"
                                                        }}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#ea580c";
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor = "#f97316";
                                                        }}
                                                    >
                                                        View Pandal
                                                    </a>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
    ))}

                            <FlyToLocation center={flyToCenter} zoom={flyToZoom}/>
                            <FitToRegion regionBounds={regionBounds} isIndividualRegion={isIndividualRegion}/>
                        </MapContainer>
                    </div>
                </div>
            )}
        </>
    );
}