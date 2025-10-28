import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePostComment } from '@/hooks/usePostComment';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { LoginArea } from '@/components/auth/LoginArea';
import { NostrEvent } from '@nostrify/nostrify';
import { MessageSquare, Send, Reply, Upload, Video, Music, X } from 'lucide-react';
import { useAuthor } from '@/hooks/useAuthor';
import { nip19 } from 'nostr-tools';
import { genUserName } from '@/lib/genUserName';

interface CommentFormProps {
  root: NostrEvent | URL;
  reply?: NostrEvent;
  onSuccess?: () => void;
  placeholder?: string;
  compact?: boolean;
}

export function CommentForm({
  root,
  reply,
  onSuccess,
  placeholder = "Write a comment...",
  compact = false
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{tags: string[]; file: File}>>([]);
  const { user } = useCurrentUser();
  const { mutate: postComment, isPending } = usePostComment();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();

  // Auto-add mention when replying
  useEffect(() => {
    if (reply) {
      const npub = nip19.npubEncode(reply.pubkey);
      const mention = `nostr:${npub}`;
      setContent(`${mention} `);
    } else {
      setContent('');
    }
    // Clear uploaded files when reply changes
    setUploadedFiles([]);
  }, [reply]);

  // Get reply author info for display
  const replyAuthor = reply ? useAuthor(reply.pubkey) : null;
  const replyMetadata = replyAuthor?.data?.metadata;
  const replyDisplayName = replyMetadata?.name ?? (reply ? genUserName(reply.pubkey) : '');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        console.log('🚀 Starting upload for comment file:', file.name, file.type, file.size);
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
            description: `${file.name} uploaded successfully and added to ${reply ? 'reply' : 'comment'}`,
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
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);

      // Remove the file URL from content
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

    // Prevent double submission
    if (!content.trim() || !user || isSubmitting) return;

    setIsSubmitting(true);

    console.log('=== COMMENT SUBMISSION ===');
    console.log('Content:', content.trim());
    console.log('Uploaded files:', uploadedFiles);
    console.log('Uploaded files count:', uploadedFiles.length);

    postComment(
      {
        content: content.trim(),
        root,
        reply,
        uploadedFiles // Pass uploaded files to the comment hook
      },
      {
        onSuccess: () => {
          // Clear content but keep the mention if replying
          setContent(reply ? `nostr:${nip19.npubEncode(reply.pubkey)} ` : '');
          setUploadedFiles([]);
          setIsSubmitting(false);
          onSuccess?.();
        },
        onError: (error) => {
          console.error('Failed to post comment:', error);
          // Re-enable form on error
          setIsSubmitting(false);
        },
      }
    );
  };

  if (!user) {
    return (
      <Card className={compact ? "border-dashed" : ""}>
        <CardContent className={compact ? "p-4" : "p-6"}>
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <MessageSquare className="h-5 w-5" />
              <span>Sign in to {reply ? 'reply' : 'comment'}</span>
            </div>
            <LoginArea />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Combined disabled state
  const formDisabled = isSubmitting || isUploading;

  return (
    <Card className={compact ? "border-dashed" : ""}>
      <CardContent className={compact ? "p-4" : "p-6"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reply context */}
          {reply && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Reply className="h-4 w-4" />
              <span>Replying to </span>
              <Link
                to={`/${nip19.npubEncode(reply.pubkey)}`}
                className="font-medium hover:text-primary transition-colors"
              >
                {replyDisplayName}
              </Link>
            </div>
          )}

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={reply ? "Type your reply after the mention..." : placeholder}
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

                  // Extract URL from tags (NIP-94 format)
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

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="absolute -top-2 -right-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>

                      {/* File Name */}
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
                id={`comment-media-upload-${reply?.id || 'root'}`}
                multiple
                accept="image/*,video/*,audio/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={formDisabled}
              />
              <label
                htmlFor={`comment-media-upload-${reply?.id || 'root'}`}
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
                {reply ? 'Replying to comment' : 'Adding to the discussion'}
              </span>
            </div>
            <Button
              type="submit"
              disabled={!content.trim() || formDisabled}
              size={compact ? "sm" : "default"}
            >
              <Send className="h-4 w-4 mr-2" />
              {formDisabled ? (isUploading ? 'Uploading...' : 'Posting...') : (reply ? 'Reply' : 'Comment')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
