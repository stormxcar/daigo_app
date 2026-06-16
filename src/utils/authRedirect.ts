import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

export const AUTH_CALLBACK_PATH = 'auth/callback';

export function getAuthRedirectUri(path = AUTH_CALLBACK_PATH) {
  if (Constants.appOwnership === 'expo') {
    return Linking.createURL(path);
  }

  return makeRedirectUri({
    scheme: 'daigobooking',
    path,
  });
}
