import { Ghost, Zap, Plus, Calendar, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoginArea } from '@/components/auth/LoginArea';
import { NotificationBell } from '@/components/NotificationBell';

import { useNavigate } from 'react-router-dom';

export function SpookstrHeader() {
  const navigate = useNavigate();

  return (
    <header className="border-b border-lime-500/20 bg-black/40 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <Ghost className="h-8 w-8 text-lime-400" />
              <div className="absolute -top-1 -right-1 h-2 w-2 bg-lime-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-lime-400 tracking-wider">Spookstr</h1>
              <p className="text-xs text-lime-500/60">Paranormal Nostr Network</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Button className="bg-lime-500 hover:bg-lime-400 text-black font-semibold" size="icon" onClick={() => navigate('/create-community')}>
              <Plus className="h-4 w-4" />
            </Button>

            <Button className="bg-lime-500 hover:bg-lime-400 text-black font-semibold" size="icon" onClick={() => navigate('/paranormal-map')}>
              <MapPin className="h-4 w-4" />
            </Button>

            <Button className="bg-lime-500 hover:bg-lime-400 text-black font-semibold" size="icon" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4" />
            </Button>

            <Button className="bg-lime-500 hover:bg-lime-400 text-black font-semibold" onClick={() => navigate('/communities')}>
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline ml-2">Communities</span>
            </Button>

            <div className="hidden md:flex items-center space-x-2 text-lime-500/60">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Powered by Nostr</span>
            </div>

            <NotificationBell />

            <LoginArea className="inline-flex" />
          </div>
        </div>
      </div>
    </header>
  );
}