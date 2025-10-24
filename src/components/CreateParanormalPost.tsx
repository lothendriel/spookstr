import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useToast } from '@/hooks/useToast';
import { Ghost, Send, Upload, Image, Video, Music, X, RadioTower } from 'lucide-react';

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

export function CreateParanormalPost() {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{tags: string[]; file: File}>>([]);
  const [postToSpookstr2Only, setPostToSpookstr2Only] = useState(false);

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
        console.log('📋 Tags type:', typeof tags, 'Is array:', Array.isArray(tags));

        // Ensure tags is an array before storing
        const fileTags = Array.isArray(tags) ? tags : [];
        console.log('📋 File tags after validation:', fileTags);
        console.log('📋 File tags length:', fileTags.length);

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
    if (!user || !content.trim() || selectedTags.length === 0) {
      console.log('❌ Cannot submit - validation failed:', {
        hasUser: !!user,
        hasContent: !!content.trim(),
        hasTags: selectedTags.length > 0
      });
      return;
    }

    console.log('✅ Form validation passed, preparing to submit...');
    const tags = selectedTags.map(tag => ['t', tag]);

    // Add uploaded file tags (NIP-94)
    console.log('=== POST SUBMISSION ===');
    console.log('Content:', content.trim());
    console.log('Selected tags:', selectedTags);
    console.log('Uploaded files:', uploadedFiles);
    console.log('Uploaded files count:', uploadedFiles.length);
    console.log('Post to Spookstr2 only:', postToSpookstr2Only);

    if (uploadedFiles.length === 0) {
      console.log('⚠️  WARNING: No files to attach!');
    }

    uploadedFiles.forEach((uploadedFile, index) => {
      console.log(`File ${index + 1}:`, {
        fileName: uploadedFile.file.name,
        fileSize: uploadedFile.file.size,
        fileType: uploadedFile.file.type,
        tags: uploadedFile.tags,
        tagsExpanded: JSON.stringify(uploadedFile.tags, null, 2),
        hasUrlTag: uploadedFile.tags.some(tag => tag[0] === 'url'),
        urlValue: uploadedFile.tags.find(tag => tag[0] === 'url')?.[1]
      });
      console.log('Adding file tags:', uploadedFile.tags);
      console.log('File tags expanded:', JSON.stringify(uploadedFile.tags, null, 2));

      // Check each individual tag
      if (Array.isArray(uploadedFile.tags)) {
        uploadedFile.tags.forEach((tag, tagIndex) => {
          console.log(`File ${index + 1}, Tag ${tagIndex + 1}:`, tag);
        });
      }

      tags.push(...uploadedFile.tags);
    });

    console.log('📋 Final event structure:', {
      kind: 1,
      content: content.trim(),
      tags: tags
    });
    console.log('📋 Final event tags array:', tags);

    createEvent({
      event: {
        kind: 1,
        content: content.trim(),
        tags
      },
      options: postToSpookstr2Only ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
    });

    setContent('');
    setSelectedTags([]);
    setUploadedFiles([]);
    setPostToSpookstr2Only(false);
  };

  if (!user) {
    return (
      <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Ghost className="h-12 w-12 text-lime-500/60 mx-auto mb-4" />
          <p className="text-lime-400">You must be logged in to share your paranormal experiences.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lime-400 flex items-center space-x-2">
          <Ghost className="h-5 w-5" />
          <span>Share Your Paranormal Experience</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Textarea
          placeholder="Tell us about your encounter with the unknown..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-black/20 border-lime-500/30 text-lime-100 placeholder:text-lime-500/50 resize-none"
          rows={4}
        />

        {/* File Upload Section */}
        <div>
          <p className="text-sm text-lime-500/80 mb-2">
            Attach media (images, videos, audio):
          </p>

          {/* File Upload Button */}
          <div className="mb-3">
            <input
              type="file"
              id="media-upload"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            <label
              htmlFor="media-upload"
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium cursor-pointer transition-colors ${
                isUploading
                  ? 'border-lime-500/30 text-lime-500/50 cursor-not-allowed'
                  : 'border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300'
              }`}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Uploading...' : 'Choose Files'}
            </label>
          </div>

          {/* Uploaded Files Preview */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-lime-500/60">
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
                      <div className="aspect-square bg-black/20 border border-lime-500/20 rounded-lg overflow-hidden">
                        {isImage && url && (
                          <img
                            src={url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                        {isVideo && (
                          <div className="w-full h-full flex items-center justify-center bg-black/40">
                            <Video className="h-8 w-8 text-lime-400" />
                          </div>
                        )}
                        {isAudio && (
                          <div className="w-full h-full flex items-center justify-center bg-black/40">
                            <Music className="h-8 w-8 text-lime-400" />
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
                      <p className="text-xs text-lime-500/60 truncate mt-1" title={file.name}>
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
        <div className="flex items-start space-x-3 p-4 border border-lime-500/20 rounded-lg bg-black/10">
          <div className="flex items-center h-5">
            <Checkbox
              id="spookstr2-only"
              checked={postToSpookstr2Only}
              onCheckedChange={(checked) => setPostToSpookstr2Only(checked as boolean)}
              className="border-lime-500/50 data-[state=checked]:bg-lime-500 data-[state=checked]:border-lime-500"
            />
          </div>
          <div className="flex-1 space-y-1">
            <label htmlFor="spookstr2-only" className="text-sm font-medium text-lime-300 cursor-pointer flex items-center gap-2">
              <RadioTower className="h-4 w-4" />
              Post to Spookstr2 Relay Only
            </label>
            <p className="text-xs text-lime-500/60">
              When checked, your post will only be published to the Spookstr2 relay. Uncheck to publish to all relays.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-lime-500/80 mb-2">
            Select at least one paranormal category (required):
          </p>
          <div className="flex flex-wrap gap-2">
            {PARANORMAL_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className={`cursor-pointer transition-all ${
                  selectedTags.includes(tag)
                    ? "bg-lime-500 text-black border-lime-500"
                    : "border-lime-500/50 text-lime-400 hover:border-lime-400 hover:text-lime-300"
                }`}
                onClick={() => handleTagToggle(tag)}
              >
                #{tag}
              </Badge>
            ))}
          </div>

          <div className="mt-3">
            <p className="text-xs text-lime-500/60 text-center">
              {selectedTags.length > 0
                ? `${selectedTags.length} categor${selectedTags.length === 1 ? 'y' : 'ies'} selected`
                : 'Select at least one category'
              }
            </p>

            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || selectedTags.length === 0 || isPending || isUploading}
              className="bg-lime-500 hover:bg-lime-400 text-black font-semibold w-full mt-2"
            >
              <Send className="h-4 w-4 mr-2" />
              {isPending ? 'Sharing...' : 'Share Experience'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}