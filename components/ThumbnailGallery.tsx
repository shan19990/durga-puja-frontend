'use client';
import Image from 'next/image';

interface Props {
    photos: string[];
    mainPic: string;
    selectedImage: string;
    onClick: (src: string) => void;
}

const ThumbnailGallery = ({photos, mainPic, selectedImage, onClick}: Props) => {
    return (
        <div>
            <h3 className="text-lg font-semibold mb-4">Photos</h3>
            <div className="flex gap-4 overflow-x-auto pb-2">
                {[mainPic, ...photos].map((photo, index) => {
                    const isSelected = selectedImage === photo;
                    return (
                        <div
                            key={index}
                            className={`flex-shrink-0 cursor-pointer border-2 rounded-lg overflow-hidden ${
                                isSelected ? 'border-blue-500' : 'border-gray-300'
                            }`}
                            onClick={() => onClick(photo)}
                        >
                            <div className="relative w-24 h-24">
                                <Image src={photo} alt={`Photo ${index + 1}`} fill className="object-cover"/>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ThumbnailGallery;
