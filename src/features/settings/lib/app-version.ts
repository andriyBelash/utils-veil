import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getAppVersion(): string {
  const version = Constants.expoConfig?.version ?? '—';
  const build =
    Platform.OS === 'ios'
      ? Constants.expoConfig?.ios?.buildNumber
      : String(Constants.expoConfig?.android?.versionCode ?? '');
  return build ? `${version} (${build})` : version;
}
