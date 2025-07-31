export interface Pandal {
    id: number
    name: string
    region: string
    latitude: number
    longitude: number
    is_big: boolean
    main_pic?: string | null
    area?: string
    town?: string
}

export interface PandalData {
    id: number;
    name: string;
    description: string;
    theme: string;
    area: string;
    town: string;
    pincode: string;
    is_big: boolean;
    latitude: number;
    longitude: number;
    main_pic: string;
    google_maps_url?: string;
    photos: string[];
}

export interface Photo {
    id: number;
    photo: string;
}

export interface PhotosByYear {
    [year: string]: Photo[];
}

