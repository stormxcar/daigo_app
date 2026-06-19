import { supabase } from './supabase';

export async function getAgoraToken(channelName: string, uid: number) {
  const { data, error } = await supabase.functions.invoke('generate-agora-token', {
    body: { channelName, uid },
  });
  if (error) throw error;
  return {
    token: data?.token as string | undefined,
    appId: (data?.appId as string | undefined) ?? process.env.EXPO_PUBLIC_AGORA_APP_ID,
  };
}
