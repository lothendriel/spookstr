import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHiddenHashtags } from '@/hooks/useHiddenHashtags';
import { Eye, EyeOff, Trash2, Hash, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export function HiddenHashtagsManager() {
  const { hiddenHashtags, hideHashtag, showHashtag, clearHiddenHashtags } = useHiddenHashtags();
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
      hideHashtag(trimmed);
      setNewHashtagInput('');
      setError(null);
      setSuccess('Hashtag hidden successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to hide hashtag');
      }
    }
  };

  const handleShowHashtag = (hashtag: string) => {
    try {
      showHashtag(hashtag);
      setSuccess('Hashtag shown - posts with this hashtag will now appear in your feed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to show hashtag');
    }
  };

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to show all ${hiddenHashtags.length} hidden hashtags?`)) {
      clearHiddenHashtags();
      setSuccess('All hashtags shown - posts with these hashtags will now appear in your feed');
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
          <Hash className="h-5 w-5" />
          Hidden Hashtags
        </CardTitle>
        <CardDescription className="text-lime-500/70">
          Hide posts containing specific hashtags. You can re-show them at any time.
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
          <label className="text-sm text-lime-400">Hide posts with hashtag</label>
          <div className="flex gap-2">
            <Input
              value={newHashtagInput}
              onChange={(e) => {
                setNewHashtagInput(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="halloween (or #halloween)"
              className="bg-black/40 border-lime-500/30 text-lime-100 placeholder:text-lime-500/40"
            />
            <Button
              onClick={handleAddHashtag}
              className="bg-lime-500 hover:bg-lime-600 text-black"
            >
              <Hash className="h-4 w-4 mr-2" />
              Hide
            </Button>
          </div>
          <p className="text-xs text-lime-500/60">
            Enter a hashtag to hide posts containing it (# prefix optional)
          </p>
        </div>

        {/* Hidden Hashtags List */}
        {hiddenHashtags.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-lime-400">
                Hidden Hashtags ({hiddenHashtags.length})
              </h3>
              <Button
                onClick={handleClearAll}
                variant="outline"
                size="sm"
                className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Show All
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {hiddenHashtags.map((hashtag) => (
                <HiddenHashtagItem
                  key={hashtag}
                  hashtag={hashtag}
                  onShow={handleShowHashtag}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-lime-500/20 rounded-lg">
            <Hash className="h-12 w-12 text-lime-500/40 mx-auto mb-2" />
            <p className="text-lime-500/60 text-sm">
              No hidden hashtags
            </p>
            <p className="text-lime-500/40 text-xs mt-1">
              Add a hashtag above to hide posts containing it
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface HiddenHashtagItemProps {
  hashtag: string;
  onShow: (hashtag: string) => void;
}

function HiddenHashtagItem({ hashtag, onShow }: HiddenHashtagItemProps) {
  return (
    <Badge
      variant="outline"
      className="px-3 py-2 border-lime-500/20 bg-black/20 text-lime-400 hover:bg-black/30 transition-colors group cursor-pointer"
    >
      <span className="mr-2">#{hashtag}</span>
      <Button
        onClick={() => onShow(hashtag)}
        variant="ghost"
        size="sm"
        className="h-5 w-5 p-0 hover:bg-lime-500/20 rounded-full ml-1"
        title="Show posts with this hashtag"
      >
        <Eye className="h-3 w-3 text-lime-400 group-hover:text-lime-300" />
      </Button>
    </Badge>
  );
}
