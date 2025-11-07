import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreateParanormalPost } from '@/components/CreateParanormalPost';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

interface CreatePostModalProps {
  children?: React.ReactNode;
}

export function CreatePostModal({ children }: CreatePostModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-lime-400 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Share Your Paranormal Experience
          </DialogTitle>
          <DialogDescription className="text-lime-500/60">
            Tell us about your encounter with the unknown. Attach photos, videos, or audio evidence.
          </DialogDescription>
        </DialogHeader>
        <div className="p-0">
          <CreateParanormalPost onSuccess={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}