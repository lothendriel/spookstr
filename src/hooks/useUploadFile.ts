import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";

export function useUploadFile() {
  const { user } = useCurrentUser();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      console.log('Starting upload for file:', file.name, file.type, file.size);
      
      const uploader = new BlossomUploader({
        servers: [
          'https://blossom.primal.net/',
        ],
        signer: user.signer,
      });

      try {
        const tags = await uploader.upload(file);
        console.log('Upload successful! Tags:', tags);
        console.log('Tags expanded:', JSON.stringify(tags, null, 2));
        
        // Log each tag individually
        if (Array.isArray(tags)) {
          tags.forEach((tag, index) => {
            console.log(`Tag ${index + 1}:`, tag);
          });
        }
        
        return tags;
      } catch (error) {
        console.error('Upload failed:', error);
        throw error;
      }
    },
  });
}