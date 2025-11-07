import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { getDisplayName } from '@/lib/getDisplayName';
import { ShoppingCart, ExternalLink, MapPin, DollarSign, Package, Truck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { NostrEvent } from '@nostrify/nostrify';

interface MarketplaceListingProps {
  event: NostrEvent;
  className?: string;
}

export function MarketplaceListing({ event, className }: MarketplaceListingProps) {
  const author = useAuthor(event.pubkey);
  const metadata = author.data?.metadata;
  const displayName = getDisplayName(metadata, event.pubkey);

  // Extract listing data from tags
  const title = event.tags.find(([name]) => name === 'title')?.[1] || 'Untitled Item';
  const summary = event.tags.find(([name]) => name === 'summary')?.[1] || '';
  const image = event.tags.find(([name]) => name === 'image')?.[1] || '';
  const price = event.tags.find(([name]) => name === 'price')?.[1];
  const currency = event.tags.find(([name]) => name === 'currency')?.[1] || 'sats';
  const location = event.tags.find(([name]) => name === 'location')?.[1];
  const shipping = event.tags.find(([name]) => name === 'shipping')?.[1];
  const condition = event.tags.find(([name]) => name === 'condition')?.[1];
  const category = event.tags.find(([name]) => name === 'category')?.[1];
  const status = event.tags.find(([name]) => name === 'status')?.[1] || 'available';

  // Extract contact methods
  const contactMethods = event.tags
    .filter(([name]) => ['email', 'phone', 'website', 'social'].includes(name))
    .map(([type, value]) => ({ type, value }));

  // Extract hashtags  
  const hashtags = event.tags.filter(([name]) => name === 't').map(([, tag]) => tag);

  // Extract multiple images
  const images = event.tags.filter(([name]) => name === 'image').map(([, url]) => url);
  const primaryImage = images[0] || image;

  const timeAgo = formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true });

  // Format price display
  const formatPrice = () => {
    if (!price) return null;
    
    if (currency.toLowerCase() === 'btc') {
      return `₿${price}`;
    } else if (currency.toLowerCase() === 'sats') {
      return `${parseInt(price).toLocaleString()} sats`;
    } else if (currency.toLowerCase() === 'usd') {
      return `$${price}`;
    } else {
      return `${price} ${currency.toUpperCase()}`;
    }
  };

  // Get status styling
  const getStatusBadge = () => {
    switch (status.toLowerCase()) {
      case 'available':
        return (
          <Badge className="bg-green-600 hover:bg-green-700">
            <Package className="h-3 w-3 mr-1" />
            Available
          </Badge>
        );
      case 'sold':
        return (
          <Badge variant="destructive">
            Sold
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-600 hover:bg-yellow-700">
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card className={`border-green-500/30 bg-gradient-to-br from-green-900/20 to-emerald-900/20 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border-2 border-green-500/30">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="bg-green-500/20 text-green-400">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-green-300">{displayName}</div>
              <div className="text-xs text-green-400/70">
                Listing • {timeAgo}
              </div>
            </div>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Product Image */}
        <div className="relative mb-4 rounded-lg overflow-hidden bg-black/40">
          {primaryImage ? (
            <div className="aspect-square relative group">
              <img
                src={primaryImage}
                alt={title}
                className="w-full h-full object-cover"
              />
              {images.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                  +{images.length - 1} more
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square bg-gradient-to-br from-green-800/50 to-emerald-800/50 flex items-center justify-center">
              <Package className="h-16 w-16 text-white/70" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-3">
          <div>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-lg text-green-100 flex-1">{title}</h3>
              {price && (
                <div className="text-xl font-bold text-green-400 ml-3">
                  {formatPrice()}
                </div>
              )}
            </div>
            {summary && (
              <p className="text-sm text-green-200/80 line-clamp-3">{summary}</p>
            )}
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-2 gap-2 text-xs text-green-300/70">
            {condition && (
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                Condition: {condition}
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </div>
            )}
            {shipping && (
              <div className="flex items-center gap-1">
                <Truck className="h-3 w-3" />
                Shipping: {shipping}
              </div>
            )}
            {category && (
              <div className="flex items-center gap-1">
                <Package className="h-3 w-3" />
                {category}
              </div>
            )}
          </div>

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {hashtags.slice(0, 5).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-xs border-green-500/30 text-green-300 hover:bg-green-500/10"
                >
                  #{tag}
                </Badge>
              ))}
              {hashtags.length > 5 && (
                <Badge variant="outline" className="text-xs border-green-500/30 text-green-300/70">
                  +{hashtags.length - 5} more
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={status === 'sold'}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {status === 'sold' ? 'Sold Out' : 'Contact Seller'}
            </Button>
          </div>

          {/* Contact Methods */}
          {contactMethods.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-green-300/70 hover:text-green-300">
                Contact Information
              </summary>
              <div className="mt-2 space-y-1 pl-4">
                {contactMethods.map(({ type, value }) => (
                  <div key={`${type}-${value}`} className="flex items-center gap-2 text-xs">
                    <span className="capitalize text-green-300/70">{type}:</span>
                    <span className="text-green-200">{value}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </CardContent>
    </Card>
  );
}