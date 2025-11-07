import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePersonalizedHashtags } from '@/hooks/usePersonalizedHashtags';
import { Plus, Trash2, Hash, AlertCircle, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function PersonalizedHashtagsManager() {
  const { 
    personalizedHashtags, 
    addPersonalizedHashtag, 
    removePersonalizedHashtag, 
    clearPersonalizedHashtags 
  } = usePersonalizedHashtags();
  const [newHashtagInput, setNewHashtagInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddHashtag = () => {
    const trimmed = newHashtagInput.trim();
    
    if (!trimmed) {
      setError('Please enter a hashtag');
      return;
    }

    try {
      addPersonalizedHashtag(trimmed);
      setNewHashtagInput('');
      setError(null);
      setSuccess('Hashtag added to your personalized feed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to add hashtag');
      }
    }
  };

  const handleRemoveHashtag = (hashtag: string) => {
    try {
      removePersonalizedHashtag(hashtag);
      setSuccess('Hashtag removed from your personalized feed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to remove hashtag');
    }
  };

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to remove all ${personalizedHashtags.length} personalized hashtags?`)) {
      clearPersonalizedHashtags();
      setSuccess('All personalized hashtags cleared');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddHashtag();
    }
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lime-400 flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Personalized Hashtags
        </CardTitle>
        <CardDescription className="text-lime-500/70">
          Add hashtags you're interested in to see more relevant content in your feed. 
          These preferences are stored privately in your browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-lime-500/50 bg-lime-500/10">
            <AlertDescription className="text-lime-400">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Add New Hashtag */}
        <div className="space-y-2">
          <label className="text-sm text-lime-400">Add hashtag to your feed</label>
          <div className="flex gap-2">
            <Input
              value={newHashtagInput}
              onChange={(e) => {
                setNewHashtagInput(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="ghosts (or #ghosts)"
              className="bg-black/40 border-lime-500/30 text-lime-100 placeholder:text-lime-500/40"
            />
            <Button
              onClick={handleAddHashtag}
              className="bg-lime-500 hover:bg-lime-600 text-black"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
          <p className="text-xs text-lime-500/60">
            Enter a hashtag to see more posts with that topic (# prefix optional)
          </p>
        </div>

        {/* Personalized Hashtags List */}
        {personalizedHashtags.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-lime-400">
                Your Personalized Hashtags ({personalizedHashtags.length})
              </h3>
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {personalizedHashtags.map((hashtag) => (
                <PersonalizedHashtagItem
                  key={hashtag}
                  hashtag={hashtag}
                  onRemove={handleRemoveHashtag}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-lime-500/20 rounded-lg">
            <Sparkles className="h-12 w-12 text-lime-500/40 mx-auto mb-2" />
            <p className="text-lime-500/60 text-sm">
              No personalized hashtags yet
            </p>
            <p className="text-lime-500/40 text-xs mt-1">
              Add hashtags above to customize your feed with content you're interested in
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PersonalizedHashtagItemProps {
  hashtag: string;
  onRemove: (hashtag: string) => void;
}

function PersonalizedHashtagItem({ hashtag, onRemove }: PersonalizedHashtagItemProps) {
  return (
    <Badge
      variant="outline"
      className="px-3 py-2 border-lime-500/20 bg-black/20 text-lime-400 hover:bg-black/30 transition-colors group cursor-pointer"
    >
      <span className="mr-2">#{hashtag}</span>
      <Button
        onClick={() => onRemove(hashtag)}
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 hover:bg-lime-500/20 rounded-full ml-1"
        title="Remove from personalized feed"
      >
        <Trash2 className="h-3 w-3 text-lime-400 group-hover:text-lime-300" />
      </Button>
    </Badge>
  );
}