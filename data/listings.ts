export type ListingReview = {
  id: string;
  guest: string;
  stay: string;
  comment: string;
  rating: number;
};

export type BookingOption = 'room' | 'entire';

export type ListingAttraction = {
  id: string;
  name: string;
  description: string;
  image: string;
  mapUrl: string;
};

export type ListingDetail = {
  id: string;
  name: string;
  apartmentType: string;
  coverPhoto: string;
  description: string;
  minimumPrice: number;
  rating: number;
  area: string;
  pointsToWin: number;
  maxNumberOfGuestsAllowed: number;
  bookingOptions: BookingOption[];
  attractions: ListingAttraction[];
  amenities: string[];
  gallery: string[];
  reviews: ListingReview[];
  availability: Record<string, boolean>;
};

const formatDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildAvailability = (offsets: number[]) => {
  const availability: Record<string, boolean> = {};
  const today = new Date();
  offsets.forEach((offset) => {
    const date = new Date(today);
    date.setDate(today.getDate() + offset);
    availability[formatDateKey(date)] = false;
  });
  return availability;
};

const APARTMENT_IMAGES = [
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1549187774-b4e9b0445b41?auto=format&fit=crop&w=1200&q=80',
];

const buildGallery = (label: string, colors: string[]) => {
  if (!APARTMENT_IMAGES.length) return [];
  let hash = 0;
  for (let i = 0; i < label.length; i += 1) {
    hash = (hash + label.charCodeAt(i)) % APARTMENT_IMAGES.length;
  }
  const count = Math.max(colors.length, 1);
  return Array.from({ length: count }, (_, index) => {
    const imageIndex = (hash + index) % APARTMENT_IMAGES.length;
    return APARTMENT_IMAGES[imageIndex];
  });
};

const buildMapUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const formatAttractionId = (area: string, index: number) =>
  `${area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${index + 1}`;

const buildAttractions = (
  area: string,
  attractions: { name: string; description: string; image: string; mapQuery?: string }[]
): ListingAttraction[] =>
  attractions.map((attraction, index) => ({
    id: formatAttractionId(area, index),
    name: attraction.name,
    description: attraction.description,
    image: attraction.image,
    mapUrl: buildMapUrl(attraction.mapQuery ?? `${attraction.name}, ${area}, Lagos`),
  }));

const ATTRACTION_IMAGES = {
  nature:
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  beach:
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
  art:
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
  nightlife:
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
  resort:
    'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=80',
  park:
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80',
  culture:
    'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1200&q=80',
  market:
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
  marina:
    'https://images.unsplash.com/photo-1440589473619-3cde28941638?auto=format&fit=crop&w=1200&q=80',
  cinema:
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
  mall:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
};

const ATTRACTIONS_BY_AREA: Record<string, ListingAttraction[]> = {
  'Lekki Phase 1': buildAttractions('Lekki Phase 1', [
    {
      name: 'Lekki Conservation Centre',
      description: 'Canopy walks, wetlands, and nature trails for a calm escape.',
      image: ATTRACTION_IMAGES.nature,
      mapQuery: 'Lekki Conservation Centre, Lagos',
    },
    {
      name: 'Landmark Beach',
      description: 'Wide sandy shoreline with cabanas, food, and sunset views.',
      image: ATTRACTION_IMAGES.beach,
      mapQuery: 'Landmark Beach, Lagos',
    },
    {
      name: 'Nike Art Gallery',
      description: 'Five floors of Nigerian art, crafts, and cultural exhibits.',
      image: ATTRACTION_IMAGES.art,
      mapQuery: 'Nike Art Gallery, Lagos',
    },
  ]),
  Ikoyi: buildAttractions('Ikoyi', [
    {
      name: 'Ikoyi Golf Club',
      description: 'Iconic 18-hole course with lush fairways and a clubhouse lounge.',
      image: ATTRACTION_IMAGES.park,
      mapQuery: 'Ikoyi Golf Club, Lagos',
    },
    {
      name: 'Ikoyi Club 1938',
      description: 'Historic social club with tennis courts, pool, and dining.',
      image: ATTRACTION_IMAGES.culture,
      mapQuery: 'Ikoyi Club 1938, Lagos',
    },
    {
      name: 'National Museum Lagos',
      description: 'Curated collections celebrating Nigerian history and heritage.',
      image: ATTRACTION_IMAGES.culture,
      mapQuery: 'National Museum Lagos',
    },
  ]),
  'Victoria Island': buildAttractions('Victoria Island', [
    {
      name: 'Terra Kulture',
      description: 'Live theatre, art exhibitions, and Yoruba-inspired cuisine.',
      image: ATTRACTION_IMAGES.culture,
      mapQuery: 'Terra Kulture, Lagos',
    },
    {
      name: 'Eko Hotel & Suites',
      description: 'Entertainment hub with dining, events, and a vibrant lobby scene.',
      image: ATTRACTION_IMAGES.resort,
      mapQuery: 'Eko Hotel and Suites, Lagos',
    },
    {
      name: 'Oniru Beach',
      description: 'Beachfront vibes with music, lounging, and water activities.',
      image: ATTRACTION_IMAGES.beach,
      mapQuery: 'Oniru Beach, Lagos',
    },
  ]),
  Oniru: buildAttractions('Oniru', [
    {
      name: 'Landmark Beach',
      description: 'Relaxing beachfront with eateries, loungers, and sunset views.',
      image: ATTRACTION_IMAGES.beach,
      mapQuery: 'Landmark Beach, Lagos',
    },
    {
      name: 'The Palms Mall',
      description: 'Shopping, dining, and entertainment for a breezy day out.',
      image: ATTRACTION_IMAGES.mall,
      mapQuery: 'The Palms Shopping Mall, Lagos',
    },
    {
      name: 'Filmhouse IMAX Lekki',
      description: 'IMAX screens and retail spots for a polished movie night.',
      image: ATTRACTION_IMAGES.cinema,
      mapQuery: 'Filmhouse IMAX Lekki, Lagos',
    },
  ]),
  'Banana Island': buildAttractions('Banana Island', [
    {
      name: 'Banana Island Waterfront',
      description: 'Serene waterfront walks with city views and quiet corners.',
      image: ATTRACTION_IMAGES.marina,
      mapQuery: 'Banana Island, Lagos',
    },
    {
      name: 'Lagos Motor Boat Club',
      description: 'Waterside clubhouse for boating and relaxed dinners.',
      image: ATTRACTION_IMAGES.marina,
      mapQuery: 'Lagos Motor Boat Club, Lagos',
    },
    {
      name: 'Ikoyi Golf Club',
      description: 'Classic greens and a refined clubhouse experience nearby.',
      image: ATTRACTION_IMAGES.park,
      mapQuery: 'Ikoyi Golf Club, Lagos',
    },
  ]),
  Lekki: buildAttractions('Lekki', [
    {
      name: 'Lekki Conservation Centre',
      description: 'Nature trails and canopy bridges for a refreshing outing.',
      image: ATTRACTION_IMAGES.nature,
      mapQuery: 'Lekki Conservation Centre, Lagos',
    },
    {
      name: 'Lakowe Lakes Resort',
      description: 'Resort-style getaway with lakeside views and golf.',
      image: ATTRACTION_IMAGES.resort,
      mapQuery: 'Lakowe Lakes Resort, Lagos',
    },
    {
      name: 'Eleko Beach',
      description: 'Popular beach with volleyball courts and weekend vibes.',
      image: ATTRACTION_IMAGES.beach,
      mapQuery: 'Eleko Beach, Lagos',
    },
  ]),
  Marina: buildAttractions('Marina', [
    {
      name: 'Freedom Park',
      description: 'Open-air cultural park with cafes, art, and history.',
      image: ATTRACTION_IMAGES.park,
      mapQuery: 'Freedom Park, Lagos',
    },
    {
      name: 'Tafawa Balewa Square',
      description: 'Historic landmark for civic events and city photos.',
      image: ATTRACTION_IMAGES.culture,
      mapQuery: 'Tafawa Balewa Square, Lagos',
    },
    {
      name: 'Lagos Marina Ferry Terminal',
      description: 'Gateway to lagoon ferries and waterfront strolls.',
      image: ATTRACTION_IMAGES.marina,
      mapQuery: 'Marina Ferry Terminal, Lagos',
    },
  ]),
  Yaba: buildAttractions('Yaba', [
    {
      name: 'University of Lagos Lagoon Front',
      description: 'Scenic campus views and a breezy lagoon atmosphere.',
      image: ATTRACTION_IMAGES.park,
      mapQuery: 'University of Lagos, Lagos',
    },
    {
      name: 'Tejuosho Market',
      description: 'Fashion, street food, and lively market energy.',
      image: ATTRACTION_IMAGES.market,
      mapQuery: 'Tejuosho Market, Lagos',
    },
    {
      name: 'Sabo Yaba Food Strip',
      description: 'Local eateries for quick bites and late-night snacks.',
      image: ATTRACTION_IMAGES.nightlife,
      mapQuery: 'Sabo Yaba, Lagos',
    },
  ]),
  Parkview: buildAttractions('Parkview', [
    {
      name: 'Lagos Polo Club',
      description: 'Classic polo grounds with a refined social scene.',
      image: ATTRACTION_IMAGES.park,
      mapQuery: 'Lagos Polo Club, Lagos',
    },
    {
      name: 'Ikoyi Golf Club',
      description: 'Peaceful greens and a calm clubhouse experience.',
      image: ATTRACTION_IMAGES.park,
      mapQuery: 'Ikoyi Golf Club, Lagos',
    },
    {
      name: 'Banana Island Waterfront',
      description: 'Exclusive waterfront routes with skyline views.',
      image: ATTRACTION_IMAGES.marina,
      mapQuery: 'Banana Island, Lagos',
    },
  ]),
  Ajah: buildAttractions('Ajah', [
    {
      name: 'Lufasi Nature Park',
      description: 'Green trails, picnic spots, and a quiet escape.',
      image: ATTRACTION_IMAGES.nature,
      mapQuery: 'Lufasi Nature Park, Lagos',
    },
    {
      name: 'Atican Beach Resort',
      description: 'Beach resort with cabanas, pools, and relaxation.',
      image: ATTRACTION_IMAGES.resort,
      mapQuery: 'Atican Beach Resort, Lagos',
    },
    {
      name: 'Novare Lekki Mall',
      description: 'Shopping center with restaurants and movie options.',
      image: ATTRACTION_IMAGES.mall,
      mapQuery: 'Novare Lekki Mall, Lagos',
    },
  ]),
  'Lekki Phase 2': buildAttractions('Lekki Phase 2', [
    {
      name: 'Lufasi Nature Park',
      description: 'Peaceful trails and eco-friendly gardens nearby.',
      image: ATTRACTION_IMAGES.nature,
      mapQuery: 'Lufasi Nature Park, Lagos',
    },
    {
      name: 'Novare Lekki Mall',
      description: 'Retail, restaurants, and easy weekend hangouts.',
      image: ATTRACTION_IMAGES.mall,
      mapQuery: 'Novare Lekki Mall, Lagos',
    },
    {
      name: 'Ajah Market',
      description: 'Colorful market stalls with local produce and snacks.',
      image: ATTRACTION_IMAGES.market,
      mapQuery: 'Ajah Market, Lagos',
    },
  ]),
};

export const LISTINGS: ListingDetail[] = [
  {
    id: 'saf-001',
    name: 'Azure Bay Studio',
    apartmentType: 'Studio',
    gallery: buildGallery('Azure Bay Studio', ['1d4ed8', '0f172a', '0ea5e9']),
    coverPhoto: buildGallery('Azure Bay Studio', ['1d4ed8'])[0],
    description: 'A calm, sunlit studio with a city skyline view and a cozy lounge corner.',
    minimumPrice: 65000,
    rating: 4.7,
    area: 'Lekki Phase 1',
    pointsToWin: 80,
    maxNumberOfGuestsAllowed: 2,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA['Lekki Phase 1'],
    amenities: ['wifi', 'ac', 'smart tv', 'balcony'],
    reviews: [
      {
        id: 'review-001',
        guest: 'Ifeyinwa',
        stay: 'May 2024',
        comment: 'Bright, spotless, and perfectly located. Loved the check-in flow.',
        rating: 4.8,
      },
      {
        id: 'review-002',
        guest: 'Damola',
        stay: 'Apr 2024',
        comment: 'Great for quick business trips. Wi-Fi was fast and reliable.',
        rating: 4.6,
      },
    ],
    availability: buildAvailability([1, 2, 6, 9]),
  },
  {
    id: 'saf-002',
    name: 'Ikoyi Skyline Suite',
    apartmentType: '1 bed',
    gallery: buildGallery('Ikoyi Skyline Suite', ['0f172a', '1e3a8a', '1d4ed8']),
    coverPhoto: buildGallery('Ikoyi Skyline Suite', ['0f172a'])[0],
    description: 'Elegant one-bedroom suite with panoramic views and premium finishes.',
    minimumPrice: 120000,
    rating: 4.9,
    area: 'Ikoyi',
    pointsToWin: 140,
    maxNumberOfGuestsAllowed: 3,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA.Ikoyi,
    amenities: ['wifi', 'ac', 'dining area', 'gym'],
    reviews: [
      {
        id: 'review-003',
        guest: 'Sade',
        stay: 'Mar 2024',
        comment: 'The skyline view was unreal. This felt like a boutique hotel stay.',
        rating: 5,
      },
    ],
    availability: buildAvailability([3, 4, 12, 16]),
  },
  {
    id: 'saf-003',
    name: 'Eko Pearl Penthouse',
    apartmentType: '3 bed',
    gallery: buildGallery('Eko Pearl Penthouse', ['1e3a8a', '0f172a', '0ea5e9']),
    coverPhoto: buildGallery('Eko Pearl Penthouse', ['1e3a8a'])[0],
    description: 'Spacious penthouse with a private cinema lounge and chef-ready kitchen.',
    minimumPrice: 280000,
    rating: 4.8,
    area: 'Victoria Island',
    pointsToWin: 260,
    maxNumberOfGuestsAllowed: 6,
    bookingOptions: ['room', 'entire'],
    attractions: ATTRACTIONS_BY_AREA['Victoria Island'],
    amenities: ['wifi', 'cinema', 'dining area', 'balcony'],
    reviews: [
      {
        id: 'review-004',
        guest: 'Kelechi',
        stay: 'Feb 2024',
        comment: 'Perfect for group stays. The cinema lounge was the highlight.',
        rating: 4.9,
      },
    ],
    availability: buildAvailability([2, 8, 11, 18]),
  },
  {
    id: 'saf-004',
    name: 'Coastal Retreat',
    apartmentType: '2 bed',
    gallery: buildGallery('Coastal Retreat', ['0ea5e9', '1d4ed8', '0284c7']),
    coverPhoto: buildGallery('Coastal Retreat', ['0ea5e9'])[0],
    description: 'Ocean-kissed two-bedroom escape with airy interiors and soft lighting.',
    minimumPrice: 145000,
    rating: 4.6,
    area: 'Oniru',
    pointsToWin: 160,
    maxNumberOfGuestsAllowed: 4,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA.Oniru,
    amenities: ['wifi', 'swimming pool', 'ac', 'balcony'],
    reviews: [],
    availability: buildAvailability([4, 5, 14, 17]),
  },
  {
    id: 'saf-005',
    name: 'Banana Island Loft',
    apartmentType: 'Studio',
    gallery: buildGallery('Banana Island Loft', ['0284c7', '1d4ed8', '0f172a']),
    coverPhoto: buildGallery('Banana Island Loft', ['0284c7'])[0],
    description: 'Modern loft with high ceilings, smart lighting, and designer details.',
    minimumPrice: 98000,
    rating: 4.5,
    area: 'Banana Island',
    pointsToWin: 110,
    maxNumberOfGuestsAllowed: 2,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA['Banana Island'],
    amenities: ['wifi', 'ac', 'smart tv', 'gym'],
    reviews: [],
    availability: buildAvailability([1, 7, 10, 13]),
  },
  {
    id: 'saf-006',
    name: 'Lekki Grande Residence',
    apartmentType: '4 bed',
    gallery: buildGallery('Lekki Grande Residence', ['0f172a', '1e40af', '1d4ed8']),
    coverPhoto: buildGallery('Lekki Grande Residence', ['0f172a'])[0],
    description: 'Luxury four-bedroom residence with a private garden lounge.',
    minimumPrice: 320000,
    rating: 4.9,
    area: 'Lekki',
    pointsToWin: 310,
    maxNumberOfGuestsAllowed: 8,
    bookingOptions: ['room', 'entire'],
    attractions: ATTRACTIONS_BY_AREA.Lekki,
    amenities: ['wifi', 'swimming pool', 'dining area', 'gym'],
    reviews: [
      {
        id: 'review-005',
        guest: 'Tomiwa',
        stay: 'Jan 2024',
        comment: 'Spacious, elegant, and the hosts were responsive throughout.',
        rating: 4.8,
      },
    ],
    availability: buildAvailability([6, 9, 15, 20]),
  },
  {
    id: 'saf-007',
    name: 'Marina Executive Stay',
    apartmentType: '2 bed',
    gallery: buildGallery('Marina Executive Stay', ['1d4ed8', '0f172a', '38bdf8']),
    coverPhoto: buildGallery('Marina Executive Stay', ['1d4ed8'])[0],
    description: 'Business-ready two-bedroom with a focused workspace and fast Wi-Fi.',
    minimumPrice: 150000,
    rating: 4.4,
    area: 'Marina',
    pointsToWin: 170,
    maxNumberOfGuestsAllowed: 4,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA.Marina,
    amenities: ['wifi', 'ac', 'dining area', 'smart tv'],
    reviews: [],
    availability: buildAvailability([3, 5, 11, 22]),
  },
  {
    id: 'saf-008',
    name: 'Yaba City Smart Flat',
    apartmentType: '1 bed',
    gallery: buildGallery('Yaba City Smart Flat', ['38bdf8', '1d4ed8', '0f172a']),
    coverPhoto: buildGallery('Yaba City Smart Flat', ['38bdf8'])[0],
    description: 'Bright one-bedroom with a tech-friendly setup and breezy balcony.',
    minimumPrice: 78000,
    rating: 4.3,
    area: 'Yaba',
    pointsToWin: 90,
    maxNumberOfGuestsAllowed: 2,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA.Yaba,
    amenities: ['wifi', 'fans', 'balcony', 'smart tv'],
    reviews: [],
    availability: buildAvailability([2, 8, 13, 19]),
  },
  {
    id: 'saf-009',
    name: 'Parkview Signature Home',
    apartmentType: '5 bed',
    gallery: buildGallery('Parkview Signature Home', ['0f172a', '1e3a8a', '1d4ed8']),
    coverPhoto: buildGallery('Parkview Signature Home', ['0f172a'])[0],
    description: 'Prestige five-bedroom villa with an entertainment-ready dining hall.',
    minimumPrice: 480000,
    rating: 4.9,
    area: 'Parkview',
    pointsToWin: 420,
    maxNumberOfGuestsAllowed: 10,
    bookingOptions: ['room', 'entire'],
    attractions: ATTRACTIONS_BY_AREA.Parkview,
    amenities: ['wifi', 'swimming pool', 'cinema', 'gym'],
    reviews: [
      {
        id: 'review-006',
        guest: 'Femi',
        stay: 'Dec 2023',
        comment: 'A true luxury escape. We hosted a private dinner and it was perfect.',
        rating: 5,
      },
    ],
    availability: buildAvailability([4, 9, 12, 21]),
  },
  {
    id: 'saf-010',
    name: 'Ajah Horizon Suites',
    apartmentType: '3 bed',
    gallery: buildGallery('Ajah Horizon Suites', ['1e40af', '0f172a', '0ea5e9']),
    coverPhoto: buildGallery('Ajah Horizon Suites', ['1e40af'])[0],
    description: 'Relaxed three-bedroom retreat with a breezy dining space.',
    minimumPrice: 195000,
    rating: 4.5,
    area: 'Ajah',
    pointsToWin: 200,
    maxNumberOfGuestsAllowed: 6,
    bookingOptions: ['room', 'entire'],
    attractions: ATTRACTIONS_BY_AREA.Ajah,
    amenities: ['wifi', 'dining area', 'ac', 'balcony'],
    reviews: [],
    availability: buildAvailability([1, 6, 14, 23]),
  },
  {
    id: 'saf-011',
    name: 'Lekki Garden Terrace',
    apartmentType: '1 bed',
    gallery: buildGallery('Lekki Garden Terrace', ['2563eb', '1d4ed8', '0ea5e9']),
    coverPhoto: buildGallery('Lekki Garden Terrace', ['2563eb'])[0],
    description: 'Chic one-bedroom with leafy views and a warm dining nook.',
    minimumPrice: 88000,
    rating: 4.6,
    area: 'Lekki Phase 2',
    pointsToWin: 95,
    maxNumberOfGuestsAllowed: 2,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA['Lekki Phase 2'],
    amenities: ['wifi', 'dining area', 'fans', 'balcony'],
    reviews: [],
    availability: buildAvailability([5, 10, 17, 24]),
  },
  {
    id: 'saf-012',
    name: 'Oniru Poolside Escape',
    apartmentType: '2 bed',
    gallery: buildGallery('Oniru Poolside Escape', ['0ea5e9', '1d4ed8', '0f172a']),
    coverPhoto: buildGallery('Oniru Poolside Escape', ['0ea5e9'])[0],
    description: 'Two-bedroom escape with serene interiors and pool access.',
    minimumPrice: 168000,
    rating: 4.7,
    area: 'Oniru',
    pointsToWin: 185,
    maxNumberOfGuestsAllowed: 4,
    bookingOptions: ['entire'],
    attractions: ATTRACTIONS_BY_AREA.Oniru,
    amenities: ['wifi', 'swimming pool', 'ac', 'smart tv'],
    reviews: [],
    availability: buildAvailability([2, 7, 16, 20]),
  },
];

export const findListingById = (id: string) => LISTINGS.find((listing) => listing.id === id);
