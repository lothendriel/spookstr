import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Ghost, Send, Upload, Image, Video, Music, X } from 'lucide-react';

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
  const { mutate: uploadFile, isPending: isUploading } = useUploadFile();
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Array<{tags: string[]; file: File}>>([]);

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
        const tags = await uploadFile(file);
        // Ensure tags is an array before storing
        const fileTags = Array.isArray(tags) ? tags : [];
        setUploadedFiles(prev => [...prev, { tags: fileTags, file }]);
      } catch (error) {
        console.error('Failed to upload file:', error);
        // You could add a toast notification here if desired
      }
    }
    // Reset file input
    event.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!user || !content.trim() || selectedTags.length === 0) return;

    const tags = selectedTags.map(tag => ['t', tag]);

    // Add uploaded file tags (NIP-94)
    uploadedFiles.forEach(uploadedFile => {
      tags.push(...uploadedFile.tags);
    });

    createEvent({
      kind: 1,
      content: content.trim(),
      tags
    });

    setContent('');
    setSelectedTags([]);
    setUploadedFiles([]);
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