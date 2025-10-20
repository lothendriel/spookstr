import { useCurrentUser } from '@/hooks/useCurrentUser';
import EventForm from '@/components/calendar/EventForm';
import CalendarDisplay from '@/components/calendar/CalendarDisplay';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function CalendarPage() {
  const { user } = useCurrentUser();

  return (
    <div className="container mx-auto p-4">
      {user ? (
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-3xl">My Calendar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EventForm />
            <CalendarDisplay />
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg">Please log in to view your personal calendar.</p>
        </div>
      )}
    </div>
  );
}