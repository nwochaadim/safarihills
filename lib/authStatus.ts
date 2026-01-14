import * as SecureStore from 'expo-secure-store';

export class AuthStatus {
  static async isSignedIn(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      return Boolean(token);
    } catch {
      return false;
    }
  }
}
