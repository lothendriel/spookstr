import { useNostrPublish } from "@/hooks/useNostrPublish";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export default function EventForm() {
  const [title, setTitle] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [categories, setCategories] = useState('');
  const { toast } = useToast();
  const { mutate: publishEvent, isPending } = useNostrPublish();

  const resetForm = () => {
    setTitle('');
    setAllDay(true);
    setSelectedDate(new Date());
    setStartTime('09:00');
    setEndTime('17:00');
    setLocation('');
    setUrl('');
    setCategories('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = crypto.randomUUID();
    const eventKind = allDay ? 31922 : 31923;
    const startDate = new Date(selectedDate as Date);
    let startStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
    let endStr: string | undefined = undefined;

    if (!allDay) {
      // For timed events, combine date with time
      startStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}T${startTime}:00`;
      if (endTime) {
        endStr = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}T${endTime}:00`;
      }
    }

    const tags = [
      ['d', id],
      ['title', title],
      ['start', startStr],
    ];

    if (endStr) {
      tags.push(['end', endStr]);
    }

    if (location) {
      tags.push(['location', location]);
    }

    if (url) {
      tags.push(['url', url]);
    }

    if (categories) {
      const catArray = categories.split(',').map(c => c.trim());
      catArray.forEach(cat => tags.push(['t', cat]));
    }

    publishEvent(
      { event: { kind: eventKind, content: '', tags } },
      {
        onSuccess: () => {
          toast({
            title: "Event created successfully!",
            description: "Your calendar event has been published to Nostr.",
          });
          resetForm();
        },
        onError: (error) => {
          toast({
            title: "Failed to create event",
            description: error instanceof Error ? error.message : "An error occurred while publishing your event.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">Event Title</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="date">Date</Label>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border p-2"
        />
      </div>
      <div>
        <Label>Is All Day?</Label>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="isAllDay"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
          />
          <Label htmlFor="isAllDay">All Day Event</Label>
        </div>
      </div>
      {!allDay && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="startTime">Start Time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="endTime">End Time</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>
      )}
      <div>
        <Label htmlFor="location">Location (optional)</Label>
        <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="url">URL (optional)</Label>
        <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="categories">Categories (comma separated, e.g. work, meeting)</Label>
        <Input id="categories" value={categories} onChange={(e) => setCategories(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating Event..." : "Create Event"}
      </Button>
    </form>
  );
}