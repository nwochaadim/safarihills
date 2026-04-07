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

  return {
    routeKey,
    screenClass: routeKey,
    screenName: toAnalyticsScreenName(routeKey),
  };
};
