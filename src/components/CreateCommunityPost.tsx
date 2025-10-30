import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { extractMentions } from '@/lib/mentions';
import { Users, Send, Upload, Image, Video, Music, X, RadioTower } from 'lucide-react';
import { CommunityDefinition } from '@/hooks/useCommunity';

const PARANORMAL_TAGS = [
  'paranormal',
  'cryptids',
  'bigfoot',
  'ufo',
  'ufos',
  'supernatural',
  'ghosts',
  'aliens',
  'conspiracy',
  'unexplained',
  'mysterious',
  'occult',
  'haunted',
  'sightings',
  'extraterrestrial'
];

interface CreateCommunityPostProps {
  community: CommunityDefinition;
  parentPost?: {
    id: string;
    pubkey: string;
    kind: number;
  };
  onSuccess?: () => void;
}

export function CreateCommunityPost({ community, parentPost, onSuccess }: CreateCommunityPostProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{tags: string[]; file: File}>>([]);
  const [postToSpookstr2Only, setPostToSpookstr2Only] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReply = !!parentPost;

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log('🚀 Starting upload for file:', file.name, file.type, file.size);
        const tags = await uploadFile(file);
        console.log('✅ Upload completed for:', file.name, 'Tags:', tags);

        // Ensure tags is an array before storing
        const fileTags = Array.isArray(tags) ? tags : [];

        // Extract URL from tags for inserting into content
        const urlTag = fileTags.find(tag => tag[0] === 'url');
        const fileUrl = urlTag ? urlTag[1] : '';

        if (fileUrl) {
          console.log('🔗 Found file URL:', fileUrl);

          // Insert URL into content textarea
          const newContent = content.trim() ?
            `${content}\n\n${fileUrl}` :
            fileUrl;

          setContent(newContent);

          toast({
            title: 'File uploaded',
            description: `${file.name} uploaded successfully and added to post`,
          });
        } else {
          console.warn('⚠️ No URL found in file tags');
          toast({
            title: 'Upload warning',
            description: `${file.name} uploaded but URL not found`,
            variant: 'destructive',
          });
        }

        setUploadedFiles(prev => [...prev, { tags: fileTags, file }]);
      } catch (error) {
        console.error('❌ Failed to upload file:', error);
        toast({
          title: 'Upload failed',
          description: `Failed to upload ${file.name}. Please try again.`,
          variant: 'destructive',
        });
      }
    }
    // Reset file input
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    // Prevent double submission
    if (!user || !content.trim() || isSubmitting) return;

    setIsSubmitting(true);

    // Build community tag according to NIP-72
    const communityTag = `34550:${community.author}:${community.id}`;
    
    // Start with basic tags
    const tags = [];

    // NIP-72 Community tagging (always required for community posts)
    if (isReply && parentPost) {
      // Reply structure according to NIP-22 + NIP-72
      // Uppercase tags refer to root community scope
      tags.push(['A', communityTag]); // Community reference (root scope)
      tags.push(['P', community.author]); // Community author (root scope)  
      tags.push(['K', '34550']); // Community definition kind (root scope)
      
      // Lowercase tags refer to immediate parent
      tags.push(['e', parentPost.id]); // Parent post ID
      tags.push(['p', parentPost.pubkey]); // Parent post author
      tags.push(['k', parentPost.kind.toString()]); // Parent post kind
    } else {
      // Top-level community post structure according to NIP-72
      tags.push(['A', communityTag]); // Community reference (root scope)
      tags.push(['a', communityTag]); // Community reference (immediate parent - same as root for top-level)
      tags.push(['P', community.author]); // Community author (root scope)
      tags.push(['p', community.author]); // Community author (immediate parent - same as root for top-level)
      tags.push(['K', '34550']); // Community definition kind (root scope)
      tags.push(['k', '34550']); // Community definition kind (immediate parent - same as root for top-level)
    }

    // Add hashtags
    selectedTags.forEach(tag => {
      tags.push(['t', tag]);
    });

    // Add mention tags (p tags for mentioned users)
    const mentionTags = extractMentions(content.trim());
    tags.push(...mentionTags);

    // Add uploaded file tags (NIP-94)
    console.log('=== COMMUNITY POST SUBMISSION ===');
    console.log('Community:', community.name, communityTag);
    console.log('Is reply:', isReply);
    console.log('Parent post:', parentPost);
    console.log('Content:', content.trim());
    console.log('Selected tags:', selectedTags);
    console.log('Mention tags:', mentionTags);
    console.log('Uploaded files:', uploadedFiles);

    uploadedFiles.forEach((uploadedFile, index) => {
      console.log(`File ${index + 1}:`, {
        fileName: uploadedFile.file.name,
        fileSize: uploadedFile.file.size,
        fileType: uploadedFile.file.type,
        tags: uploadedFile.tags
      });
      tags.push(...uploadedFile.tags);
    });

    console.log('📋 Final community post event structure:', {
      kind: 1111, // NIP-22 kind for community posts
      content: content.trim(),
      tags: tags
    });

    // Generate timestamp for better duplicate detection
    const created_at = Math.floor(Date.now() / 1000);

    createEvent({
      event: {
        kind: 1111, // NIP-22 kind for community posts
        content: content.trim(),
        tags,
        created_at,
      },
      options: postToSpookstr2Only ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
    }, {
      onSuccess: () => {
        // Reset form state
        setContent('');
        setSelectedTags([]);
        setUploadedFiles([]);
        setPostToSpookstr2Only(false);
        setIsSubmitting(false);

        toast({
          title: isReply ? 'Reply Posted' : 'Post Created',
          description: `Your ${isReply ? 'reply' : 'post'} has been submitted to ${community.name} for moderation.`,
        });

        // Call the success callback to close the modal
        if (onSuccess) {
          onSuccess();
        }
      },
      onError: () => {
        // Re-enable form on error
        setIsSubmitting(false);
      }
    });
  };

  if (!user) {
    return (
      <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-purple-500/60 mx-auto mb-4" />
          <p className="text-purple-400">You must be logged in to post to this community.</p>
        </CardContent>
      </Card>
    );
  }

  // Combined disabled state
  const formDisabled = isSubmitting || isUploading;

  return (
    <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-purple-400 flex items-center space-x-2">
          <Users className="h-5 w-5" />
          <span>
            {isReply ? `Reply to Post in ${community.name}` : `Post to ${community.name}`}
          </span>
        </CardTitle>
        {isReply && (
          <p className="text-sm text-purple-500/60">
            Replying to a post in this community
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <MentionTextarea
          placeholder={
            isReply 
              ? "Share your thoughts on this post... (Type @ to mention someone)"
              : "Share your paranormal experience with the community... (Type @ to mention someone)"
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-black/20 border-purple-500/30 text-purple-100 placeholder:text-purple-500/50 resize-none"
          rows={4}
          disabled={formDisabled}
        />

        {/* File Upload Section */}
        <div>
          <p className="text-sm text-purple-500/80 mb-2">
            Attach media (images, videos, audio):
          </p>

          {/* File Upload Button */}
          <div className="mb-3">
            <input
              type="file"
              id="community-media-upload"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={formDisabled}
            />
            <label
              htmlFor="community-media-upload"
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium cursor-pointer transition-colors ${
                formDisabled
                  ? 'border-purple-500/30 text-purple-500/50 cursor-not-allowed'
                  : 'border-purple-500/50 text-purple-400 hover:border-purple-400 hover:text-purple-300'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Choose Files'}
            </label>
          </div>

          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-purple-500/60">
                {uploadedFiles.length} file{uploadedFiles.length === 1 ? '' : 's'} uploaded
              </p>
              <div className="grid grid-cols-2 gap-2">
                {uploadedFiles.map((uploadedFile, index) => {
                  const { file, tags } = uploadedFile;
                  const isImage = file.type.startsWith('image/');
                  const isVideo = file.type.startsWith('video/');
                  const isAudio = file.type.startsWith('audio/');

                  // Extract URL from tags (NIP-94 format)
                  const urlTag = tags && Array.isArray(tags) ? tags.find(tag => tag[0] === 'url') : undefined;
                  const url = urlTag ? urlTag[1] : '';

                  return (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-black/20 border border-purple-500/20 rounded-lg overflow-hidden">
                        {isImage && url && (
                          <img
                            src={url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {isVideo && (
                          <div className="w-full h-full flex items-center justify-center bg-black/40">
                            <Video className="h-8 w-8 text-purple-400" />
                          </div>
                        )}
                        {isAudio && (
                          <div className="w-full h-full flex items-center justify-center bg-black/40">
                            <Music className="h-8 w-8 text-purple-400" />
                          </div>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-400 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {/* File Name */}
                      <p className="text-xs text-purple-500/60 truncate mt-1" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Spookstr2 Relay Option */}
        <div className="flex items-start space-x-3 p-4 border border-purple-500/20 rounded-lg bg-black/10">
          <div className="flex items-center h-5">
            <Checkbox
              id="community-spookstr2-only"
              checked={postToSpookstr2Only}
              onCheckedChange={(checked) => setPostToSpookstr2Only(checked as boolean)}
              className="border-purple-500/50 data-[state=checked]:bg-purple-500 data-[state=checked]:border-purple-500"
              disabled={formDisabled}
            />
          </div>
          <div className="flex-1 space-y-1">
            <label htmlFor="community-spookstr2-only" className="text-sm font-medium text-purple-300 cursor-pointer flex items-center gap-2">
              <RadioTower className="h-4 w-4" />
              Post to Spookstr2 Relay Only
            </label>
            <p className="text-xs text-purple-500/60">
              When checked, your post will only be published to the Spookstr2 relay. Uncheck to publish to all relays.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-purple-500/80 mb-2">
            Select paranormal categories (optional):
          </p>
          <div className="flex flex-wrap gap-2">
            {PARANORMAL_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={`transition-all ${
                  formDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                } ${
                  selectedTags.includes(tag)
                    ? "bg-purple-500 text-black border-purple-500"
                    : "border-purple-500/50 text-purple-400 hover:border-purple-400 hover:text-purple-300"
                }`}
                onClick={() => !formDisabled && handleTagToggle(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>

          <div className="mt-3">
            <p className="text-xs text-purple-500/60 text-center mb-2">
              {selectedTags.length > 0
                ? `${selectedTags.length} categor${selectedTags.length === 1 ? 'y' : 'ies'} selected`
                : 'Categories are optional for community posts'
              }
            </p>

            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || formDisabled}
              className="bg-purple-500 hover:bg-purple-400 text-black font-semibold w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              {formDisabled ? (isReply ? 'Posting Reply...' : 'Posting...') : (isReply ? 'Post Reply' : 'Post to Community')}
            </Button>

            <p className="text-xs text-purple-500/60 text-center mt-2">
              Posts to moderated communities require approval before being visible to other members.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}