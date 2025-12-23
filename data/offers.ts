export type OfferListing = {
  id: string;
  name: string;
  location: string;
  rating: number;
  price: number;
  priceUnit: string;
  image: string;
};

export type OfferDeal = {
  id: string;
  title: string;
  description: string;
  rewards: string[];
  image: string;
  listings: OfferListing[];
};

export type OfferCategory = {
  id: string;
  title: string;
  description: string;
  rewards: string[];
  image: string;
  offers: OfferDeal[];
};

export const OFFER_CATEGORIES: OfferCategory[] = [
  {
    id: 'late-night',
    title: 'Late Night Deals',
    description:
      'Deep discounts for check-ins after 9 PM. Perfect for red-eye arrivals and last-minute stays.',
    rewards: ['Up to 40% off', 'Late check-in', 'Last-minute steals'],
    image:
      'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    offers: [
      {
        id: 'late-night-40',
        title: 'Late Night 40% Off',
        description:
          'Arrive after 9 PM and save big on select apartments that are ready for late arrivals.',
        rewards: ['40% off', 'Check-in after 9 PM'],
        image:
          'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'ln-1',
            name: 'Azure Heights Apartment',
            location: 'Lekki Phase 1',
            rating: 4.7,
            price: 68000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'ln-2',
            name: 'Skyline One Bedroom',
            location: 'Victoria Island',
            rating: 4.8,
            price: 82000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'ln-3',
            name: 'Cedar Loft Studio',
            location: 'Ikoyi',
            rating: 4.6,
            price: 91000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
      {
        id: 'red-eye-reset',
        title: 'Red-Eye Reset 35% Off',
        description:
          'Land late and sleep well. Enjoy reduced rates for check-ins after 10 PM.',
        rewards: ['35% off', 'Late arrival support'],
        image:
          'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'ln-4',
            name: 'Obsidian Suite',
            location: 'Lekki',
            rating: 4.5,
            price: 72000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'ln-5',
            name: 'Luna View Apartment',
            location: 'Banana Island',
            rating: 4.9,
            price: 125000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'ln-6',
            name: 'Midtown Hideaway',
            location: 'Oniru',
            rating: 4.4,
            price: 59000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
    ],
  },
  {
    id: 'free-night',
    title: 'Free Night Deals',
    description:
      'Stay longer and the extra nights are on us. The best value for extended trips.',
    rewards: ['1-2 free nights', 'Long-stay perks', 'Bigger savings'],
    image:
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
    offers: [
      {
        id: 'stay-3-get-1',
        title: 'Book 3 Nights, Get 1 Free',
        description:
          'Book three nights and the fourth night is free on select apartments.',
        rewards: ['1 free night', 'Ideal for weekend escapes'],
        image:
          'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'fn-1',
            name: 'Palm Residence',
            location: 'Ikate',
            rating: 4.6,
            price: 78000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'fn-2',
            name: 'Harbor View Suite',
            location: 'Marina',
            rating: 4.7,
            price: 98000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'fn-3',
            name: 'Terrace Garden Loft',
            location: 'Lekki Phase 2',
            rating: 4.5,
            price: 64000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
      {
        id: 'stay-5-get-2',
        title: 'Book 5 Nights, Get 2 Free',
        description:
          'Stay for five nights and enjoy two nights free. Perfect for longer breaks.',
        rewards: ['2 free nights', 'Extended stay bonus'],
        image:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'fn-4',
            name: 'Amber Bay Apartment',
            location: 'Victoria Island',
            rating: 4.8,
            price: 102000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'fn-5',
            name: 'Eko Crest Studio',
            location: 'Oniru',
            rating: 4.4,
            price: 74000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'fn-6',
            name: 'Blue Pearl Residence',
            location: 'Lekki',
            rating: 4.7,
            price: 88000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
    ],
  },
  {
    id: 'half-day',
    title: 'Half Day Deals',
    description:
      'Short stays for layovers, work sprints, or a quick recharge without the full-night rate.',
    rewards: ['Up to 40% off', '4-8 hour stays', 'Flexible check-in'],
    image:
      'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
    offers: [
      {
        id: 'six-hour-layover',
        title: '6-Hour Layover Stay',
        description:
          'A comfortable space to refresh between flights or meetings with a 40% discount.',
        rewards: ['40% off', '6-hour access'],
        image:
          'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'hd-1',
            name: 'Orchid City Studio',
            location: 'Ikeja GRA',
            rating: 4.5,
            price: 32000,
            priceUnit: 'per 6 hours',
            image:
              'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'hd-2',
            name: 'Terminal View Loft',
            location: 'Ikeja',
            rating: 4.3,
            price: 28000,
            priceUnit: 'per 6 hours',
            image:
              'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'hd-3',
            name: 'West Point Suite',
            location: 'Maryland',
            rating: 4.6,
            price: 35000,
            priceUnit: 'per 6 hours',
            image:
              'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
      {
        id: 'eight-hour-day',
        title: '8-Hour Day Retreat',
        description:
          'Use an apartment for the day to rest, work, or freshen up with a 35% deal.',
        rewards: ['35% off', '8-hour access'],
        image:
          'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'hd-4',
            name: 'Maple Executive Suite',
            location: 'Yaba',
            rating: 4.4,
            price: 42000,
            priceUnit: 'per 8 hours',
            image:
              'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'hd-5',
            name: 'Palm View Apartment',
            location: 'Surulere',
            rating: 4.2,
            price: 30000,
            priceUnit: 'per 8 hours',
            image:
              'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'hd-6',
            name: 'City Breeze Studio',
            location: 'Ikeja',
            rating: 4.5,
            price: 36000,
            priceUnit: 'per 8 hours',
            image:
              'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
    ],
  },
  {
    id: 'spa',
    title: 'Spa and Wellness Deals',
    description:
      'Book multi-night stays and unlock complimentary spa treatments and wellness perks.',
    rewards: ['Free spa massage', 'Wellness perks', 'Relaxation add-ons'],
    image:
      'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
    offers: [
      {
        id: 'stay-2-spa',
        title: 'Book 2 Nights, Get a Spa Massage',
        description:
          'Enjoy a complimentary 60-minute massage when you stay two nights or more.',
        rewards: ['Free 60-min massage', '2+ nights'],
        image:
          'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'sp-1',
            name: 'Lagoon Breeze Suite',
            location: 'Lekki Phase 1',
            rating: 4.8,
            price: 92000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'sp-2',
            name: 'Coral Bay Apartment',
            location: 'Ikoyi',
            rating: 4.9,
            price: 124000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'sp-3',
            name: 'Solace Retreat Loft',
            location: 'Banana Island',
            rating: 4.7,
            price: 155000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1502005097973-6a7082348e28?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
      {
        id: 'stay-4-couples',
        title: 'Book 4 Nights, Get a Couples Massage',
        description:
          'Perfect for a romantic getaway with a complimentary couples massage.',
        rewards: ['Couples massage', '4+ nights'],
        image:
          'https://images.unsplash.com/photo-1515378791036-0648a3ef77b2?auto=format&fit=crop&w=1200&q=80',
        listings: [
          {
            id: 'sp-4',
            name: 'Harbor Luxe Apartment',
            location: 'Victoria Island',
            rating: 4.6,
            price: 134000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'sp-5',
            name: 'Skyline Serenity Suite',
            location: 'Ikoyi',
            rating: 4.8,
            price: 168000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=80',
          },
          {
            id: 'sp-6',
            name: 'Golden Palm Residence',
            location: 'Lekki Phase 1',
            rating: 4.7,
            price: 119000,
            priceUnit: 'per night',
            image:
              'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
          },
        ],
      },
    ],
  },
];
