import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Settings, Plus, Trash2, Save, Users } from 'lucide-react';
import { CommunityDefinition } from '@/hooks/useCommunity';

interface CommunityManagementProps {
  community: CommunityDefinition;
  onUpdate?: () => void;
}

export function CommunityManagement({ community, onUpdate }: CommunityManagementProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    name: community.name,
    description: community.description,
    image: community.image || '',
    moderators: community.moderators
  });

  const [newModerator, setNewModerator] = useState('');

  const isOwner = user?.pubkey === community.author;
  const isModerator = isOwner || community.moderators.includes(user?.pubkey || '');

  if (!isModerator) {
    return (
      <Card className="border-red-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Settings className="h-12 w-12 text-red-500/60 mx-auto mb-4" />
          <p className="text-red-400">You don't have permission to manage this community.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = () => {
    if (!user || !formData.name.trim()) return;

    const tags = [
      ['d', community.id],
      ['name', formData.name.trim()],
      ['description', formData.description.trim()]
    ];

    // Add image if provided
    if (formData.image.trim()) {
      tags.push(['image', formData.image.trim()]);
    }

    // Add moderators
    formData.moderators.forEach(moderator => {
      if (moderator.trim()) {
        tags.push(['p', moderator.trim(), '', 'moderator']);
      }
    });

    // Add preferred relays
    tags.push(['relay', 'wss://relay.nostr.band', 'requests']);
    tags.push(['relay', 'wss://relay.damus.io', 'approvals']);

    createEvent({
      event: {
        kind: 34550,
        content: formData.description.trim(),
        tags
      }
    }, {
      onSuccess: () => {
        toast({
          title: 'Community Updated',
          description: `${formData.name} has been updated successfully!`,
        });
        
        if (onUpdate) {
          onUpdate();
        }
      },
      onError: (error) => {
        toast({
          title: 'Update Failed',
          description: 'Failed to update community. Please try again.',
          variant: 'destructive',
        });
        console.error('Community update failed:', error);
      }
    });
  };

  const handleAddModerator = () => {
    if (!newModerator.trim()) return;
    
    if (!formData.moderators.includes(newModerator.trim())) {
      setFormData(prev => ({
        ...prev,
        moderators: [...prev.moderators, newModerator.trim()]
      }));
      setNewModerator('');
    }
  };

  const handleRemoveModerator = (moderator: string) => {
    setFormData(prev => ({
      ...prev,
      moderators: prev.moderators.filter(m => m !== moderator)
    }));
  };

  return (
    <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Community Management</span>
          {!isOwner && (
            <Badge variant="secondary">Moderator</Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium text-purple-300 mb-2 block">
            Community Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="bg-black/20 border-purple-500/30 text-purple-100"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-purple-300 mb-2 block">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="bg-black/20 border-purple-500/30 text-purple-100 resize-none"
            rows={4}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-purple-300 mb-2 block">
            Community Image (optional)
          </label>
          <Input
            value={formData.image}
            onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
            placeholder="https://example.com/community-image.jpg"
            className="bg-black/20 border-purple-500/30 text-purple-100"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-purple-300 mb-2 block">
            Moderators
          </label>
          <div className="space-y-3">
            {formData.moderators.map((moderator) => (
              <ModeratorItem
                key={moderator}
                pubkey={moderator}
                isOwner={moderator === community.author}
                onRemove={() => handleRemoveModerator(moderator)}
                canRemove={isOwner && moderator !== user?.pubkey}
              />
            ))}
            
            <div className="flex gap-2">
              <Input
                value={newModerator}
                onChange={(e) => setNewModerator(e.target.value)}
                placeholder="Add moderator by npub or hex pubkey"
                className="bg-black/20 border-purple-500/30 text-purple-100 flex-1"
              />
              <Button
                onClick={handleAddModerator}
                disabled={!newModerator.trim()}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!formData.name.trim() || isPending}
          className="bg-purple-500 hover:bg-purple-400 text-black font-semibold w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {isPending ? 'Saving Changes...' : 'Save Changes'}
        </Button>

        {!isOwner && (
          <div className="text-xs text-purple-500/60 text-center">
            As a moderator, you can edit community details but cannot remove the owner or other moderators.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ModeratorItemProps {
  pubkey: string;
  isOwner: boolean;
  onRemove: () => void;
  canRemove: boolean;
}

function ModeratorItem({ pubkey, isOwner, onRemove, canRemove }: ModeratorItemProps) {
  const author = useAuthor(pubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name || genUserName(pubkey);
  const profileImage = metadata?.picture;

  return (
    <div className="flex items-center justify-between p-3 bg-black/20 border border-purple-500/20 rounded-lg">
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profileImage} alt={displayName} />
          <AvatarFallback className="text-xs">
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium text-sm text-purple-200">
            {displayName}
          </div>
          <div className="text-xs text-purple-500/60">
            {pubkey.slice(0, 8)}...{pubkey.slice(-8)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isOwner && (
          <Badge variant="default" className="bg-purple-500 text-black">
            Owner
          </Badge>
        )}
        {canRemove && (
          <Button
            onClick={onRemove}
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}