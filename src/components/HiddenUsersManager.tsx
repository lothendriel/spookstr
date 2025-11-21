import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useHiddenUsers } from '@/hooks/useHiddenUsers';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, EyeOff, Trash2, UserX, AlertCircle } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function HiddenUsersManager() {
  const { hiddenPubkeys, hideUser, showUser, clearHiddenUsers } = useHiddenUsers();
  const [newUserInput, setNewUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddUser = () => {
    if (!newUserInput.trim()) {
      setError('Please enter an npub');
      return;
    }

    try {
      hideUser(newUserInput.trim());
      setNewUserInput('');
      setError(null);
      setSuccess('User hidden successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Invalid format. Please enter a valid npub (starting with npub1...) or 64-character hex pubkey');
      }
    }
  };

  const handleShowUser = (pubkey: string) => {
    try {
      showUser(pubkey);
      setSuccess('User shown - their posts will now appear in your feed');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to show user');
    }
  };

  const handleClearAll = () => {
    if (confirm(`Are you sure you want to show all ${hiddenPubkeys.length} hidden users?`)) {
      clearHiddenUsers();
      setSuccess('All users shown - their posts will now appear in your feed');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lime-400 flex items-center gap-2">
          <EyeOff className="h-5 w-5" />
          Hidden Users
        </CardTitle>
        <CardDescription className="text-lime-500/70">
          Hide posts from specific users. You can re-show them at any time.
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

        {/* Add New User */}
        <div className="space-y-2">
          <label className="text-sm text-lime-400">Hide posts from user</label>
          <div className="flex gap-2">
            <Input
              value={newUserInput}
              onChange={(e) => {
                setNewUserInput(e.target.value);
                setError(null);
              }}
              placeholder="npub1..."
              className="bg-black/40 border-lime-500/30 text-lime-100 placeholder:text-lime-500/40"
            />
            <Button
              onClick={handleAddUser}
              className="bg-lime-500 hover:bg-lime-600 text-black"
            >
              <UserX className="h-4 w-4 mr-2" />
              Hide
            </Button>
          </div>
          <p className="text-xs text-lime-500/60">
            Enter an npub (starting with npub1...) or 64-character hex pubkey to hide posts from that user
          </p>
        </div>

        {/* Hidden Users List */}
        {hiddenPubkeys.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-lime-400">
                Hidden Users ({hiddenPubkeys.length})
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

            <div className="space-y-2">
              {hiddenPubkeys.map((pubkey) => (
                <HiddenUserItem
                  key={pubkey}
                  pubkey={pubkey}
                  onShow={handleShowUser}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-lime-500/20 rounded-lg">
            <EyeOff className="h-12 w-12 text-lime-500/40 mx-auto mb-2" />
            <p className="text-lime-500/60 text-sm">
              No hidden users
            </p>
            <p className="text-lime-500/40 text-xs mt-1">
              Add an npub above to hide posts from specific users
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface HiddenUserItemProps {
  pubkey: string;
  onShow: (pubkey: string) => void;
}

function HiddenUserItem({ pubkey, onShow }: HiddenUserItemProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, pubkey);
  const npub = nip19.npubEncode(pubkey);

  return (
    <div className="flex items-center justify-between p-3 border border-lime-500/20 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-10 w-10 border-2 border-lime-500/30">
          <AvatarImage src={metadata?.picture} alt={displayName} />
          <AvatarFallback className="bg-lime-500/20 text-lime-400">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-lime-400 font-medium truncate">{displayName}</p>
          <p className="text-lime-500/60 text-xs truncate">{npub.slice(0, 16)}...</p>
        </div>
      </div>
      <Button
        onClick={() => onShow(pubkey)}
        variant="outline"
        size="sm"
        className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10 flex-shrink-0"
      >
        <Eye className="h-3 w-3 mr-1" />
        Show
      </Button>
    </div>
  );
}
