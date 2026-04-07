import {
  AnalyticsContextParams,
  AnalyticsEventName,
  AnalyticsEventParams,
  AnalyticsLeadTemperature,
  AnalyticsUserProperties,
} from '@/lib/analytics.schema';

const emptyContext: AnalyticsContextParams & {
  lead_temperature: AnalyticsLeadTemperature;
} = {
  actor_type: 'guest',
  analytics_actor_id: 'guest_web',
  auth_state: 'guest',
  session_id: 'web_session',
  lead_temperature: 'cold',
};

export const initializeAnalytics = async () => emptyContext;
export const initializeAnalyticsIdentity = async () => emptyContext;
export const initializeGuestSession = async () => emptyContext;
export const setAuthenticatedUser = async (_userId: string) => emptyContext;
export const completeAuthentication = async () => emptyContext;
export const clearAuthenticatedUser = async () => emptyContext;
export const setUserProperties = async (_properties: AnalyticsUserProperties) => {};
export const setUserId = async (_userId: string | null) => {};
export const getAnalyticsContext = () => emptyContext;
export const subscribeAnalyticsContext = () => () => {};
export const trackScreen = async (_pathname: string) => {};
export const trackEvent = async <TEventName extends AnalyticsEventName>(
  _eventName: TEventName,
  _params: AnalyticsEventParams<TEventName>
) => {};
