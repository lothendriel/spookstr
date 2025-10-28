// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import { ChevronDown, LogOut, UserIcon, UserPlus, Wallet, User, Activity, Radio } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Switch } from '@/components/ui/switch.tsx';
import { WalletModal } from '@/components/WalletModal';
import { useLoggedInAccounts, type Account } from '@/hooks/useLoggedInAccounts';
import { getDisplayName as getDisplayNameUtil } from '@/lib/getDisplayName';
import { useNavigate } from 'react-router-dom';
import { nip19 } from 'nostr-tools';
import { useAppContext } from '@/hooks/useAppContext';

interface AccountSwitcherProps {
  onAddAccountClick: () => void;
}

export function AccountSwitcher({ onAddAccountClick }: AccountSwitcherProps) {
  const { currentUser, otherUsers, setLogin, removeLogin } = useLoggedInAccounts();
  const { config, updateConfig } = useAppContext();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const getDisplayName = (account: Account): string => {
    return getDisplayNameUtil(account.metadata, account.pubkey);
  }

  const handleSpookstrModeToggle = (checked: boolean) => {
    updateConfig((current) => ({
      ...current,
      spookstrOnlyMode: checked,
    }));
  };

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className='flex items-center gap-3 p-3 rounded-full hover:bg-accent transition-all w-full text-foreground'>
          <Avatar className='w-10 h-10'>
            <AvatarImage src={currentUser.metadata.picture} alt={getDisplayName(currentUser)} />
            <AvatarFallback>{getDisplayName(currentUser).charAt(0)}</AvatarFallback>
          </Avatar>
          <div className='flex-1 text-left hidden md:block truncate'>
            <p className='font-medium text-sm truncate'>{getDisplayName(currentUser)}</p>
          </div>
          <ChevronDown className='w-4 h-4 text-muted-foreground' />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56 p-2 animate-scale-in'>
        <div className='font-medium text-sm px-2 py-1.5'>Switch Account</div>
        {otherUsers.map((user) => (
          <DropdownMenuItem
            key={user.id}
            onClick={() => {
              setLogin(user.id);
              // Refresh the page to clear all cached data and load the new user's data
              window.location.reload();
            }}
            className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
          >
            <Avatar className='w-8 h-8'>
              <AvatarImage src={user.metadata.picture} alt={getDisplayName(user)} />
              <AvatarFallback>{getDisplayName(user)?.charAt(0) || <UserIcon />}</AvatarFallback>
            </Avatar>
            <div className='flex-1 truncate'>
              <p className='text-sm font-medium'>{getDisplayName(user)}</p>
            </div>
            {user.id === currentUser.id && <div className='w-2 h-2 rounded-full bg-primary'></div>}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 py-1.5 text-xs text-muted-foreground font-normal">
          Settings
        </DropdownMenuLabel>
        <div className='flex items-center justify-between px-2 py-2 rounded-md hover:bg-accent'>
          <div className='flex items-center gap-2'>
            <Radio className='w-4 h-4' />
            <span className='text-sm'>Spookstr Only Mode</span>
          </div>
          <Switch
            checked={config.spookstrOnlyMode ?? false}
            onCheckedChange={handleSpookstrModeToggle}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            const npub = nip19.npubEncode(currentUser.pubkey);
            navigate(`/${npub}`);
          }}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <User className='w-4 h-4' />
          <span>View Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate('/settings/relays')}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <Activity className='w-4 h-4' />
          <span>Relay Settings</span>
        </DropdownMenuItem>
        <WalletModal>
          <DropdownMenuItem
            className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
            onSelect={(e) => e.preventDefault()}
          >
            <Wallet className='w-4 h-4' />
            <span>Wallet Settings</span>
          </DropdownMenuItem>
        </WalletModal>
        <DropdownMenuItem
          onClick={onAddAccountClick}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md'
        >
          <UserPlus className='w-4 h-4' />
          <span>Add another account</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => removeLogin(currentUser.id)}
          className='flex items-center gap-2 cursor-pointer p-2 rounded-md text-red-500'
        >
          <LogOut className='w-4 h-4' />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}