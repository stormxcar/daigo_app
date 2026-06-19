import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { RtcRole, RtcTokenBuilder } from 'npm:agora-token@2.0.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');
    if (!appId) throw new Error('Missing AGORA_APP_ID');

    const { channelName, uid } = await req.json();
    if (!channelName || typeof uid !== 'number') {
      throw new Error('channelName and numeric uid are required');
    }

    if (!appCertificate) {
      return new Response(JSON.stringify({ appId, token: null }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const expireSeconds = 60 * 60;
    const privilegeExpiredTs = Math.floor(Date.now() / 1000) + expireSeconds;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    return new Response(JSON.stringify({ appId, token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
