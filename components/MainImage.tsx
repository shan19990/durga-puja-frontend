'use client';
import Image from 'next/image';

const MainImage = ({src, alt}: { src: string; alt: string }) => (
    <div className="relative w-full h-96 md:h-[500px] bg-gray-200 rounded-lg overflow-hidden">
        <Image src={src} alt={alt} fill className="object-cover" priority/>
    </div>
);

export default MainImage;
