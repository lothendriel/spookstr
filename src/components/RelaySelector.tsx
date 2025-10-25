import { Check, ChevronsUpDown, Wifi, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useEffect } from "react";
import { useAppContext } from "@/hooks/useAppContext";

interface RelaySelectorProps {
  className?: string;
}

export function RelaySelector(props: RelaySelectorProps) {
  const { className } = props;
  const { config, updateConfig, presetRelays = [] } = useAppContext();

  const selectedRelay = config.relayUrl;
  const setSelectedRelay = (relay: string) => {
    try {
      if (relay && relay.trim()) {
        updateConfig((current) => ({ ...current, relayUrl: relay }));
      }
    } catch (error) {
      console.error('Error updating relay URL:', error);
      // Don't throw the error to prevent component crashes
    }
  };

  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const selectedOption = presetRelays.find((option) => option.url === selectedRelay);

  // Ensure selectedRelay is always valid
  useEffect(() => {
    try {
      if (!selectedRelay || !selectedRelay.trim()) {
        // Fallback to first preset relay or default
        const fallbackRelay = presetRelays[0]?.url || "wss://relay.primal.net";
        setSelectedRelay(fallbackRelay);
      }
    } catch (error) {
      console.error('Error in relay validation effect:', error);
      // Don't throw the error to prevent component crashes
    }
  }, [selectedRelay, presetRelays]);

  // Function to normalize relay URL by adding wss:// if no protocol is present
  const normalizeRelayUrl = (url: string): string => {
    if (!url || typeof url !== 'string') return '';

    const trimmed = url.trim();
    if (!trimmed) return '';

    // Check if it already has a protocol
    if (trimmed.includes('://')) {
      return trimmed;
    }

    // Add wss:// prefix
    return `wss://${trimmed}`;
  };

  // Handle adding a custom relay
  const handleAddCustomRelay = (url: string) => {
    try {
      const normalizedUrl = normalizeRelayUrl(url);
      if (normalizedUrl && normalizedUrl.trim()) {
        setSelectedRelay(normalizedUrl);
        setOpen(false);
        setInputValue("");
      }
    } catch (error) {
      console.error('Error adding custom relay:', error);
      // Don't throw the error to prevent component crashes
    }
  };

  // Check if input value looks like a valid relay URL
  const isValidRelayInput = (value: string): boolean => {
    if (!value || typeof value !== 'string') return false;

    const trimmed = value.trim();
    if (!trimmed) return false;

    // Basic validation - should contain at least a domain-like structure
    const normalized = normalizeRelayUrl(trimmed);
    if (!normalized) return false;

    try {
      new URL(normalized);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between", className)}
        >
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            <span className="truncate">
              {selectedOption?.name ||
                (selectedRelay ? selectedRelay.replace(/^wss?:\/\//, '') : "Select relay...")
              }
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput
            placeholder="Search relays or type URL..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              {inputValue && isValidRelayInput(inputValue) ? (
                <CommandItem
                  onSelect={() => handleAddCustomRelay(inputValue)}
                  className="cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {inputValue ? "Invalid relay URL" : "No relay found."}
                </div>
              )}
            </CommandEmpty>
            <CommandGroup>
              {presetRelays
                .filter((option) =>
                  !inputValue ||
                  option.name.toLowerCase().includes(inputValue.toLowerCase()) ||
                  option.url.toLowerCase().includes(inputValue.toLowerCase())
                )
                .map((option) => (
                  <CommandItem
                    key={option.url}
                    value={option.url}
                    onSelect={(currentValue) => {
                      try {
                        if (currentValue && currentValue.trim()) {
                          setSelectedRelay(normalizeRelayUrl(currentValue));
                          setOpen(false);
                          setInputValue("");
                        }
                      } catch (error) {
                        console.error('Error selecting relay:', error);
                        // Don't throw the error to prevent component crashes
                      }
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedRelay === option.url ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{option.name}</span>
                      <span className="text-xs text-muted-foreground">{option.url}</span>
                    </div>
                  </CommandItem>
                ))}
              {inputValue && isValidRelayInput(inputValue) && (
                <CommandItem
                  onSelect={() => {
                    try {
                      handleAddCustomRelay(inputValue);
                    } catch (error) {
                      console.error('Error in custom relay selection:', error);
                      // Don't throw the error to prevent component crashes
                    }
                  }}
                  className="cursor-pointer border-t"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">Add custom relay</span>
                    <span className="text-xs text-muted-foreground">
                      {normalizeRelayUrl(inputValue)}
                    </span>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}