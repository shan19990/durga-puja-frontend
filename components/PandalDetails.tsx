import {PandalData} from '@/types/pandal';
import React from "react";

const PandalDetails = ({data}: { data: PandalData }) => {
    return (
        <div className="">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-8">{data.name}</h1>
            <div className="grid md:grid-cols-2 gap-5 md:gap-20">
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Description</h3>
                        <p className="text-gray-600">{data.description || 'No description available'}</p>
                    </div>
                    {data.theme && (
                        <div>
                            <h3 className="text-lg font-semibold">Theme</h3>
                            <p className="text-gray-600">{data.theme}</p>
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                    <div>
                        <h3 className="text-lg font-semibold">Location</h3>
                        <p className="text-gray-600">{data.area}, {data.town} - {data.pincode}</p>
                    </div>
                    <div className='pb-8'>
                        <h3 className="text-lg font-semibold">Details</h3>
                        <p className="text-gray-600">Type: {data.is_big ? 'Big Pandal' : 'Regular Pandal'}</p>
                        <p className="text-gray-600">Coordinates: {data.latitude.toFixed(6)}, {data.longitude.toFixed(6)}</p>
                    </div>
                    {data.google_maps_url && (
                        <a
                            href={data.google_maps_url}
                            target="_blank"
                            className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-6 py-3 rounded-lg text-base sm:text-lg shadow transition"
                        >
                            View on Google Maps
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PandalDetails;
