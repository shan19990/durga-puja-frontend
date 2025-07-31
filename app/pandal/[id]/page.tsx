'use client';

import {useEffect, useState} from 'react';
import {useParams} from 'next/navigation';

import {PandalData, PhotosByYear} from '@/types/pandal';
import MainImage from "@/components/MainImage";
import ThumbnailGallery from "@/components/ThumbnailGallery";
import PandalDetails from "@/components/PandalDetails";
import PhotoGallery from "@/components/PhotoGallery";

const PlannerPage = () => {
    const params = useParams() as { id: string };
    const pandalId = params?.id;

    const [pandalData, setPandalData] = useState<PandalData | null>(null);
    const [photosData, setPhotosData] = useState<{ photos_by_year: PhotosByYear } | null>(null);
    const [selectedImage, setSelectedImage] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const API_BASE = 'https://durgapujo.in/api';

    // Fetch pandal details
    useEffect(() => {
        if (!pandalId) return;

        const fetchPandalData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${API_BASE}/pandals/${pandalId}/`);

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
                const response = await fetch(`${API_BASE}/pandals/${pandalId}/photos/`);
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

            <PandalDetails data={pandalData}/>

            {photosData && (
                <PhotoGallery photosByYear={photosData.photos_by_year} onClick={handleImageClick}/>
            )}
        </div>
    );
};

export default PlannerPage;
