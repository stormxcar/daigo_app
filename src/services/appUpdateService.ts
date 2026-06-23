import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';

export interface AppUpdatePolicy {
  platform: 'android' | 'ios';
  enabled: boolean;
  forceUpdate: boolean;
  minVersion: string;
  latestVersion?: string | null;
  minBuildNumber: number;
  latestBuildNumber?: number | null;
  updateUrl?: string | null;
  releaseNotes?: string | null;
}

export interface AppUpdateStatus {
  checked: boolean;
  required: boolean;
  available: boolean;
  currentVersion: string;
  currentBuildNumber: number;
  policy?: AppUpdatePolicy;
}

const DEFAULT_VERSION = '1.0.0';
const DEFAULT_BUILD_NUMBER = 1;

const compareVersions = (left: string, right: string) => {
  const leftParts = left.split('.').map((part) => Number(part) || 0);
  const rightParts = right.split('.').map((part) => Number(part) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
};

const getCurrentVersion = () => Constants.expoConfig?.version ?? DEFAULT_VERSION;

const getCurrentBuildNumber = () => {
  const androidVersionCode = Constants.expoConfig?.android?.versionCode;
  if (typeof androidVersionCode === 'number') return androidVersionCode;

  const nativeBuildVersion = Number(Constants.nativeBuildVersion);
  return Number.isFinite(nativeBuildVersion) && nativeBuildVersion > 0 ? nativeBuildVersion : DEFAULT_BUILD_NUMBER;
};

const mapPolicy = (row: any): AppUpdatePolicy => ({
  platform: row.platform,
  enabled: !!row.enabled,
  forceUpdate: !!row.force_update,
  minVersion: row.min_version ?? DEFAULT_VERSION,
  latestVersion: row.latest_version,
  minBuildNumber: Number(row.min_build_number ?? DEFAULT_BUILD_NUMBER),
  latestBuildNumber: row.latest_build_number === null ? null : Number(row.latest_build_number),
  updateUrl: row.update_url,
  releaseNotes: row.release_notes,
});

const buildStatus = (policy?: AppUpdatePolicy): AppUpdateStatus => {
  const currentVersion = getCurrentVersion();
  const currentBuildNumber = getCurrentBuildNumber();

  if (!policy) {
    return {
      checked: true,
      required: false,
      available: false,
      currentVersion,
      currentBuildNumber,
    };
  }

  const belowMinimumVersion = compareVersions(currentVersion, policy.minVersion) < 0;
  const belowMinimumBuild = currentBuildNumber < policy.minBuildNumber;
  const belowLatestVersion = policy.latestVersion ? compareVersions(currentVersion, policy.latestVersion) < 0 : false;
  const belowLatestBuild = typeof policy.latestBuildNumber === 'number' && currentBuildNumber < policy.latestBuildNumber;

  return {
    checked: true,
    required: policy.forceUpdate || belowMinimumVersion || belowMinimumBuild,
    available: belowLatestVersion || belowLatestBuild,
    currentVersion,
    currentBuildNumber,
    policy,
  };
};

export const appUpdateService = {
  async checkUpdatePolicy(): Promise<AppUpdateStatus> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
      return buildStatus();
    }

    try {
      const { data, error } = await supabase
        .from('app_update_policies')
        .select('platform, enabled, force_update, min_version, latest_version, min_build_number, latest_build_number, update_url, release_notes')
        .eq('platform', Platform.OS)
        .eq('enabled', true)
        .maybeSingle();

      if (error) {
        if (__DEV__ && error.code !== 'PGRST205') console.warn('[DAIGO_UPDATE_POLICY_ERROR]', error);
        return buildStatus();
      }

      return buildStatus(data ? mapPolicy(data) : undefined);
    } catch (error) {
      if (__DEV__) console.warn('[DAIGO_UPDATE_POLICY_FETCH_FAILED]', error);
      return buildStatus();
    }
  },
};
