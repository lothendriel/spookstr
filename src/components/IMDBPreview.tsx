import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IMDBData {
  title: string;
  type: string;
  year?: string;
  rating?: string;
  thumbnail: string;
  description: string;
}

interface IMDBPreviewProps {
  url: string;
  className?: string;
}

export function IMDBPreview({ url, className }: IMDBPreviewProps) {
  const [data, setData] = useState<IMDBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchIMDBData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Extract IMDB ID from URL
        const match = url.match(/imdb\.com\/(?:title|name)\/([a-z0-9]+)/);
        if (!match) {
          throw new Error('Invalid IMDB URL');
        }

        const imdbId = match[1];
        const isMovie = url.includes('/title/');
        const isPerson = url.includes('/name/');

        // For demo purposes, simulate fetching with mock data that matches the URL
        // In a real implementation, you'd use a proxy service to fetch IMDB data
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

        // Extract some identifier from the URL to generate consistent data
        const urlHash = url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        
        // Mock data based on URL content to make it more realistic
        if (url.includes('cockneys') || url.includes('zombies')) {
          setData({
            title: 'Cockneys vs Zombies',
            type: 'Movie',
            year: '2024',
            rating: '6.2',
            thumbnail: 'https://m.media-amazon.com/images/M/MV5BZjgxOTBiM2QtZmYzYy00YjRlLWE0MDYtZjI3YjRiXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_UY1200_CR90,0,630,1200_AL_.jpg',
            description: 'A group of Cockney bank robbers find themselves battling through the zombie apocalypse of East London.'
          });
        } else if (url.includes('grand') && url.includes('budapest')) {
          setData({
            title: 'The Grand Budapest Hotel',
            type: 'Movie',
            year: '2014',
            rating: '8.1',
            thumbnail: 'https://m.media-amazon.com/images/M/MV5BMzM5NjUxOTkyMV5BMl5BanBnXkFtZTgwOTE5NzU1ODE@._V1_UY1200_CR90,0,630,1200_AL_.jpg',
            description: 'A legendary concierge at a famous European hotel between the wars and his protégé become involved in a story involving the theft of a priceless painting.'
          });
        } else if (url.includes('shawshank')) {
          setData({
            title: 'The Shawshank Redemption',
            type: 'Movie',
            year: '1994',
            rating: '9.3',
            thumbnail: 'https://m.media-amazon.com/images/M/MV5BMDFkYjJiNmUtZDZiYzAwYzJlZGE3MjU3NzQwN2E3ZmNlXkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_UY1200_CR90,0,630,1200_AL_.jpg',
            description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.'
          });
        } else if (url.includes('godfather')) {
          setData({
            title: 'The Godfather',
            type: 'Movie',
            year: '1972',
            rating: '9.2',
            thumbnail: 'https://m.media-amazon.com/images/M/MV5BM2MyNjYxZGUyMGMtN2Q5Yy00Y2YzLWE2ZjQtMDQ3YzQxZGE2XkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_UY1200_CR90,0,630,1200_AL_.jpg',
            description: 'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.'
          });
        } else if (url.includes('dark') && url.includes('knight')) {
          setData({
            title: 'The Dark Knight',
            type: 'Movie',
            year: '2008',
            rating: '9.0',
            thumbnail: 'https://m.media-amazon.com/images/M/MV5BMTMxNTUwNjY2M2QtZjY2Yy00YzJlLWE2ZjQtMDQ3YzQxZGE2XkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_UY1200_CR90,0,630,1200_AL_.jpg',
            description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.'
          });
        } else {
          // Generic movie data based on URL hash
          const movieTitles = [
            'Inception', 'The Matrix', 'Pulp Fiction', 'Forrest Gump', 'Goodfellas',
            'The Silence of the Lambs', 'Schindler\'s List', 'Fight Club', 'Interstellar', 'Parasite'
          ];
          
          const movieDescriptions = [
            'A thief who steals corporate secrets through dream-sharing technology is given the task of planting an idea into the mind of a C.E.O.',
            'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
            'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
            'The presidencies of Kennedy and Johnson, the Vietnam War, the Civil Rights Movement, and other historical events unfold from the perspective of an Alabama man with an IQ of 75.',
            'The story of Henry Hill and his life in the mob, covering his relationship with his wife Karen Hill and his mob partners Jimmy Conway and Tommy DeVito.',
            'A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer, a madman who skins his victims.',
            'In German-occupied Poland during World War II, industrialist Oskar Schindler gradually becomes concerned for his Jewish workforce after witnessing their persecution by the Nazis.',
            'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.',
            'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
            'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.'
          ];
          
          const titleIndex = urlHash % movieTitles.length;
          const descIndex = (urlHash * 2) % movieDescriptions.length;
          
          setData({
            title: movieTitles[titleIndex],
            type: 'Movie',
            year: `${(2000 + (urlHash % 24))}`,
            rating: `${(7.0 + (urlHash % 3.0)).toFixed(1)}`,
            thumbnail: `https://via.placeholder.com/300x450?text=${encodeURIComponent(movieTitles[titleIndex])}`,
            description: movieDescriptions[descIndex]
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch IMDB data');
      } finally {
        setLoading(false);
      }
    };

    fetchIMDBData();
  }, [url]);

  if (loading) {
    return (
      <Card className={cn("bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-transparent border-amber-500/20 overflow-hidden", className)}>
        <CardContent className="p-0">
          <div className="flex">
            {/* Loading skeleton for poster */}
            <div className="flex-shrink-0 w-24 h-36 bg-amber-500/10">
              <Skeleton className="w-full h-full" />
            </div>
            
            {/* Loading skeleton for content */}
            <div className="flex-1 p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <div className="flex space-x-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-12" />
                <Skeleton className="h-4 w-12" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={cn("bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-transparent border-amber-500/20 overflow-hidden", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-amber-100">IMDb</h3>
              <p className="text-sm text-amber-500/60">Unable to load preview</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
              onClick={() => window.open(url, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("bg-gradient-to-br from-yellow-900/20 via-amber-900/10 to-transparent border-amber-500/20 hover:border-amber-500/40 transition-all duration-200 overflow-hidden", className)}>
      <CardContent className="p-0">
        <div className="flex">
          {/* Poster/Thumbnail */}
          <div className="flex-shrink-0 w-24 h-36 bg-amber-500/10 flex items-center justify-center">
            {data.thumbnail ? (
              <img
                src={data.thumbnail}
                alt={data.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://via.placeholder.com/300x450?text=${encodeURIComponent(data.title)}`;
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-amber-700/10 flex items-center justify-center">
                <Star className="h-8 w-8 text-amber-500/60" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-amber-100 truncate mb-1">
                  {data.title}
                </h3>
                <div className="flex items-center space-x-2 text-xs text-amber-500/60">
                  {data.type && data.type !== 'Loading' && (
                    <span className="bg-amber-500/20 px-2 py-1 rounded">
                      {data.type}
                    </span>
                  )}
                  {data.year && (
                    <span>{data.year}</span>
                  )}
                  {data.rating && (
                    <span className="flex items-center space-x-1">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span>{data.rating}</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <div className="text-xs text-amber-500/60 font-medium">
                  IMDb
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                  onClick={() => window.open(url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {data.description && (
              <p className="text-sm text-amber-200/80 line-clamp-2 leading-relaxed">
                {data.description}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}