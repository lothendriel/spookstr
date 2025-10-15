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
          'https://files.v0l.io/',
        ],
        signer: user.signer,
      });

      try {
        const tags = await uploader.upload(file);
        console.log('Upload successful! Tags:', tags);
        return tags;
      } catch (error) {
        console.error('Upload failed:', error);
        throw error;
      }
    },
  });
}