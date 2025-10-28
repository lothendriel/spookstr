import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useAppContext } from "./useAppContext";

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        throw new Error('Must be logged in to upload files');
      }

      console.log('Starting upload for file:', file.name, file.type, file.size);

      // Use configured Blossom servers with fallbacks
      const blossomServers = config.blossomServers && config.blossomServers.length > 0
        ? config.blossomServers
        : ['https://blossom.primal.net', 'https://cdn.satellite.earth'];

      const uploader = new BlossomUploader({
        servers: blossomServers,
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