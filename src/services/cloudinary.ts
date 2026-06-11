import { supabase } from './supabase';

export const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'booking_daigo',
};

export function getCloudinaryUploadUrl(resourceType: 'image' | 'video' | 'auto' = 'auto') {
  if (!cloudinaryConfig.cloudName) {
    throw new Error('Missing Cloudinary cloud name');
  }

  return `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;
}

export async function uploadMediaToCloudinary(
  file: Blob | { uri: string; name: string; type: string },
  resourceType: 'image' | 'video' | 'auto' = 'auto'
) {
  const formData = new FormData();
  formData.append('file', file as any);
  formData.append('resource_type', resourceType);

  const { data, error } = await supabase.functions.invoke('upload-cloudinary-media', {
    body: formData,
  });

  if (error) throw error;
  return data as {
    secure_url: string;
    public_id: string;
    resource_type: string;
    width?: number;
    height?: number;
    duration?: number;
  };
}
