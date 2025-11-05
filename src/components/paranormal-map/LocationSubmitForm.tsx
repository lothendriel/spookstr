import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useNostrHandler } from './NostrHandler';
import { ParanormalLocation } from '@/types/paranormal';

interface LocationSubmitFormProps {
  onLocationSubmit: (location: ParanormalLocation) => void;
}

export default function LocationSubmitForm({ onLocationSubmit }: LocationSubmitFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: '',
    longitude: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { publishSubmission } = useNostrHandler();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        setIsSubmitting(false);
        toast({
          title: 'Location detected',
          description: 'Coordinates have been filled in automatically',
        });
      },
      (error) => {
        setIsSubmitting(false);
        toast({
          title: 'Location detection failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in both location name and description',
        variant: 'destructive',
      });
      return;
    }

    const latitude = parseFloat(formData.latitude);
    const longitude = parseFloat(formData.longitude);

    if (isNaN(latitude) || isNaN(longitude)) {
      toast({
        title: 'Invalid coordinates',
        description: 'Please enter valid latitude and longitude values',
        variant: 'destructive',
      });
      return;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      toast({
        title: 'Invalid coordinate range',
        description: 'Latitude must be between -90 and 90, longitude between -180 and 180',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await publishSubmission({
        title: formData.title.trim(),
        description: formData.description.trim(),
        latitude,
        longitude,
      });

      if (result.success) {
        onLocationSubmit(result.data);
        setFormData({
          title: '',
          description: '',
          latitude: '',
          longitude: '',
        });
        toast({
          title: 'Location submitted successfully!',
          description: 'Your paranormal location has been added to the map',
        });
      }
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: 'Failed to submit location. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-400">
          <MapPin className="w-5 h-5" />
          Submit Paranormal Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Location Name *
            </label>
            <Input
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Haunted Mansion, UFO Hotspot, etc."
              className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Description / Experience *
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your paranormal experience or what makes this location special..."
              rows={4}
              className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500 resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Latitude *
              </label>
              <Input
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value)}
                placeholder="e.g., 40.7128"
                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Longitude *
              </label>
              <Input
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value)}
                placeholder="e.g., -74.0060"
                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-500"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleUseMyLocation}
              disabled={isSubmitting}
              className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <Navigation className="w-4 h-4" />
              Use My Location
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Location'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}