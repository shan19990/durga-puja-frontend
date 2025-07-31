import Image from 'next/image';
import {PhotosByYear} from '@/types/pandal';

const PhotoGallery = ({
                          photosByYear,
                          onClick,
                      }: {
    photosByYear: PhotosByYear;
    onClick: (src: string) => void;
}) => {
    return (
        <div className="pt-8 md:pt-20">
            <h2 className="text-[1.5rem] md:text-3xl text-center font-bold mb-8">Photo Gallery</h2>
            {Object.entries(photosByYear).map(([year, photos]) => (
                <div key={year} className="mb-8">
                    <h3 className="text-xl font-semibold mb-4">{year}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {photos.map((photo) => {
                            const src = photo.photo.startsWith('http') ? photo.photo : `https://durgapujo.in${photo.photo}`;
                            return (
                                <div
                                    key={photo.id}
                                    onClick={() => onClick(src)}
                                    className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg"
                                >
                                    <Image src={src} alt={`Gallery ${photo.id}`} fill
                                           className="object-cover hover:scale-105 transition-transform duration-200"/>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default PhotoGallery;
