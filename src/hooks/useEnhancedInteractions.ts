import { useMemo } from 'react';
import { useBatchInteractions } from './useBatchInteractions';
import { useRealtimeInteractionUpdates } from './useRealtimeInteractionUpdates';

/**
 * Enhanced interactions hook that combines batch loading and real-time updates
 * using the multi-relay approach for comprehensive interaction coverage.
 * 
 * This hook provides a simple interface for components that need interaction counts
 * with automatic multi-relay querying and real-time updates.
 * 
 * @param eventIds Array of event IDs to fetch interactions for
 * @returns Interaction data with batch loading and real-time updates
 */
export function useEnhancedInteractions(eventIds: string[]) {
  // Fetch interactions using enhanced multi-relay approach
  const { data: batchData, isLoading } = useBatchInteractions(eventIds);

  // Enable real-time updates for the same events
  useRealtimeInteractionUpdates(eventIds);

  // Return processed data
  const enhancedData = useMemo(() => {
    if (!batchData) return {};

    // Log summary for debugging
    const totalInteractions = Object.values(batchData).reduce((acc, counts) => 
      acc + counts.likes + counts.reposts + counts.zaps + counts.comments, 0
    );

    if (totalInteractions > 0) {
      console.log(`[Enhanced Interactions] Providing ${totalInteractions} interactions across ${eventIds.length} events via multi-relay approach`);
    }

    return batchData;
  }, [batchData, eventIds.length]);

  return {
    data: enhancedData,
    isLoading,
  };
}

/**
 * Enhanced interactions hook for a single event
 * @param eventId Single event ID to fetch interactions for
 * @returns Interaction data for the single event
 */
export function useEnhancedSingleInteraction(eventId: string) {
  const { data, isLoading } = useEnhancedInteractions(eventId ? [eventId] : []);
  
  return {
    data: eventId ? data[eventId] : undefined,
    isLoading,
  };
}