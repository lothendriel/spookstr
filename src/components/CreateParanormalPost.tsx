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
import { Ghost, Send, Upload, Image, Video, Music, X, RadioTower } from 'lucide-react';

const PARANORMAL_CATEGORIES = [
  {
    id: 'ufos-aliens',
    name: 'UFOs & Aliens',
    icon: '🛸',
    tags: [
      'ufo', 'ufos', 'alien', 'aliens', 'extraterrestrial', 'ufosighting',
      'ufosightings', 'alienlife', 'spaceship', 'flyingsaucer', 'disclosure',
      'abduction', 'mufon', 'greys', 'anunnaki', 'ufovideo', 'ufocatcher', 'cropcircles'
    ]
  },
  {
    id: 'cryptids',
    name: 'Cryptids',
    icon: '🐾',
    tags: [
      'cryptids', 'bigfoot', 'sasquatch', 'cryptid', 'cryptozoology', 'mothman',
      'yeti', 'chupacabra', 'wendigo', 'skunkape', 'yowie', 'dogman',
      'beastofbrayroad', 'jerseydevil', 'urbanlegends', 'mysteriouscreatures',
      'cryptidart', 'cryptidcommunity', 'cryptidsighting', 'bigfootsighting',
      'sasquatchsighting', 'bigfootisreal', 'findingbigfoot', 'bigfootart'
    ]
  },
  {
    id: 'ghosts-spirits',
    name: 'Ghosts & Spirits',
    icon: '👻',
    tags: [
      'paranormal', 'haunted', 'ghost', 'ghosts', 'paranormalactivity', 'ghosthunting',
      'spirit', 'spirits', 'ghoststories', 'paranormalinvestigation', 'ghostadventures',
      'hauntedhouse', 'hauntedplaces', 'ghosthunter'
    ]
  },
  {
    id: 'supernatural',
    name: 'Supernatural',
    icon: '🔮',
    tags: [
      'supernatural', 'horror', 'scary', 'creepy', 'spooky', 'halloween', 'mystery',
      'occult', 'witchcraft', 'witch', 'wicca', 'tarot', 'tarotreading', 'occultart',
      'darkart', 'esoteric', 'hermeticism', 'ceremonialmagic', 'occultism', 'spirituality',
      'mysticism', 'occultsymbols', 'occultbooks', 'shadowwork', 'ritual', 'grimoire', 'magick'
    ]
  },
  {
    id: 'unexplained',
    name: 'Unexplained',
    icon: '🌌',
    tags: [
      'cryptic', 'mysterious', 'unexplained'
    ]
  }
];

interface CreateParanormalPostProps {
  onSuccess?: () => void;
}

export function CreateParanormalPost({ onSuccess }: CreateParanormalPostProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { mutateAsync: uploadFile, isPending: isUploading } = useUploadFile();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<Array<{tags: string[]; file: File}>>([]);
  const [postToSpookstr2Only, setPostToSpookstr2Only] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? '' : categoryId);
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
    // Prevent double submission
    if (!user || !content.trim() || !selectedCategory || isSubmitting) return;

    setIsSubmitting(true);

    // Get all tags from the selected category
    const category = PARANORMAL_CATEGORIES.find(cat => cat.id === selectedCategory);
    const tags = category ? category.tags.map(tag => ['t', tag]) : [];

    // Add mention tags (p tags for mentioned users)
    const mentionTags = extractMentions(content.trim());
    tags.push(...mentionTags);

    // Add uploaded file tags (NIP-94)
    console.log('=== POST SUBMISSION ===');
    console.log('Content:', content.trim());
    console.log('Selected category:', selectedCategory);
    console.log('Category tags:', category?.tags || []);
    console.log('Mention tags:', mentionTags);
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

    // Generate timestamp for better duplicate detection
    const created_at = Math.floor(Date.now() / 1000);

    createEvent({
      event: {
        kind: 1,
        content: content.trim(),
        tags,
        created_at,
      },
      options: postToSpookstr2Only ? { relayUrl: 'wss://spookstr2.nostr1.com' } : undefined
    }, {
      onSuccess: () => {
        // Reset form state
        setContent('');
        setSelectedCategory('');
        setUploadedFiles([]);
        setPostToSpookstr2Only(false);
        setIsSubmitting(false);

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
      <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Ghost className="h-12 w-12 text-lime-500/60 mx-auto mb-4" />
          <p className="text-lime-400">You must be logged in to share your paranormal experiences.</p>
        </CardContent>
      </Card>
    );
  }

  // Combined disabled state
  const formDisabled = isSubmitting || isUploading;

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lime-400 flex items-center space-x-2">
          <Ghost className="h-5 w-5" />
          <span>Share Your Paranormal Experience</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <MentionTextarea
          placeholder="Tell us about your encounter with the unknown... (Type @ to mention someone)"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="bg-black/20 border-lime-500/30 text-lime-100 placeholder:text-lime-500/50 resize-none"
          rows={4}
          disabled={formDisabled}
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
              disabled={formDisabled}
            />
            <label
              htmlFor="media-upload"
              className={`inline-flex items-center px-4 py-2 border rounded-md text-sm font-medium cursor-pointer transition-colors ${
                formDisabled
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
              disabled={formDisabled}
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
          <p className="text-sm text-lime-500/80 mb-3">
            Choose a paranormal category for your post (required):
          </p>

          <div className="space-y-3 mb-4">
            {PARANORMAL_CATEGORIES.map((category) => (
              <div
                key={category.id}
                onClick={() => !formDisabled && handleCategorySelect(category.id)}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  formDisabled
                    ? "cursor-not-allowed opacity-50"
                    : "hover:border-lime-400/60"
                } ${
                  selectedCategory === category.id
                    ? "border-lime-500 bg-lime-500/10"
                    : "border-lime-500/20 bg-black/20"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    selectedCategory === category.id
                      ? "border-lime-500 bg-lime-500"
                      : "border-lime-500/50"
                  }`}>
                    {selectedCategory === category.id && (
                      <div className="w-2 h-2 bg-black rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{category.icon}</span>
                      <h3 className="font-semibold text-lime-300">{category.name}</h3>
                    </div>
                    <p className="text-xs text-lime-500/70 mb-2">
                      Includes {category.tags.length} hashtag{category.tags.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {category.tags.slice(0, 8).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs text-lime-500/60 bg-black/30 px-2 py-0.5 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                      {category.tags.length > 8 && (
                        <span className="text-xs text-lime-500/40 bg-black/30 px-2 py-0.5 rounded">
                          +{category.tags.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <p className="text-xs text-lime-500/60 text-center">
              {selectedCategory
                ? `Category: ${PARANORMAL_CATEGORIES.find(cat => cat.id === selectedCategory)?.name}`
                : 'Please select a category'
              }
            </p>

            <Button
              onClick={handleSubmit}
              disabled={!content.trim() || !selectedCategory || formDisabled}
              className="bg-lime-500 hover:bg-lime-400 text-black font-semibold w-full mt-2"
            >
              <Send className="h-4 w-4 mr-2" />
              {formDisabled ? 'Sharing...' : 'Share Experience'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}