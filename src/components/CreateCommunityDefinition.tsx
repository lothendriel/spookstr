import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { Users, Settings } from 'lucide-react';

interface CreateCommunityDefinitionProps {
  onSuccess?: () => void;
  initialData?: {
    id: string;
    name: string;
    description: string;
    image?: string;
  };
}

export function CreateCommunityDefinition({ onSuccess, initialData }: CreateCommunityDefinitionProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    id: initialData?.id || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    image: initialData?.image || '',
    moderators: [] as string[]
  });

  const handleSubmit = () => {
    if (!user || !formData.name.trim() || !formData.id.trim()) return;

    const tags = [
      ['d', formData.id.trim()],
      ['name', formData.name.trim()],
      ['description', formData.description.trim()]
    ];

    // Add image if provided
    if (formData.image.trim()) {
      tags.push(['image', formData.image.trim()]);
    }

    // Add creator as moderator
    if (user.pubkey) {
      tags.push(['p', user.pubkey, '', 'moderator']);
    }

    // Add additional moderators
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
          title: 'Community Created',
          description: `${formData.name} community has been created successfully!`,
        });

        if (onSuccess) {
          onSuccess();
        }
      },
      onError: (error) => {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create community. Please try again.',
          variant: 'destructive',
        });
        console.error('Community creation failed:', error);
      }
    });
  };

  if (!user) {
    return (
      <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-purple-500/60 mx-auto mb-4" />
          <p className="text-purple-400">You must be logged in to create a community.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-purple-400 flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Create Community Definition</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium text-purple-300 mb-2 block">
            Community ID
          </label>
          <Input
            value={formData.id}
            onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
            placeholder="spookstr"
            className="bg-black/20 border-purple-500/30 text-purple-100 placeholder:text-purple-500/50"
          />
          <p className="text-xs text-purple-500/60 mt-1">
            Unique identifier for the community (URL-friendly)
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-purple-300 mb-2 block">
            Community Name
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Spookstr Community"
            className="bg-black/20 border-purple-500/30 text-purple-100 placeholder:text-purple-500/50"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-purple-300 mb-2 block">
            Description
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe your community..."
            className="bg-black/20 border-purple-500/30 text-purple-100 placeholder:text-purple-500/50 resize-none"
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
            className="bg-black/20 border-purple-500/30 text-purple-100 placeholder:text-purple-500/50"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!formData.name.trim() || !formData.id.trim() || isPending}
          className="bg-purple-500 hover:bg-purple-400 text-black font-semibold w-full"
        >
          {isPending ? 'Creating Community...' : 'Create Community'}
        </Button>
      </CardContent>
    </Card>
  );
}