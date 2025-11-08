import { useMutation } from "@tanstack/react-query";
import { BlossomUploader } from '@nostrify/nostrify/uploaders';

import { useCurrentUser } from "./useCurrentUser";
import { useAppContext } from "./useAppContext";
import {
  handleNostrError,
  shouldRetryError,
  getRetryDelay,
  createMutationErrorHandler,
  logError
} from "@/lib/errorHandling";

export function useUploadFile() {
  const { user } = useCurrentUser();
  const { config } = useAppContext();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) {
        const appError = handleNostrError(
          new Error('User is not logged in'),
          "uploading file"
        );
        logError(appError, "User authentication check");
        throw appError;
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
        const appError = handleNostrError(error, "uploading file");
        logError(appError, "File upload");
        throw appError;
      }
    },
    retry: (failureCount, error) => {
      return shouldRetryError(failureCount, error);
    },
    retryDelay: (failureCount) => getRetryDelay(failureCount),
    onError: createMutationErrorHandler("uploading file"),
  });
}