import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function PodcastPlayerCard() {
  return (
    <Card className="border-lime-500/20 bg-black/40 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lime-400 flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM10 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM14 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM18 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6z" />
          </svg>
          <span>Coast to Coast AM Podcast</span>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4">
        <div className="aspect-video bg-black/30 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <p className="text-lime-500/80 mb-2">Podcast player loading...</p>
            <Button
              onClick={() => window.open('https://www.iheart.com/podcast/coast-to-coast-18899828/', '_blank')}
              variant="outline"
              size="sm"
            >
              Open in New Tab
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}