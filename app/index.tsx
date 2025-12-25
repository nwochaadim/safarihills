import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect } from "react";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const checkToken = async () => {
      const token = await SecureStore.getItemAsync("authToken");
      if (token) {
        router.replace("/auth/intro");
        return;
      }
      router.replace("/auth/intro");
    };

    void checkToken();
  }, [router]);

  return null;
}
