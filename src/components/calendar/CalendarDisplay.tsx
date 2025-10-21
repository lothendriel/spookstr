import { useState } from 'react';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, parseISO } from 'date-fns';

export default function CalendarDisplay() {
  const { data: events, isLoading } = useCalendarEvents();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = events ? Math.ceil(events.length / itemsPerPage) : 1;
  const currentEvents = events ? events.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : [];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!events?.length) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          No calendar events found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {currentEvents.map(event => {
          const title = String(event.tags.find(([tag]) => tag === 'title')?.[1] || 'Unnamed Event').trim();
          let rawStart = event.tags.find(([tag]) => tag === 'start')?.[1] || '';
          let rawEnd = event.tags.find(([tag]) => tag === 'end')?.[1] || '';
          const startTag = String(rawStart).trim();
          const endTag = String(rawEnd).trim();
          const location = String(event.tags.find(([tag]) => tag === 'location')?.[1] || '').trim();
          const url = String(event.tags.find(([tag]) => tag === 'url')?.[1] || '').trim();

          let dateStr = 'Date missing';

          try {
            let startDate: Date;
            
            const numStart = Number(startTag);
            if (!isNaN(numStart) && startTag.length >= 9 && startTag.length <= 13) {
              startDate = new Date(numStart * 1000);
            } else {
              startDate = parseISO(startTag);
            }

            if (event.kind === 31922) {
              dateStr = format(startDate, 'MMMM d, yyyy');
            } else if (event.kind === 31923) {
              let endTimeStr = '';
              if (endTag) {
                const numEnd = Number(endTag);
                if (!isNaN(numEnd) && endTag.length >= 9 && endTag.length <= 13) {
                  const endTime = new Date(numEnd * 1000);
                  endTimeStr = format(endTime, 'h:mm a');
                } else {
                  const endTime = parseISO(endTag);
                  endTimeStr = format(endTime, 'h:mm a');
                }
              }
              dateStr = `${format(startDate, 'MMMM d, yyyy')} @ ${format(startDate, 'h:mm a')}${endTimeStr ? ` - ${endTimeStr}` : ''}`;
            } else {
              dateStr = 'Invalid event kind';
            }
          } catch (e) {
            dateStr = startTag;
          }

          if (url) {
            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                key={event.id}
                className="block"
              >
                <Card className="shadow-lg transition-transform hover:scale-105 cursor-pointer">
                  <CardContent className="p-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <span className="mr-2">📅</span>
                      {dateStr}
                    </p>
                    {location && (
                      <p className="text-sm text-gray-500 mb-1 flex items-center">
                        <span className="mr-2">📍</span>
                        {location}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </a>
            );
          } else {
            return (
              <Card key={event.id} className="shadow-lg transition-transform hover:scale-105">
                <CardContent className="p-4">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 mb-1 flex items-center">
                    <span className="mr-2">📅</span>
                    {dateStr}
                  </p>
                  {location && (
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
                      <span className="mr-2">📍</span>
                      {location}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          }
        })}
      </div>

      <div className="flex justify-center mt-6 space-x-2">
        <Button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </Button>
        <span className="self-center">Page {currentPage} of {totalPages}</span>
        <Button
          disabled={currentPage === totalPages || totalPages === 0}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}