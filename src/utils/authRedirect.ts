import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';

export const AUTH_CALLBACK_PATH = 'auth/callback';
export const AUTH_SCHEME = 'daigobooking';

const normalizePath = (path: string) => path.replace(/^\/+/, '');

export function getAuthRedirectUri(path = AUTH_CALLBACK_PATH) {
  return makeRedirectUri({
    scheme: AUTH_SCHEME,
    path: normalizePath(path),
    native: `${AUTH_SCHEME}:///${normalizePath(path)}`,
    isTripleSlashed: true,
  });
}

export function getExpoGoAuthRedirectPattern() {
  return Linking.createURL(AUTH_CALLBACK_PATH);
}
