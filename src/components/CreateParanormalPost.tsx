import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { Ghost, Send } from 'lucide-react';

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
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSubmit = () => {
    if (!user || !content.trim() || selectedTags.length === 0) return;

    const tags = selectedTags.map(tag => ['t', tag]);

    createEvent({
      kind: 1,
      content: content.trim(),
      tags
    });

    setContent('');
    setSelectedTags([]);
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
              disabled={!content.trim() || selectedTags.length === 0 || isPending}
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