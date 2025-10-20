import { useCalendarEvents } from "@/hooks/useCalendarEvents";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CalendarDisplay() {
  const { data: events, isLoading } = useCalendarEvents();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  if (!events?.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <p>No calendar events found</p>
          <Button>Create a new event</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Events</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {events.map(event => {
            // Format date based on kind
            const title = event.tags.find(([tag]) => tag === 'title')?.[1] || 'Unnamed Event';
            const startTag = event.tags.find(([tag]) => tag === 'start')?.[1] || '';
            const location = event.tags.find(([tag]) => tag === 'location')?.[1] || '';
            const url = event.tags.find(([tag]) => tag === 'url')?.[1] || '';

            let dateStr;
            try {
              const dateObj = new Date(startTag);
              if (!isNaN(dateObj)) {
                dateStr = dateObj.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
              } else {
                dateStr = startTag;
              }
            } catch (error) {
              dateStr = startTag;
            }

            return (
              <li key={event.id} className="border-b pb-2">
                <div className="font-bold">{title}</div>
                <div>{dateStr}</div>
                {location && <div>📍 Location: {location}</div>}
                {url && <div>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">🌐 Join event</a>
                </div>}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}