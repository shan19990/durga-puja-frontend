'use client';

import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';
import Cookies from 'js-cookie'; // Add this import

import {PandalData, PhotosByYear} from '@/types/pandal';
import MainImage from "@/components/MainImage";
import ThumbnailGallery from "@/components/ThumbnailGallery";
import PandalDetails from "@/components/PandalDetails";
import PhotoGallery from "@/components/PhotoGallery";
import { showToast } from '@/lib/toast';

const PlannerPage = () => {
    const params = useParams() as { id: string };
    const pandalId = params?.id;

    const [pandalData, setPandalData] = useState<PandalData | null>(null);
    const [photosData, setPhotosData] = useState<{ photos_by_year: PhotosByYear } | null>(null);
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const API_BASE = 'https://durgapujo.in/api';

    // Helper function to get auth headers
    const getAuthHeaders = () => {
        const accessToken = Cookies.get("access");
        const headers: any = {
            'Content-Type': 'application/json'
        };
        
        if (accessToken) {
            console.log(accessToken);
            headers.Authorization = `Bearer ${accessToken}`;
        }
        
        return headers;
    };

    // Fetch pandal details
    useEffect(() => {
        if (!pandalId) return;

        const fetchPandalData = async () => {
            try {
                setLoading(true);
                
                // Add auth headers to the request
                const headers = getAuthHeaders();
                
                const response = await fetch(`${API_BASE}/pandals/${pandalId}/`, {
                    method: 'GET',
                    headers: headers,
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch pandal data');
                }

                const data: PandalData = await response.json();
                setPandalData(data);
                
                const mainPic = data.main_pic?.startsWith('http') ? data.main_pic : data.main_pic ? `${API_BASE}${data.main_pic}` : '';
                setSelectedImage(mainPic);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchPandalData();
    }, [pandalId]);

    // Fetch photos gallery
    useEffect(() => {
        if (!pandalId) return;

        const fetchPhotosData = async () => {
            try {
                // Add auth headers to photos request too
                const headers = getAuthHeaders();
                
                const response = await fetch(`${API_BASE}/pandals/${pandalId}/photos/`, {
                    method: 'GET',
                    headers: headers,
                });
                
                if (!response.ok) throw new Error('Failed to fetch photos');
                const data = await response.json();
                setPhotosData(data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchPhotosData();
    }, [pandalId]);

    const handleImageClick = (url: string) => {
        const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
        setSelectedImage(fullUrl);
    };

    // Add like functionality for this page
    const handleLike = async () => {
        if (!pandalData) return;
        
        try {
            const accessToken = Cookies.get("access");
            
            if (!accessToken) {
                showToast.warning("Please login to like pandals");
                return;
            }

            const response = await fetch(`${API_BASE}/pandals/${pandalData.id}/toggle-like/`, {
                method: 'GET', // Your API uses GET
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to toggle like');
            }

            const data = await response.json();
            
            // Update the pandal data with new like status
            setPandalData(prev => prev ? {
                ...prev,
                liked_by_user: data.liked,
                like_count: data.like_count
            } : null);

            console.log('Like toggled:', data);

        } catch (error) {
            console.error('Error toggling like:', error);
            showToast.error("Failed to update like. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">Loading pandal details...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl text-red-600">Error: {error}</div>
            </div>
        );
    }

    if (!pandalData) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-xl">No pandal data found</div>
            </div>
        );
    }

    const thumbnailPhotos = pandalData.photos.map(photo =>
        photo?.startsWith('http') ? photo : `${API_BASE}${photo}`
    );

    return (
        <div className="max-w-[1400px] mx-auto p-4 mb-[50px] mt-[100px] space-y-8">
            {selectedImage ? (
                <MainImage src={selectedImage} alt={pandalData.name}/>
            ) : (
                <div className='w-full h-[500px] bg-gray-50/50 rounded-lg flex items-center justify-center'>
                    <img src='/images/pandal.png' alt={pandalData.name} className='h-[90%] object-contain'/>
                </div>
            )}

            {thumbnailPhotos.length > 0 && selectedImage && (
                <ThumbnailGallery
                    photos={thumbnailPhotos}
                    mainPic={selectedImage}
                    selectedImage={selectedImage}
                    onClick={handleImageClick}
                />
            )}

            {/* Add like button here */}
            <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
                <button
                    onClick={handleLike}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        pandalData.liked_by_user 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-blue-50 text-blue-500 border border-blue-500'
                    }`}
                >
                    <span>{pandalData.liked_by_user ? '❤️' : '🤍'}</span>
                    <span>{pandalData.liked_by_user ? 'Liked' : 'Like'}</span>
                    <span>({pandalData.like_count || 0})</span>
                </button>
            </div>

            <PandalDetails data={pandalData}/>

            {photosData && (
                <PhotoGallery photosByYear={photosData.photos_by_year} onClick={handleImageClick}/>
            )}
        </div>
    );
};

export default PlannerPage;
