'use client';

import React, {useEffect, useRef, useState} from 'react';
import {Home, MapPin, Navigation, Route, X} from 'lucide-react';
import L, {Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline} from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {getAccessTokenFromCookie} from '@/utils/cookies';
import {useAuth} from "@/context/AuthContext";
import haversine from 'haversine-distance';
import {DotLottieReact} from '@lottiefiles/dotlottie-react';
import {useRouter} from 'next/navigation';

interface Pandal {
    id: number;
    name: string;
    region: string;
    latitude: number;
    longitude: number;
    is_big: boolean;
    main_pic?: string | null;
}

type TripData = {
    coordinates: [number, number][],
    distance: number,
    duration: number,
    waypoints: {
        location: [number, number],
        waypoints_index: number,
        trips_index: number
    }[]
}

interface Props {
    pandals: Pandal[];
}

const Planner: React.FC<Props> = ({pandals}) => {
    const mapRef = useRef<HTMLDivElement | null>(null);
    const [map, setMap] = useState<LeafletMap | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [locationConfirmed, setLocationConfirmed] = useState(false);
    const [selectedPandals, setSelectedPandals] = useState<Pandal[]>([]);
    const [showRoutes, setShowRoutes] = useState(false);
    const [filterLetter, setFilterLetter] = useState<string>('');
    const [highlightedPandal, setHighlightedPandal] = useState<number | null>(null);
    const [routeLines, setRouteLines] = useState<LeafletPolyline[]>([]);
    const [markers, setMarkers] = useState<LeafletMarker[]>([]);
    const [homeMarker, setHomeMarker] = useState<LeafletMarker | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
    const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [foo, setFoo] = useState<string | null>(null);
    const [randomLat, setRandomLat] = useState<number | null>(null);
    const [randomLng, setRandomLng] = useState<number | null>(null);
    const [routeStrategy, setRouteStrategy] = useState<'greedy' | 'selected' | 'ors'>('greedy');
    const [planningStarted, setPlanningStarted] = useState(false);
    const mapSectionRef = useRef<HTMLDivElement | null>(null);
    const [manualSelectedPandals, setManualSelectedPandals] = useState<Pandal[]>([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const {isLoggedIn} = useAuth();
    const {getAccessToken} = useAuth();
    const [showPlanner, setShowPlanner] = useState(false);
    const [routeCache, setRouteCache] = useState<Record<string, [Pandal[], [number, number][]]>>({});
    const [remainingTries, setRemainingTries] = useState<number | null>(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const router = useRouter();

    const generateCacheKey = (
        strategy: string,
        start: [number, number],
        pandals: Pandal[]
    ): string => {
        const sortedIds = pandals.map(p => p.id).sort((a, b) => a - b);
        return `${strategy}_${start[0]}_${start[1]}_${sortedIds.join(',')}`;
    };

    const fetchORSUsage = async () => {
        const res = await fetch('https://durgapujo.in/orsusage/api/usage/', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (res.ok) {
            const data = await res.json();
            setRemainingTries(data.remaining); // ✅ now works
        } else {
            console.warn("Failed to fetch ORS quota");
        }
    };

    useEffect(() => {
        if (isLoggedIn && routeStrategy === 'ors') {
            fetchORSUsage();
        }
    }, [isLoggedIn, routeStrategy]);

    const accessToken = getAccessTokenFromCookie();

    // Define user-friendly labels
    const strategyLabelMap: Record<string, string> = {
        greedy: 'Nearest Pandal - Best',
        selected: 'Manual Pandal Selection',
        ors: isLoggedIn ? 'ORS - Limit' : 'ORS - Locked ( Please Login )',
    };

    const visibleLabel = strategyLabelMap[routeStrategy] || 'Strategy';


    useEffect(() => {
        const stored = localStorage.getItem("foo");
        setFoo(stored);
        const lat = 22.5726 + (Math.random() - 0.5) * 0.1;
        const lng = 88.3639 + (Math.random() - 0.5) * 0.1;
        setRandomLat(lat);
        setRandomLng(lng);
    }, []);

    // Initialize map
    useEffect(() => {
        if (!showPlanner || map) return;

        const interval = setInterval(() => {
            if (mapRef.current && !map) {
                console.log("🟢 mapRef initialized:", mapRef.current);

                const Mapbounds = L.latLngBounds(
                    L.latLng(22.30, 88.10),
                    L.latLng(22.80, 88.60)
                );

                const newMap = L.map(mapRef.current, {
                    minZoom: 11,
                    maxZoom: 18,
                    maxBounds: Mapbounds,
                    maxBoundsViscosity: 1.0
                }).setView([22.5726, 88.3639], 12);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors',
                }).addTo(newMap);

                const homeIcon = L.divIcon({
                    className: 'home-marker',
                    html: `<div style="
                background: #dc2626;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 20px;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                cursor: grab;
                animation: pulse 2s infinite;
                ">🏠</div>
                <style>
                @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
                }
                </style>`,
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                });

                const homeMarker = L.marker([22.5726, 88.3639], {
                    icon: homeIcon,
                    draggable: true,
                }).addTo(newMap);

                homeMarker.on('dragend', () => {
                    const newPos = homeMarker.getLatLng();
                    setUserLocation({lat: newPos.lat, lng: newPos.lng});
                    setLocationConfirmed(true);
                    updateHomeMarkerToConfirmed(homeMarker);
                });

                homeMarker.bindPopup("🏠 Drag to set your home location<br><small>This will be your starting point</small>");

                setMap(newMap);
                setHomeMarker(homeMarker);
                setUserLocation({lat: 22.5726, lng: 88.3639});

                clearInterval(interval); // stop polling once map is initialized
            }
        }, 100); // check every 100ms
    }, [showPlanner, map]);

    useEffect(() => {
        if (showPlanner && map) {
            setTimeout(() => {
                map.invalidateSize();
                setMapLoaded(true);
            }, 150);
        }
    }, [showPlanner, map]);

    // Update home marker to confirmed state
    const updateHomeMarkerToConfirmed = (marker: LeafletMarker) => {
        const confirmedHomeIcon = L.divIcon({
            className: 'home-marker-confirmed',
            html: `
        <div style="
          background: #16a34a; 
          border-radius: 50%; 
          width: 40px; 
          height: 40px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          color: white; 
          font-size: 20px; 
          border: 3px solid white; 
          box-shadow: 0 2px 10px rgba(0,0,0,0.3);
          cursor: grab;
          position: relative;
        ">🏠
        <div style="
          position: absolute;
          top: -5px;
          right: -5px;
          background: #16a34a;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          font-size: 10px;
        ">✓</div>
        </div>
      `,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
        });

        marker.setIcon(confirmedHomeIcon);
        marker.bindPopup("🏠 Home Location Confirmed<br><small>You can still drag to change</small>");
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setIsMobile(window.innerWidth < 768);
        }
    }, []);

    const sortPandalsByNearestPath = (start: [number, number], pandals: Pandal[]): Pandal[] => {
        let remaining = [...pandals];
        const sorted: Pandal[] = [];
        let current = start;

        while (remaining.length > 0) {
            let minDist = Infinity;
            let closestIndex = 0;
            remaining.forEach((pandal, index) => {
                const dist = haversine(current, [pandal.latitude, pandal.longitude]);
                if (dist < minDist) {
                    minDist = dist;
                    closestIndex = index;
                }
            });
            const closest = remaining.splice(closestIndex, 1)[0];
            sorted.push(closest);
            current = [closest.latitude, closest.longitude];
        }
        return sorted;
    };

    const togglePandalSelection = (pandal: Pandal) => {
        if (!locationConfirmed) return;

        setManualSelectedPandals(prev => {
            const isSelected = prev.find(p => p.id === pandal.id);
            const updated = isSelected
                ? prev.filter(p => p.id !== pandal.id)
                : [...prev, pandal];
            setSelectedPandals(updated);  // Keep selectedPandals in sync
            return updated;
        });
    };

    useEffect(() => {
        if (!isLoggedIn && routeStrategy === "ors") {
            setRouteStrategy('greedy');
        }
    }, [isLoggedIn, routeStrategy]);


    const locateUser = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newLat = position.coords.latitude;
                const newLng = position.coords.longitude;

                setUserLocation({lat: newLat, lng: newLng});
                setLocationConfirmed(true);

                if (map) {
                    // If a home marker already exists, move it
                    if (homeMarker) {
                        homeMarker.setLatLng([newLat, newLng]);
                        updateHomeMarkerToConfirmed(homeMarker);
                        map.panTo([newLat, newLng]);
                    } else {
                        // Else, create a new home marker
                        const homeIcon = L.divIcon({
                            className: 'home-marker',
                            html: `
                    <div style="
                        background: #dc2626;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 20px;
                        border: 3px solid white;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                        cursor: grab;
                    ">🏠</div>`,
                            iconSize: [40, 40],
                            iconAnchor: [20, 20]
                        });

                        const newMarker = L.marker([newLat, newLng], {
                            icon: homeIcon,
                            draggable: true
                        });

                        newMarker.on('dragstart', () => {
                            const element = newMarker.getElement();
                            if (element) element.style.cursor = 'grabbing';
                        });

                        newMarker.on('dragend', () => {
                            const element = newMarker.getElement();
                            if (element) element.style.cursor = 'grab';
                            const newPos = newMarker.getLatLng();
                            setUserLocation({lat: newPos.lat, lng: newPos.lng});
                            setLocationConfirmed(true);
                            updateHomeMarkerToConfirmed(newMarker);
                        });

                        newMarker.bindPopup("🏠 Drag to set your home location");
                        newMarker.addTo(map);
                        newMarker.setZIndexOffset(1000);
                        updateHomeMarkerToConfirmed(newMarker);
                        setHomeMarker(newMarker);

                        map.panTo([newLat, newLng]);
                    }
                }
            },
            (error) => {
                alert('Unable to retrieve your location');
                console.error('Geolocation error:', error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    };

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

    const getCookie = (name: string): string | null => {
        const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
        return match ? decodeURIComponent(match[2]) : null;
    };

    const getORSOptimizedPath = async (
        start: [number, number],
        pandals: Pandal[],
        token: string
    ): Promise<Pandal[] | null> => {
        try {
            const response = await fetch('https://durgapujo.in/orsusage/api/ors-optimized-route/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({start, pandals}),
            });

            if (response.status === 429) {
                alert("🚫 You’ve reached your daily limit for ORS route optimization.");
                return null; // 👈 Signal quota error
            }

            if (response.status === 401) {
                alert("🚫 Please login");
                router.push('/');
                return null;
            }

            if (!response.ok) {
                console.warn('ORS Optimization request failed:', response.status);
                return [];
            }

            const data = await response.json();

            if (!data || !data.routes || !data.routes.length) {
                console.warn('ORS Optimization: No routes returned');
                return [];
            }

            const orderedIds = data.routes[0].steps
                .filter((step: any) => step.type === 'job')
                .map((step: any) => step.id);

            return orderedIds
                .map((id: number) => pandals.find(p => p.id === id)!)
                .filter(Boolean);

        } catch (err) {
            console.error('ORS optimization failed', err);
            return [];
        }
    };


    const showRoutesPaths = async () => {
        if (!map || !userLocation || !locationConfirmed || selectedPandals.length === 0) {
            console.warn("🛑 showRoutesPaths aborted due to missing inputs", {
                map,
                userLocation,
                locationConfirmed,
                selectedPandalsCount: selectedPandals.length
            });
            return;
        }

        setIsLoadingRoutes(true);

        const newMarkers: LeafletMarker[] = [];
        const newRouteLines: LeafletPolyline[] = [];

        markers.forEach(marker => map.removeLayer(marker));
        routeLines.forEach(line => map.removeLayer(line));

        if (!homeMarker) {
            const homeIcon = L.divIcon({
                className: 'home-marker',
                html: `<div style="background: #dc2626; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); cursor: grab;">🏠</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20]
            });

            const newHomeMarker = L.marker([userLocation.lat, userLocation.lng], {
                icon: homeIcon,
                draggable: true
            });

            newHomeMarker.on('dragstart', () => {
                const element = newHomeMarker.getElement();
                if (element) element.style.cursor = 'grabbing';
            });

            newHomeMarker.on('dragend', () => {
                const element = newHomeMarker.getElement();
                if (element) element.style.cursor = 'grab';

                const newPos = newHomeMarker.getLatLng();
                setUserLocation({lat: newPos.lat, lng: newPos.lng});
                setLocationConfirmed(true);
                updateHomeMarkerToConfirmed(newHomeMarker);
            });

            newHomeMarker.bindPopup("🏠 Drag to set your home location");

            newHomeMarker.addTo(map);
            newHomeMarker.setZIndexOffset(1000);
            updateHomeMarkerToConfirmed(newHomeMarker);
            setHomeMarker(newHomeMarker);
        } else {
            homeMarker.addTo(map);
            homeMarker.setZIndexOffset(1000);
            updateHomeMarkerToConfirmed(homeMarker);
        }

        const pandalIcon = L.icon({
            iconUrl: '/pandal.png',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40],
        });

        let sortedPandals: Pandal[] = [];
        let greedyPath: [number, number][] = [];

        const startPoint: [number, number] = [userLocation.lat, userLocation.lng];

        const cacheKey = generateCacheKey(routeStrategy, startPoint, selectedPandals);

        if (routeCache[cacheKey]) {
            [sortedPandals, greedyPath] = routeCache[cacheKey];
            console.log("♻️ Using cached route for:", cacheKey);
        } else if (routeStrategy === 'greedy') {
            greedyPath = [[userLocation.lat, userLocation.lng]];

            const remainingPandals = [...manualSelectedPandals];
            const reorderedPandals: Pandal[] = [];

            let current = greedyPath[0];

            while (remainingPandals.length > 0) {
                console.log(`\n📍 Current location: [${current[0].toFixed(6)}, ${current[1].toFixed(6)}]`);
                console.log(`🔍 Options:`);

                let nearestIndex = -1;
                let minDist = Infinity;

                remainingPandals.forEach((pandal, i) => {
                    const from = {latitude: current[0], longitude: current[1]};
                    const to = {latitude: pandal.latitude, longitude: pandal.longitude};

                    console.log(`   🗺️ From: ${JSON.stringify(from)} To: ${JSON.stringify(to)}`);

                    const dist = haversine(from, to);

                    console.log(`   ${i + 1}. ${pandal.name} → ${dist.toFixed(2)} meters`);

                    if (dist < minDist) {
                        minDist = dist;
                        nearestIndex = i;
                    }
                });

                const nearest = remainingPandals.splice(nearestIndex, 1)[0];
                console.log(`✅ Selected: ${nearest.name} (${minDist.toFixed(2)} meters)`);

                greedyPath.push([nearest.latitude, nearest.longitude]);
                reorderedPandals.push(nearest);
                current = [nearest.latitude, nearest.longitude];
            }

            greedyPath.push([userLocation.lat, userLocation.lng]);

            console.log(`\n✅ Final visit order:`);
            reorderedPandals.forEach((p, i) => {
                console.log(`   ${i + 1}. ${p.name}`);
            });

            sortedPandals = reorderedPandals;

        } else if (routeStrategy === 'selected') {
            sortedPandals = [...manualSelectedPandals];
        } else if (routeStrategy === 'ors') {
            if (!isLoggedIn) {
                alert("You must be logged in to use OpenRouteService optimized routing.");
                setRouteStrategy('greedy');
                return;
            }

            const optimizedPandals = await getORSOptimizedPath(
                [userLocation.lat, userLocation.lng],
                selectedPandals,
                accessToken
            );

            if (optimizedPandals !== null) {
                fetchORSUsage(); // 👈 update quota after request is counted
            }

            if (optimizedPandals === null) {
                // User hit 429: skip everything
                setIsLoadingRoutes(false);
                return;
            }

            sortedPandals = optimizedPandals.length
                ? optimizedPandals
                : sortPandalsByNearestPath(startPoint, selectedPandals);

            greedyPath = [
                [userLocation.lat, userLocation.lng],
                ...sortedPandals.map(p => [p.latitude, p.longitude] as [number, number]),
                [userLocation.lat, userLocation.lng]
            ];
        }

        setRouteCache(prev => ({...prev, [cacheKey]: [sortedPandals, greedyPath]}));

        setSelectedPandals(sortedPandals);

        sortedPandals.forEach((pandal, index) => {
            const marker = L.marker([pandal.latitude, pandal.longitude], {icon: pandalIcon})
                .addTo(map)
                .bindPopup(`<strong>${pandal.name}</strong><br>${pandal.region}<br><small>Stop ${index + 1}</small>`);
            newMarkers.push(marker);
        });

        if (greedyPath.length === 0) {
            greedyPath = [
                [userLocation.lat, userLocation.lng],
                ...sortedPandals.map(p => [p.latitude, p.longitude] as [number, number]),
                [userLocation.lat, userLocation.lng]
            ];
        }

        for (let i = 0; i < greedyPath.length - 1; i++) {
            const start = greedyPath[i];
            const end = greedyPath[i + 1];
            const segmentUrl = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

            try {
                const res = await fetch(segmentUrl);
                const data = await res.json();

                if (data.code === 'Ok') {
                    const coords = data.routes[0].geometry.coordinates.map(
                        ([lng, lat]: [number, number]) => [lat, lng]
                    );

                    const segmentColors = [
                        '#FF0000', '#00FF00', '#007BFF', '#FFA500', '#FF00FF',
                        '#00FFFF', '#800080', '#FFFF00', '#FF1493', '#00CED1',
                    ];

                    const segmentLine = L.polyline(coords, {
                        color: segmentColors[i % segmentColors.length],
                        weight: 5,
                        opacity: 0.85,
                    }).addTo(map);

                    newRouteLines.push(segmentLine);
                }
            } catch (error) {
                console.error('Failed to fetch segment route:', error);
            }
        }

        setMarkers(newMarkers);
        setRouteLines(newRouteLines);
        setShowRoutes(true);
        setSidebarOpen(true);

        const boundsPoints: [number, number][] = [
            [userLocation.lat, userLocation.lng],
            ...sortedPandals.map(p => [p.latitude, p.longitude] as [number, number])
        ];

        map.fitBounds(L.latLngBounds(boundsPoints), {
            padding: [40, 40],
            maxZoom: 16,
            animate: true,
        });

        setIsLoadingRoutes(false);
    };


    const highlightRoute = (pandalIndex: number) => {
        if (!map || !userLocation || !locationConfirmed || routeLines.length === 0) return;

        // Reset all route segment styles
        routeLines.forEach(line => {
            line.setStyle({color: '#9ca3af', weight: 3, opacity: 0.6});
        });

        // Show full route if -1
        if (pandalIndex === -1) {
            showRoutesPaths();
            return;
        }

        setHighlightedPandal(pandalIndex);

        const line = routeLines[pandalIndex];

        if (!line) return;

        // Highlight selected segment
        line.setStyle({color: '#f97316', weight: 6, opacity: 0.9});

        // Use actual polyline bounds, not start/end guesswork
        const bounds = line.getBounds();

        // Fit bounds properly — no "duration" key allowed here
        map.fitBounds(bounds, {
            padding: [20, 20],
            maxZoom: 18,
            animate: true
        });
    };

    const resetRouteHighlight = () => {
        routeLines.forEach(line => {
            line.setStyle({color: '#e34e00', weight: 4, opacity: 0.8});
        });
        setHighlightedPandal(null);

        // Return to full route view
        if (map && userLocation && locationConfirmed && selectedPandals.length > 0) {
            const allPoints: [number, number][] = [
                [userLocation.lat, userLocation.lng],
                ...selectedPandals.map(p => [p.latitude, p.longitude] as [number, number])
            ];

            const bounds = L.latLngBounds(allPoints);

            map.fitBounds(bounds, {
                paddingTopLeft: L.point(80, 60),
                paddingBottomRight: L.point(320, 40),
                maxZoom: 16,
                animate: true,
                duration: 1
            });
        }
    };

    const resetPlanner = () => {
        if (!map) return;

        // Remove route lines from the map
        routeLines.forEach(line => map.removeLayer(line));
        setRouteLines([]);
        setManualSelectedPandals([]);

        // Remove pandal markers from the map
        markers.forEach(marker => map.removeLayer(marker));
        setMarkers([]);

        // Reset state
        setSelectedPandals([]);
        setHighlightedPandal(null);
        setSidebarOpen(false);
        setShowRoutes(false);
    };

    const filteredPandals = filterLetter
        ? pandals.filter(p => p.name.toUpperCase().startsWith(filterLetter))
        : pandals;

    const handleSidebarClose = () => {
        setSidebarOpen(false);
        resetRouteHighlight();
    };

    const isSidebarVisible = sidebarOpen && selectedPandals.length > 0 && locationConfirmed;

    return (
        <div className="max-w-[1400px] mx-auto px-10 pt-16 md:pt-0 pb-20">
            {!showPlanner ? (
                <div className="flex flex-col items-center justify-center min-h-screen py-12 text-center">
                    {/* Wrapper to align Lottie + Circular Text */}
                    <div className="relative w-[220px] h-[220px] flex items-center justify-center mb-6">
                        {/* Rotating Circular Text */}
                        <div className="absolute w-[220px] h-[220px] animate-spin-slow z-0">
                            <svg viewBox="0 0 200 200" className="w-full h-full">
                                <defs>
                                    <path
                                        id="circlePath"
                                        d="
            M 100, 100
            m -90, 0
            a 90,90 0 1,1 180,0
            a 90,90 0 1,1 -180,0
          "
                                    />
                                </defs>
                                <text
                                    fill="#f97316"
                                    fontSize="15"
                                    fontWeight="bold"
                                    letterSpacing="2"
                                >
                                    <textPath href="#circlePath" startOffset="0">
                                        DURGA PUJA 2025•PLAN YOUR JOURNEY•EXPLORE KOLKATA•
                                    </textPath>
                                </text>
                            </svg>
                        </div>

                        {/* Centered Lottie */}
                        <DotLottieReact
                            src="https://lottie.host/e2fb7693-2044-48e4-8bc7-5b189a118e0a/gamqpugyNy.lottie"
                            loop
                            autoplay
                            style={{
                                width: '200px',
                                height: '200px',
                                zIndex: 10,
                            }}
                        />
                    </div>

                    {/* Heading */}
                    <h1 className="text-[1.8rem] sm:text-4xl font-bold mb-4 text-orange-600">
                        Plan Your Pandal Journey
                    </h1>

                    {/* Description */}
                    <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6">
                        Create the perfect route for your Durga Puja journey. First set your location, then
                        select your favorite pandals and get optimized road routes.
                    </p>

                    {/* Button */}
                    <button
                        onClick={() => {
                            setShowPlanner(true);
                            setPlanningStarted(true);
                        }}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-8 py-3 rounded-lg text-base sm:text-lg shadow transition"
                    >
                        Start Planning
                    </button>
                </div>

            ) : (
                <>
                    <div
                        className="mx-auto flex flex-col lg:flex-row gap-4 max-w-[1400px] w-full"
                        style={{paddingTop: '130px'}}
                    >
                        {/* Map container */}
                        <div
                            className={`w-full relative`}
                        >
                            {/* Leaflet Map container */}
                            <div
                                ref={mapRef}
                                className="w-full h-96 md:h-[500px] rounded-lg shadow-lg border-2 border-gray-200"
                            />
                            {!sidebarOpen && showRoutes && (
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="absolute top-4 right-4 z-[1100] bg-white border border-gray-300 px-3 py-1 rounded-lg shadow-md text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all duration-300 ease-in-out animate-fadeIn"
                                >
                                    Show Route Plan
                                </button>
                            )}

                            {/* Loading overlay (only over map) */}
                            {isLoadingRoutes && (
                                <div
                                    className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-[1001] rounded-lg">
                                    <div className="bg-white px-4 py-3 rounded-lg flex items-center gap-3 shadow-md">
                                        <div
                                            className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                                        <span className="text-gray-700 font-medium">Calculating road routes...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar - Route Plan */}
                        {isSidebarVisible ? (
                            <div
                                className="w-full lg:w-[30%] h-[500px] sticky top-[120px] bg-white rounded-lg shadow-xl border overflow-y-auto z-[1000]">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                            <Route className="w-4 h-4"/>
                                            Route Plan
                                        </h3>
                                        <button
                                            onClick={handleSidebarClose}
                                            className="text-gray-500 hover:text-gray-700"
                                        >
                                            <X className="w-4 h-4"/>
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        <div
                                            className="flex items-center gap-2 p-2 bg-green-50 rounded text-sm cursor-pointer hover:bg-green-100"
                                            onClick={() => highlightRoute(-1)}
                                        >
                                            <Home className="w-4 h-4 text-green-600"/>
                                            <span className="font-medium">Home (Start)</span>
                                        </div>

                                        {selectedPandals.map((pandal, index) => (
                                            <div
                                                key={pandal.id}
                                                className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                                    highlightedPandal === index
                                                        ? 'bg-orange-100 border border-orange-300'
                                                        : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                                onClick={() => highlightRoute(index)}
                                            >
                                                <div
                                                    className="w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">{pandal.name}</div>
                                                    <div className="text-xs text-gray-500">{pandal.region}</div>
                                                </div>
                                            </div>
                                        ))}

                                        <div
                                            className={`flex items-center gap-2 p-2 rounded text-sm mt-2 cursor-pointer transition-colors ${
                                                highlightedPandal === selectedPandals.length
                                                    ? 'bg-orange-100 border border-orange-300'
                                                    : 'bg-green-50 hover:bg-green-100'
                                            }`}
                                            onClick={() => highlightRoute(selectedPandals.length)}
                                        >
                                            <Home className="w-4 h-4 text-green-600"/>
                                            <span className="font-medium">Home (End)</span>
                                        </div>
                                    </div>

                                    <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                                        💡 Tip: You can still drag the home marker to change your starting location
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {planningStarted && (
                        <div className="max-w-[1400px] mx-auto px-4 pb-20">
                            <div className="flex justify-center gap-4 flex-wrap mt-8">

                                {/* Locate Me */}
                                <div className="">
                                    <button
                                        onClick={locateUser}
                                        className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 flex items-center justify-center gap-2 px-6 font-semibold text-sm py-3 rounded-lg shadow transition duration-300"
                                    >
                                        <Navigation className="w-4 h-4"/>
                                        Locate Me
                                    </button>
                                </div>

                                {/* Nearest + Dropdown */}
                                {locationConfirmed && selectedPandals.length > 0 && (
                                    <div className="w-56 relative">
                                        <div className="flex w-full">
                                            <button
                                                onClick={showRoutesPaths}
                                                disabled={isLoadingRoutes}
                                                className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 flex items-center justify-center gap-2 px-4 font-semibold text-sm py-3 disabled:opacity-50 rounded-l-lg"
                                            >
                                                <Route className="w-4 h-4"/>
                                                {isLoadingRoutes
                                                    ? 'Calculating...'
                                                    : `${visibleLabel.split(" ")[0]} (${selectedPandals.length})${
                                                        routeStrategy === 'ors' && remainingTries !== null ? ` • ${remainingTries} left` : ''
                                                    }`}
                                            </button>
                                            <button
                                                onClick={() => setDropdownOpen((prev) => !prev)}
                                                className="bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 px-4 font-semibold text-sm py-3 rounded-r-lg"
                                            >
                                                ▼
                                            </button>
                                        </div>

                                        {/* Dropdown */}
                                        {dropdownOpen && (
                                            <div
                                                className="absolute right-0 top-full bg-white text-gray-800 shadow-lg rounded-md mt-1 min-w-[160px] z-20">
                                                <ul className="text-sm font-medium">
                                                    {(['greedy', 'selected', 'ors'] as const).map((strategy) => {
                                                        const isDisabled = strategy === 'ors' && !isLoggedIn;
                                                        const isSelected = routeStrategy === strategy;
                                                        return (
                                                            <li
                                                                key={strategy}
                                                                onClick={() => {
                                                                    if (!isDisabled) {
                                                                        setRouteStrategy(strategy);
                                                                        setDropdownOpen(false);
                                                                    }
                                                                }}
                                                                className={`px-4 py-2 flex justify-between items-center ${
                                                                    isDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-orange-100 cursor-pointer'
                                                                }`}
                                                            >
                                                                {strategyLabelMap[strategy]}
                                                                {isSelected &&
                                                                    <span className="text-green-600 font-bold">✓</span>}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Reset Selection */}
                                {selectedPandals.length > 0 && (
                                    <div className="w-56">
                                        <button
                                            onClick={resetPlanner}
                                            className="w-full bg-transparent border border-red-500 text-red-600 font-semibold px-6 py-2.5 rounded-lg shadow-sm transition-colors duration-200 ease-in-out hover:bg-red-50 active:bg-red-100"
                                        >
                                            Reset Selection
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* Filter by Letter - Only enabled when location is confirmed */}
                            <div className={`mt-12 ${!locationConfirmed ? 'opacity-50 pointer-events-none' : ''}`}>
                                <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                                    {locationConfirmed ? 'Select Your Pandals' : 'Set Your Location First'}
                                </h2>

                                <div className="flex flex-wrap justify-center gap-2 mb-8">
                                    {alphabets.map(letter => (
                                        <button
                                            key={letter}
                                            onClick={() => locationConfirmed && setFilterLetter(letter)}
                                            disabled={!locationConfirmed}
                                            className={`w-12 h-12 rounded-lg font-bold text-lg transition-all duration-300 hover:scale-110 ${
                                                filterLetter === letter && locationConfirmed
                                                    ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
                                                    : "bg-white text-orange-600 border-2 border-orange-200 hover:border-orange-400"
                                            } ${!locationConfirmed ? 'cursor-not-allowed' : ''}`}
                                        >
                                            {letter}
                                        </button>
                                    ))}
                                </div>

                                {/* Pandals List - Only enabled when location is confirmed */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredPandals.map(pandal => {
                                        const isSelected = selectedPandals.find(p => p.id === pandal.id);
                                        return (
                                            <div
                                                key={pandal.id}
                                                onClick={() => togglePandalSelection(pandal)}
                                                className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                                                    !locationConfirmed
                                                        ? 'cursor-not-allowed bg-gray-50 border-gray-200'
                                                        : 'cursor-pointer'
                                                } ${
                                                    isSelected && locationConfirmed
                                                        ? 'border-orange-500 bg-orange-50 shadow-md'
                                                        : locationConfirmed
                                                            ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                                            : 'border-gray-200 bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className='flex gap-1 mb-2'>
                                                            <MapPin
                                                                className={`w-5 h-5 ${locationConfirmed ? 'text-orange-500' : 'text-gray-400'}`}/>
                                                            <h3 className={`font-semibold ${locationConfirmed ? 'text-gray-800' : 'text-gray-500'}`}>{pandal.name}</h3>
                                                        </div>
                                                        <p className={`text-sm mb-2 ${locationConfirmed ? 'text-gray-600' : 'text-gray-400'}`}>{pandal.region}</p>
                                                    </div>
                                                    <div
                                                        className={`w-6 h-6 ml-4 rounded-full border-2 flex items-center justify-center ${
                                                            isSelected && locationConfirmed
                                                                ? 'bg-orange-500 border-orange-500'
                                                                : 'border-gray-300'
                                                        }`}>
                                                        {isSelected && locationConfirmed &&
                                                            <span className="text-white text-sm">✓</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {filteredPandals.length === 0 && (
                                    <div className="text-center py-12 text-gray-500">
                                        No pandals found for letter "{filterLetter}"
                                    </div>
                                )}
                            </div>
                        </div>
                    )};
                </>
            )}
        </div>
    );
}

export default Planner;