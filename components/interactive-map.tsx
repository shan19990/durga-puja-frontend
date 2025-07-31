import {useEffect, useMemo, useRef, useState} from "react";
import {Filter, MapPin, Search} from "lucide-react";
import {MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type {Pandal} from "@/types/pandal"


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
            north: 22.650,
            south: 22.605,
            east: 88.430,
            west: 88.330
        }
    },
    "South Kolkata": {
        name: "South Kolkata",
        bounds: {
            north: 22.515,
            south: 22.470,
            east: 88.430,
            west: 88.330
        }
    },
    "East Kolkata": {
        name: "East Kolkata",
        bounds: {
            north: 22.605,
            south: 22.515,
            east: 88.480,
            west: 88.430
        }
    },
    "West Kolkata": {
        name: "West Kolkata",
        bounds: {
            north: 22.605,
            south: 22.515,
            east: 88.330,
            west: 88.280
        }
    },
    "Central Kolkata": {
        name: "Central Kolkata",
        bounds: {
            north: 22.605,
            south: 22.515,
            east: 88.430,
            west: 88.330
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

type Props = {
    pandals: Pandal[];
    selectedPandal?: Pandal | null;
    setSelectedPandal?: (pandal: Pandal) => void;
};

export default function InteractiveMap({pandals, selectedPandal, setSelectedPandal}: Props) {
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
        if (pendingPopupPandal && markerRefs.current[pendingPopupPandal.id]) {
            const marker = markerRefs.current[pendingPopupPandal.id];
            setTimeout(() => {
                marker.openPopup();
                setPendingPopupPandal(null);
            }, 200);
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
            setTimeout(() => {
                mapRef.current.flyTo([selectedPandal.latitude, selectedPandal.longitude], 16, {duration: 1.5});

                // For small pandals, set pending popup to open after zoom completes
                if (!selectedPandal.is_big) {
                    setPendingPopupPandal(selectedPandal);
                } else {
                    // For big pandals, open popup after fly animation completes
                    setTimeout(() => {
                        const marker = markerRefs.current[selectedPandal.id];
                        if (marker) {
                            marker.openPopup();
                        }
                    }, 1600); // Wait for flyTo animation to complete (1.5s + buffer)
                }
            }, 400);
        }
    }, [selectedPandal]);

    function getPandalIcon(pandal: Pandal) {
        return L.icon({
            iconUrl: pandal.is_big ? "/pandal.png" : "/pandal.png",
            iconSize: pandal.is_big ? [40, 40] : [30, 30],
            iconAnchor: pandal.is_big ? [20, 40] : [15, 30],
            popupAnchor: [0, -40],
        });
    }

    return (
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
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                                        size={20}/>
                                <input
                                    type="text"
                                    placeholder="Search pandals or locations..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border-2 border-orange-200 rounded-lg focus:border-orange-500 focus:outline-none transition-colors duration-300"
                                />
                            </div>
                            {showSuggestions && suggestions.length > 0 && (
                                <div
                                    className="absolute top-full left-0 right-0 bg-white border-2 border-orange-200 rounded-lg mt-1 shadow-lg z-[10000]">
                                    {suggestions.map((pandal) => (
                                        <div
                                            key={pandal.id}
                                            className="px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors duration-200 border-b border-orange-100 last:border-b-0"
                                            onClick={() => {
                                                setSelectedRegion("all");
                                                setRegionBounds(null);
                                                document.getElementById("map")?.scrollIntoView({behavior: "smooth"});

                                                setTimeout(() => {
                                                    setFlyToCenter([pandal.latitude, pandal.longitude]);
                                                    setFlyToZoom(16);
                                                    setSelectedPandal?.(pandal);
                                                    setSearchTerm(pandal.name);

                                                    // Set pending popup for small pandals
                                                    if (!pandal.is_big) {
                                                        setPendingPopupPandal(pandal);
                                                    } else {
                                                        setTimeout(() => {
                                                            markerRefs.current[pandal?.id]?.openPopup();
                                                        }, 100);
                                                    }

                                                    setShowSuggestions(false);
                                                }, 400);
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

                        {/* town Filter Dropdown */}
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

                {/* Map */}
                <div className="h-[60vh] rounded-lg overflow-hidden relative">
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

                        {filteredPandals
                            .filter(p => p.is_big || currentZoom >= 15)
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
                                                minHeight: 240, // Minimum height for uniformity
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                                justifyContent: "flex-start",
                                                overflow: "visible",
                                                padding: 8,
                                                boxSizing: "border-box"
                                            }}
                                        >
                                            <img
                                                src={pandal.main_pic || "/images/pandal.png"}
                                                alt={pandal.name}
                                                style={{
                                                    width: "100%",
                                                    height: 100,
                                                    objectFit: "cover",
                                                    borderRadius: 8,
                                                    marginBottom: 8,
                                                    background: "#f3f3f3"
                                                }}
                                            />
                                            <strong
                                                style={{
                                                    fontSize: 16,
                                                    marginBottom: 4,
                                                    textAlign: "center",
                                                    width: "100%",
                                                    wordBreak: "break-word", // Allow long names to wrap
                                                    lineHeight: 1.2
                                                }}
                                            >
                                                {pandal.name}
                                            </strong>
                                            <div style={{
                                                fontSize: 14,
                                                color: "#666",
                                                textAlign: "center",
                                                width: "100%"
                                            }}>
                                                {pandal.town}
                                            </div>
                                            <a
                                                href={`/pandal/${pandal.id}`}
                                                className="mt-2 px-3 py-1 rounded bg-orange-500 !text-white text-sm font-semibold hover:bg-orange-600 transition"
                                                style={{
                                                    marginTop: 16,
                                                    textAlign: "center",
                                                    display: "inline-block",
                                                    width: "100%"
                                                }}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                View Pandal
                                            </a>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}

                        <FlyToLocation center={flyToCenter} zoom={flyToZoom}/>
                        <FitToRegion regionBounds={regionBounds} isIndividualRegion={isIndividualRegion}/>
                    </MapContainer>
                </div>

                {/* Bottom town Buttons */}
                <div className="mt-8">
                    <div className="flex items-center justify-center gap-4 flex-wrap">
                        {/* All Regions Button */}
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

                        {/* Geographical town Buttons */}
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
    );
}