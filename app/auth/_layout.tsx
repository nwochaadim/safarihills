import { useFocusEffect } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useCallback } from 'react';

export default function AuthLayout() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const checkToken = async () => {
        const token = await SecureStore.getItemAsync('authToken');
        if (isActive && token) {
          router.replace('/(tabs)/explore');
        }
      };
      void checkToken();
      return () => {
        isActive = false;
      };
    }, [router])
  );

  return <Stack screenOptions={{ headerShown: false }} />;
}
