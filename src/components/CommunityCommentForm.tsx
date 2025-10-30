import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MentionTextarea } from '@/components/ui/mention-textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { extractMentions } from '@/lib/mentions';
import { LoginArea } from '@/components/auth/LoginArea';
import { NostrEvent } from '@nostrify/nostrify';
import { MessageSquare, Send, Reply, Upload, Video, Music, X } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';
import { genUserName } from '@/lib/genUserName';
import { CommunityDefinition } from '@/hooks/useCommunity';

interface CommunityCommentFormProps {
  community: CommunityDefinition;
  rootPost: NostrEvent;
  parentComment?: NostrEvent;
  onSuccess?: () => void;
  placeholder?: string;
  compact?: boolean;
}

/**
 * NIP-22 + NIP-72 compliant comment form for community posts
 * Handles proper uppercase/lowercase tag structure for community replies
 */
export function CommunityCommentForm({
  community,
  rootPost,
  parentComment,
  onSuccess,
  placeholder = "Write a comment...",
  compact = false
}: CommunityCommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{tags: string[]; file: File}>>([]);
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  // Auto-add mention when replying to a comment
  useEffect(() => {
    if (parentComment) {
      const npub = nip19.npubEncode(parentComment.pubkey);
      const mention = `nostr:${npub}`;
      setContent(`${mention} `);
    } else {
      setContent('');
    }
    // Clear uploaded files when parent changes
    setUploadedFiles([]);
  }, [parentComment]);

  // Get parent comment author info for display
  const parentAuthor = parentComment ? useAuthor(parentComment.pubkey) : null;
  const parentMetadata = parentAuthor?.data?.metadata;
  const parentDisplayName = parentMetadata?.name ?? (parentComment ? genUserName(parentComment.pubkey) : '');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const tags = await uploadFile(file);
        const fileTags = Array.isArray(tags) ? tags : [];

        // Extract URL from tags for inserting into content
        const urlTag = fileTags.find(tag => tag[0] === 'url');
        const fileUrl = urlTag ? urlTag[1] : '';

        if (fileUrl) {
          const newContent = content.trim() ? `${content}\n\n${fileUrl}` : fileUrl;
          setContent(newContent);
          
          toast({
            title: 'File uploaded',
            description: `${file.name} uploaded successfully and added to comment`,
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
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      const fileToRemove = prev[index];
      const urlTag = fileToRemove.tags.find(tag => tag[0] === 'url');
      if (urlTag && urlTag[1]) {
        const urlToRemove = urlTag[1];
        setContent(prevContent =>
          prevContent.replace(new RegExp(`\\n*${urlToRemove.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n*`, 'g'), '')
            .trim()
        );
      }
      return newFiles;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);

    const communityTag = `34550:${community.author}:${community.id}`;
    
    // Build tags according to NIP-22 + NIP-72
    const tags = [];

    // NIP-22: Uppercase tags refer to root scope (community + original post)
    tags.push(['A', communityTag]); // Community reference (root scope)
    tags.push(['E', rootPost.id]); // Root post ID (root scope)
    tags.push(['P', community.author]); // Community author (root scope)
    tags.push(['K', '34550']); // Community definition kind (root scope)

    if (parentComment) {
      // Reply to a comment: lowercase tags refer to immediate parent (the comment)
      tags.push(['e', parentComment.id]); // Parent comment ID
      tags.push(['p', parentComment.pubkey]); // Parent comment author
      tags.push(['k', parentComment.kind.toString()]); // Parent comment kind
    } else {
      // Reply to the root post: lowercase tags refer to immediate parent (the post)
      tags.push(['e', rootPost.id]); // Parent post ID
      tags.push(['p', rootPost.pubkey]); // Parent post author
      tags.push(['k', rootPost.kind.toString()]); // Parent post kind
    }

    // Add mention tags from content
    const mentionTags = extractMentions(content.trim());
    tags.push(...mentionTags);

    // Add uploaded file tags (NIP-94)
    uploadedFiles.forEach(uploadedFile => {
      tags.push(...uploadedFile.tags);
    });

    console.log('=== COMMUNITY COMMENT SUBMISSION ===');
    console.log('Community:', community.name, communityTag);
    console.log('Root post:', rootPost.id);
    console.log('Parent comment:', parentComment?.id || 'none');
    console.log('Content:', content.trim());
    console.log('Final tags:', tags);

    createEvent({
      event: {
        kind: 1111, // NIP-22 kind for community comments
        content: content.trim(),
        tags,
        created_at: Math.floor(Date.now() / 1000),
      }
    }, {
      onSuccess: () => {
        // Reset form state
        setContent(parentComment ? `nostr:${nip19.npubEncode(parentComment.pubkey)} ` : '');
        setUploadedFiles([]);
        setIsSubmitting(false);

        toast({
          title: 'Comment Posted',
          description: 'Your comment has been submitted to the community for moderation.',
        });

        onSuccess?.();
      },
      onError: (error) => {
        console.error('Failed to post community comment:', error);
        setIsSubmitting(false);
      },
    });
  };

  if (!user) {
    return (
      <Card className={compact ? "border-dashed" : ""}>
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <MessageSquare className="h-5 w-5" />
              <span>Sign in to {parentComment ? 'reply' : 'comment'}</span>
            </div>
            <LoginArea />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formDisabled = isSubmitting || isUploading;

  return (
    <Card className={compact ? "border-dashed" : ""}>
      <CardContent className={compact ? "p-4" : "p-6"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reply context */}
          {parentComment && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Reply className="h-4 w-4" />
              <span>Replying to </span>
              <span className="font-medium">
                {parentDisplayName}
              </span>
            </div>
          )}

          <MentionTextarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={parentComment ? "Type your reply after the mention... (Type @ to mention others)" : `${placeholder} (Type @ to mention someone)`}
            className={compact ? "min-h-[80px]" : "min-h-[100px]"}
            disabled={formDisabled}
          />

          {/* File Upload Section */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {uploadedFiles.length} file{uploadedFiles.length === 1 ? '' : 's'} attached
              </p>
              <div className="grid grid-cols-3 gap-2">
                {uploadedFiles.map((uploadedFile, index) => {
                  const { file, tags } = uploadedFile;
                  const isImage = file.type.startsWith('image/');
                  const isVideo = file.type.startsWith('video/');
                  const isAudio = file.type.startsWith('audio/');

                  const urlTag = tags && Array.isArray(tags) ? tags.find(tag => tag[0] === 'url') : undefined;
                  const url = urlTag ? urlTag[1] : '';

                  return (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-muted border rounded-lg overflow-hidden">
                        {isImage && url && (
                          <img
                            src={url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {isVideo && (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Video className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        {isAudio && (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Music className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      <p className="text-xs text-muted-foreground truncate mt-1" title={file.name}>
                        {file.name}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {/* File Upload Button */}
              <input
                type="file"
                id={`community-comment-media-upload-${parentComment?.id || 'root'}`}
                multiple
                accept="image/*,video/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={formDisabled}
              />
              <label
                htmlFor={`community-comment-media-upload-${parentComment?.id || 'root'}`}
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 px-3 ${
                  formDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-accent hover:text-accent-foreground'
                }`}
                title="Attach media"
              >
                <Upload className="h-4 w-4" />
              </label>
              <span className="text-sm text-muted-foreground">
                {parentComment ? 'Replying to comment' : 'Commenting on post'}
              </span>
            </div>
            <Button
              type="submit"
              disabled={!content.trim() || formDisabled}
              size={compact ? "sm" : "default"}
              className="bg-purple-500 hover:bg-purple-400 text-black"
            >
              <Send className="h-4 w-4 mr-2" />
              {formDisabled ? (isUploading ? 'Uploading...' : 'Posting...') : (parentComment ? 'Reply' : 'Comment')}
            </Button>
          </div>

          <p className="text-xs text-purple-500/60 text-center">
            Comments in moderated communities require approval before being visible to other members.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}