import { AnalyticsScreenGroup } from '@/lib/analytics.schema';

const DYNAMIC_ROUTE_PATTERNS = [
  { pattern: /^\/booking\/summary\/[^/]+$/, routeKey: '/booking/summary/[id]' },
  { pattern: /^\/booking\/[^/]+$/, routeKey: '/booking/[id]' },
  { pattern: /^\/explore\/[^/]+$/, routeKey: '/explore/[slug]' },
  { pattern: /^\/listing\/[^/]+$/, routeKey: '/listing/[id]' },
  { pattern: /^\/offer-booking\/summary\/[^/]+$/, routeKey: '/offer-booking/summary/[id]' },
  { pattern: /^\/offer-booking\/[^/]+$/, routeKey: '/offer-booking/[listingId]' },
  { pattern: /^\/offers\/[^/]+\/[^/]+\/book$/, routeKey: '/offers/[categoryId]/[offerId]/book' },
  { pattern: /^\/offers\/[^/]+\/[^/]+$/, routeKey: '/offers/[categoryId]/[offerId]' },
  { pattern: /^\/offers\/[^/]+$/, routeKey: '/offers/[categoryId]' },
];

const SCREEN_REGISTRY: Record<
  string,
  {
    screenName: string;
    screenGroup: AnalyticsScreenGroup;
  }
> = {
  '/': {
    screenName: 'root_redirect',
    screenGroup: 'system',
  },
  '/auth/intro': {
    screenName: 'auth_intro',
    screenGroup: 'auth',
  },
  '/auth/login': {
    screenName: 'auth_login',
    screenGroup: 'auth',
  },
  '/auth/sign-up': {
    screenName: 'auth_sign_up',
    screenGroup: 'auth',
  },
  '/auth/otp': {
    screenName: 'auth_otp',
    screenGroup: 'auth',
  },
  '/auth/forgot-password': {
    screenName: 'auth_forgot_password',
    screenGroup: 'auth',
  },
  '/auth/new-password': {
    screenName: 'auth_new_password',
    screenGroup: 'auth',
  },
  '/explore': {
    screenName: 'explore_home',
    screenGroup: 'discovery',
  },
  '/explore/[slug]': {
    screenName: 'explore_section',
    screenGroup: 'discovery',
  },
  '/listing/[id]': {
    screenName: 'listing_detail',
    screenGroup: 'listing',
  },
  '/booking/[id]': {
    screenName: 'booking_create',
    screenGroup: 'booking',
  },
  '/booking/summary/[id]': {
    screenName: 'booking_summary',
    screenGroup: 'booking',
  },
  '/offers': {
    screenName: 'offers_home',
    screenGroup: 'offers',
  },
  '/offers/[categoryId]': {
    screenName: 'offer_category',
    screenGroup: 'offers',
  },
  '/offers/[categoryId]/[offerId]': {
    screenName: 'offer_detail',
    screenGroup: 'offers',
  },
  '/offers/[categoryId]/[offerId]/book': {
    screenName: 'offer_booking_create',
    screenGroup: 'booking',
  },
  '/offer-booking/[listingId]': {
    screenName: 'listing_offer_review',
    screenGroup: 'offers',
  },
  '/offer-booking/summary/[id]': {
    screenName: 'offer_booking_summary',
    screenGroup: 'booking',
  },
  '/bookings': {
    screenName: 'bookings_home',
    screenGroup: 'booking',
  },
  '/profile': {
    screenName: 'profile_home',
    screenGroup: 'profile',
  },
  '/profile/personal-details': {
    screenName: 'profile_personal_details',
    screenGroup: 'profile',
  },
  '/profile/wallet': {
    screenName: 'profile_wallet',
    screenGroup: 'profile',
  },
  '/profile/referrals': {
    screenName: 'profile_referrals',
    screenGroup: 'profile',
  },
  '/profile/rewards': {
    screenName: 'profile_rewards',
    screenGroup: 'profile',
  },
  '/profile/help': {
    screenName: 'profile_help',
    screenGroup: 'support',
  },
  '/profile/faqs': {
    screenName: 'profile_faqs',
    screenGroup: 'support',
  },
  '/profile/terms': {
    screenName: 'profile_terms',
    screenGroup: 'profile',
  },
  '/profile/transactions': {
    screenName: 'profile_transactions',
    screenGroup: 'profile',
  },
};

const normalizeAnalyticsPathname = (pathname: string) => {
  const matchingRoute = DYNAMIC_ROUTE_PATTERNS.find(({ pattern }) => pattern.test(pathname));
  return matchingRoute?.routeKey ?? pathname;
};

const toAnalyticsScreenName = (routeKey: string) => {
  if (routeKey === '/') {
    return 'root';
  }

  return routeKey
    .replace(/^\/+/, '')
    .replace(/\[(.+?)\]/g, '$1')
    .replace(/\//g, '_')
    .replace(/[^A-Za-z0-9_]/g, '_');
};

export const getAnalyticsScreenMetadata = (pathname: string) => {
  const routeKey = normalizeAnalyticsPathname(pathname);
  const registryEntry = SCREEN_REGISTRY[routeKey];
  const fallbackName = toAnalyticsScreenName(routeKey);

  return {
    routeKey,
    screenClass: routeKey,
    screenName: registryEntry?.screenName ?? fallbackName,
    screenGroup: registryEntry?.screenGroup ?? 'system',
  };
};
