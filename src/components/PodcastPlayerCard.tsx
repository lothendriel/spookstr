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
        <iframe
          allow="autoplay"
          width="100%"
          height="400"
          src="https://www.iheart.com/podcast/1100-the-best-of-coast-to-coas-18899828/?embed=true"
          frameborder="0"
        ></iframe>
      </CardContent>
    </Card>
  );
}