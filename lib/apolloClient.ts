import { ApolloClient, HttpLink, InMemoryCache, from } from '@apollo/client';
import { loadDevMessages, loadErrorMessages } from '@apollo/client/dev';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Alert } from 'react-native';

const GRAPHQL_URL = process.env.EXPO_PUBLIC_GRAPHQL_URL ?? 'http://localhost:3000/graphql';

if (__DEV__) {
  loadDevMessages();
  loadErrorMessages();
}

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
});

let lastUnauthorizedAt = 0;

const handleUnauthorized = async () => {
  const now = Date.now();
  if (now - lastUnauthorizedAt < 2000) return;
  lastUnauthorizedAt = now;
  Alert.alert('Unauthorised', 'Your session has expired. Please log in again.');
  await SecureStore.deleteItemAsync('authToken');
  router.replace('/auth/login');
};

const errorLink = onError(({ graphQLErrors, networkError }) => {
  const isGraphqlUnauthorized = graphQLErrors?.some(
    (error) => error.extensions?.code === 'UNAUTHENTICATED'
  );
  const statusCode = (networkError as { statusCode?: number })?.statusCode;
  if (isGraphqlUnauthorized || statusCode === 401) {
    void handleUnauthorized();
  }
});

const authLink = setContext(async (_, { headers }) => {
  const token = await SecureStore.getItemAsync('authToken');
  return {
    headers: {
      ...headers,
      Authorization: token ? `Bearer ${token}` : '',
    },
  };
});

const stripCanonizeResults = <T extends Record<string, unknown> | undefined>(options: T): T => {
  if (!options || typeof options !== 'object') return options;
  if (!('canonizeResults' in options)) return options;
  const cleaned = { ...(options as Record<string, unknown>) };
  delete cleaned.canonizeResults;
  return cleaned as T;
};

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

if (__DEV__) {
  const cache = apolloClient.cache as InMemoryCache;
  const originalDiff = cache.diff.bind(cache);
  cache.diff = (options) => {
    return originalDiff(stripCanonizeResults(options as Record<string, unknown>));
  };

  const originalWatchQuery = apolloClient.watchQuery.bind(apolloClient);
  apolloClient.watchQuery = ((options) => {
    return originalWatchQuery(stripCanonizeResults(options as Record<string, unknown>));
  }) as typeof apolloClient.watchQuery;
}
