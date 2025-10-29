import * as React from "react";
import { cn } from "@/lib/utils";
import { useUserSearch, type SearchableUser } from "@/hooks/useUserSearch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { nip19 } from "nostr-tools";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

export interface MentionTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  onMentionSelect?: (user: SearchableUser) => void;
}

export interface MentionData {
  pubkey: string;
  displayName: string;
  nprofile: string;
}

const MentionTextarea = React.forwardRef<HTMLTextAreaElement, MentionTextareaProps>(
  ({ className, onMentionSelect, onChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [mentionQuery, setMentionQuery] = React.useState("");
    const [cursorPosition, setCursorPosition] = React.useState(0);
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const { searchUsers, users, clearSearch } = useUserSearch();

    // Use forwarded ref or internal ref
    const inputRef = ref || textareaRef;

    // Track cursor position and detect @ mentions
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      const cursorPos = e.target.selectionStart;
      setCursorPosition(cursorPos);

      // Look for @ mentions
      const textUpToCursor = value.slice(0, cursorPos);
      const lastAtIndex = textUpToCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        // Check if @ is at start or preceded by whitespace
        const charBeforeAt = lastAtIndex > 0 ? textUpToCursor[lastAtIndex - 1] : ' ';
        if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
          const queryAfterAt = textUpToCursor.slice(lastAtIndex + 1);

          // Check if there's no whitespace in the query (still typing the mention)
          if (!queryAfterAt.includes(' ') && !queryAfterAt.includes('\n')) {
            setMentionQuery(queryAfterAt);
            searchUsers(queryAfterAt);
            setIsOpen(true);
            setSelectedIndex(0);
            onChange?.(e);
            return;
          }
        }
      }

      // Close mention dropdown if not in mention context
      if (isOpen) {
        setIsOpen(false);
        clearSearch();
      }

      onChange?.(e);
    };

    // Handle keyboard navigation in mention dropdown
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (!isOpen || users.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % users.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + users.length) % users.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (users[selectedIndex]) {
          handleMentionSelect(users[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        clearSearch();
      }
    };

    // Handle mention selection
    const handleMentionSelect = (user: SearchableUser) => {
      if (!inputRef || !('current' in inputRef) || !inputRef.current) return;

      const textarea = inputRef.current;
      const value = textarea.value;
      const cursorPos = cursorPosition;

      // Find the @ that started this mention
      const textUpToCursor = value.slice(0, cursorPos);
      const lastAtIndex = textUpToCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        // Create the mention replacement
        const nprofile = nip19.nprofileEncode({
          pubkey: user.pubkey,
          relays: [], // We could add relay hints here if needed
        });
        const mentionText = `nostr:${nprofile}`;

        // Replace the @ and query with the mention
        const beforeMention = value.slice(0, lastAtIndex);
        const afterCursor = value.slice(cursorPos);
        const newValue = `${beforeMention}${mentionText} ${afterCursor}`;

        // Update textarea value
        textarea.value = newValue;

        // Position cursor after the mention
        const newCursorPos = lastAtIndex + mentionText.length + 1;
        setTimeout(() => {
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);

        // Trigger change event
        const event = new Event('input', { bubbles: true });
        textarea.dispatchEvent(event);
      }

      // Close dropdown and clear search
      setIsOpen(false);
      clearSearch();
      onMentionSelect?.(user);
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const closeDropdown = () => {
        if (isOpen) {
          setIsOpen(false);
          clearSearch();
        }
      };

      document.addEventListener('click', closeDropdown);
      return () => document.removeEventListener('click', closeDropdown);
    }, [isOpen, clearSearch]);

    return (
      <div className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={inputRef}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          {...props}
        />

        {isOpen && users.length > 0 && (
          <div
            className="absolute z-50 w-80 mt-1 bg-popover border border-border rounded-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <Command>
              <CommandList>
                <CommandEmpty>No users found.</CommandEmpty>
                <CommandGroup>
                  {users.map((user, index) => (
                    <CommandItem
                      key={user.pubkey}
                      onSelect={() => handleMentionSelect(user)}
                      className={cn(
                        "flex items-center space-x-3 p-3 cursor-pointer",
                        index === selectedIndex && "bg-accent"
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.picture} alt={user.displayName} />
                        <AvatarFallback className="text-xs">
                          {user.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium truncate">
                            {user.displayName}
                          </p>
                          {user.isFollowing && (
                            <Badge variant="secondary" className="text-xs">
                              Following
                            </Badge>
                          )}
                        </div>
                        {user.nip05 && (
                          <p className="text-xs text-muted-foreground truncate">
                            {user.nip05}
                          </p>
                        )}
                        {user.metadata?.about && (
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {user.metadata.about}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        )}

      </div>
    );
  }
);

MentionTextarea.displayName = "MentionTextarea";

export { MentionTextarea };