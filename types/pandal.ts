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
    liked_by_user: boolean
    like_count: number
}

export interface PandalData {
    id: number
    name: string
    description: string
    theme: string
    area: string
    town: string
    pincode: string
    is_big: boolean
    latitude: number
    longitude: number
    main_pic: string
    google_maps_url?: string
    liked_by_user: boolean
    like_count: number
    photos: string[];
}

export interface Photo {
    id: number;
    photo: string;
}

export interface PhotosByYear {
    [year: string]: Photo[];
}

