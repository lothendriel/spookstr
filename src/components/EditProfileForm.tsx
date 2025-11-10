import React, { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, AlertTriangle } from 'lucide-react';
import { NSchema as n, type NostrMetadata } from '@nostrify/nostrify';
import { useQueryClient } from '@tanstack/react-query';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditProfileFormProps {
  onSuccess?: () => void;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({ onSuccess }) => {
  const queryClient = useQueryClient();

  const { user, metadata } = useCurrentUser();
  const { mutateAsync: publishEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  // Initialize the form with default values
  const form = useForm<NostrMetadata>({
    resolver: zodResolver(n.metadata()),
    defaultValues: {
      name: '',
      display_name: '',
      about: '',
      picture: '',
      banner: '',
      website: '',
      nip05: '',
      lud16: '',
      lud06: '',
      bot: false,
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (metadata) {
      form.reset({
        name: metadata.name || '',
        display_name: metadata.display_name || '',
        about: metadata.about || '',
        picture: metadata.picture || '',
        banner: metadata.banner || '',
        website: metadata.website || '',
        nip05: metadata.nip05 || '',
        lud16: metadata.lud16 || '',
        lud06: metadata.lud06 || '',
        bot: metadata.bot || false,
      });
    }
  }, [metadata, form]);

  // Handle file uploads for profile picture and banner
  const uploadPicture = async (file: File, field: 'picture' | 'banner') => {
    try {
      // The first tuple in the array contains the URL
      const [[_, url]] = await uploadFile(file);
      form.setValue(field, url);
      toast({
        title: 'Success',
        description: `${field === 'picture' ? 'Profile picture' : 'Banner'} uploaded successfully`,
      });
    } catch (error) {
      console.error(`Failed to upload ${field}:`, error);
      toast({
        title: 'Error',
        description: `Failed to upload ${field === 'picture' ? 'profile picture' : 'banner'}. Please try again.`,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (values: NostrMetadata) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Combine existing metadata with new values, preserving existing data
      const data = { ...metadata, ...values };

      // Validate URLs carefully
      const urlFields = ['picture', 'banner', 'website'];
      for (const field of urlFields) {
        if (data[field] && data[field] !== '') {
          try {
            // Basic URL validation
            new URL(data[field]);
          } catch {
            // If URL is invalid, revert to existing value or remove if no existing value
            if (metadata && metadata[field as keyof NostrMetadata]) {
              data[field] = metadata[field as keyof NostrMetadata] as string;
              toast({
                title: 'Warning',
                description: `Invalid ${field} URL. Keeping previous value.`,
                variant: 'default',
              });
            } else {
              delete data[field];
              toast({
                title: 'Warning',
                description: `Invalid ${field} URL. Field removed.`,
                variant: 'default',
              });
            }
          }
        }
      }

      // Validate NIP-05 format (basic check)
      if (data.nip05 && data.nip05 !== '') {
        if (!data.nip05.includes('@') && !data.nip05.includes('_')) {
          // Invalid NIP-05 format, revert or remove
          if (metadata && metadata.nip05) {
            data.nip05 = metadata.nip05;
            toast({
              title: 'Warning',
              description: 'Invalid NIP-05 format. Keeping previous value.',
              variant: 'default',
            });
          } else {
            delete data.nip05;
            toast({
              title: 'Warning',
              description: 'Invalid NIP-05 format. Field removed.',
              variant: 'default',
            });
          }
        }
      }

      // Validate Lightning addresses
      const lightningFields = ['lud16', 'lud06'];
      for (const field of lightningFields) {
        if (data[field] && data[field] !== '') {
          if (!data[field].includes('@') && !data[field].startsWith('lnurl')) {
            // Invalid Lightning address format
            if (metadata && metadata[field as keyof NostrMetadata]) {
              data[field] = metadata[field as keyof NostrMetadata] as string;
              toast({
                title: 'Warning',
                description: `Invalid ${field} format. Keeping previous value.`,
                variant: 'default',
              });
            } else {
              delete data[field];
              toast({
                title: 'Warning',
                description: `Invalid ${field} format. Field removed.`,
                variant: 'default',
              });
            }
          }
        }
      }

      // Clean up empty values (undefined, empty string, null)
      for (const key in data) {
        if (data[key] === '' || data[key] === null || data[key] === undefined) {
          delete data[key];
        }
      }

      // Ensure we have at least some basic data
      if (Object.keys(data).length === 0) {
        toast({
          title: 'Error',
          description: 'Profile cannot be completely empty. Please provide at least some information.',
          variant: 'destructive',
        });
        return;
      }

      // Validate JSON serialization
      let content;
      try {
        content = JSON.stringify(data);
        // Test parse to ensure valid JSON
        JSON.parse(content);
      } catch (jsonError) {
        console.error('JSON serialization error:', jsonError);
        toast({
          title: 'Error',
          description: 'Failed to serialize profile data. Please check your input.',
          variant: 'destructive',
        });
        return;
      }

      // Publish the metadata event (kind 0)
      await publishEvent({
        event: {
          kind: 0,
          content: content,
        }
      });

      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['logins'] });
      queryClient.invalidateQueries({ queryKey: ['author', user.pubkey] });

      toast({
        title: 'Success',
        description: 'Your profile has been updated safely',
      });

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update your profile. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Safety Warning */}
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-400/90 text-sm">
            <strong>Safety First:</strong> All fields are validated automatically.
            Invalid URLs, NIP-05 identifiers, or Lightning addresses will be reverted to your previous values
            or removed to prevent breaking your profile. You can safely experiment!
          </AlertDescription>
        </Alert>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormDescription>
                This is your primary name that will be displayed to others.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="display_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display Name</FormLabel>
              <FormControl>
                <Input placeholder="Alternative display name" {...field} />
              </FormControl>
              <FormDescription>
                An alternative, bigger name with richer characters. Your main name will always be shown regardless.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio</FormLabel>
              <FormControl>
                <MentionTextarea
                  placeholder="Tell others about yourself... (Type @ to mention someone or 😀 for emojis)"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                A short description about yourself. You can use emojis and mention other users.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="picture"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                label="Profile Picture"
                placeholder="https://example.com/profile.jpg"
                description="URL to your profile picture. You can upload an image or provide a URL."
                previewType="square"
                onUpload={(file) => uploadPicture(file, 'picture')}
              />
            )}
          />

          <FormField
            control={form.control}
            name="banner"
            render={({ field }) => (
              <ImageUploadField
                field={field}
                label="Banner Image"
                placeholder="https://example.com/banner.jpg"
                description="URL to a wide banner image for your profile. You can upload an image or provide a URL."
                previewType="wide"
                onUpload={(file) => uploadPicture(file, 'banner')}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="website"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Website</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourwebsite.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your personal website or social media link.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="nip05"
            render={({ field }) => (
              <FormItem>
                <FormLabel>NIP-05 Identifier</FormLabel>
                <FormControl>
                  <Input placeholder="you@example.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your verified Nostr identifier.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="lud16"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lightning Address (LUD-16)</FormLabel>
                <FormControl>
                  <Input placeholder="name@domain.com" {...field} />
                </FormControl>
                <FormDescription>
                  Your Lightning Network address for receiving zaps (preferred format).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lud06"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lightning Address (LUD-06)</FormLabel>
                <FormControl>
                  <Input placeholder="lnurl..." {...field} />
                </FormControl>
                <FormDescription>
                  Alternative Lightning Network address (LNURL format).
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="bot"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Bot Account</FormLabel>
                <FormDescription>
                  Mark this account as automated or a bot.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full md:w-auto"
          disabled={isPending || isUploading}
        >
          {(isPending || isUploading) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Profile
        </Button>
      </form>
    </Form>
  );
};

// Reusable component for image upload fields
interface ImageUploadFieldProps {
  field: {
    value: string | undefined;
    onChange: (value: string) => void;
    name: string;
    onBlur: () => void;
  };
  label: string;
  placeholder: string;
  description: string;
  previewType: 'square' | 'wide';
  onUpload: (file: File) => void;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  field,
  label,
  placeholder,
  description,
  previewType,
  onUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      <div className="flex flex-col gap-2">
        <FormControl>
          <Input
            placeholder={placeholder}
            name={field.name}
            value={field.value ?? ''}
            onChange={e => field.onChange(e.target.value)}
            onBlur={field.onBlur}
          />
        </FormControl>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUpload(file);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
          {field.value && (
            <div className={`h-10 ${previewType === 'square' ? 'w-10' : 'w-24'} rounded overflow-hidden`}>
              <img
                src={field.value}
                alt={`${label} preview`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </div>
      <FormDescription>
        {description}
      </FormDescription>
      <FormMessage />
    </FormItem>
  );
};
