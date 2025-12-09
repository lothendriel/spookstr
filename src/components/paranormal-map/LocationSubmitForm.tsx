import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Navigation, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useNostrHandler } from './NostrHandler';
import { ParanormalLocation } from '@/types/paranormal';
import { useUploadFile } from '@/hooks/useUploadFile';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface LocationSubmitFormProps {
  onLocationSubmit: (location: ParanormalLocation) => void;
}

export default function LocationSubmitForm({ onLocationSubmit }: LocationSubmitFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    latitude: '',
    longitude: '',
    category: 'ghost',
    locationName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedMedia, setUploadedMedia] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { publishSubmission } = useNostrHandler();
  const { toast } = useToast();
  const { user } = useCurrentUser();
  const { mutateAsync: uploadFile } = useUploadFile();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to upload media',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    const newMediaUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: `${file.name} is larger than 10MB`,
            variant: 'destructive',
          });
          continue;
        }

        // Validate file type
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
          toast({
            title: 'Invalid file type',
            description: `${file.name} is not an image or video`,
            variant: 'destructive',
          });
          continue;
        }

        // Upload the file
        const tags = await uploadFile(file);
        // The first tag contains the URL
        const url = tags[0]?.[1];

        if (url) {
          newMediaUrls.push(url);
        }
      }

      if (newMediaUrls.length > 0) {
        setUploadedMedia(prev => [...prev, ...newMediaUrls]);
        toast({
          title: 'Upload successful',
          description: `${newMediaUrls.length} file(s) uploaded`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload media',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  const handleRemoveMedia = (url: string) => {
    setUploadedMedia(prev => prev.filter(u => u !== url));
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
        category: formData.category,
        locationName: formData.locationName.trim() || undefined,
        media: uploadedMedia.length > 0 ? uploadedMedia : undefined,
      });

      if (result.success) {
        onLocationSubmit(result.data);
        setFormData({
          title: '',
          description: '',
          latitude: '',
          longitude: '',
          category: 'ghost',
          locationName: '',
        });
        setUploadedMedia([]);
        toast({
          title: 'Location submitted successfully!',
          description: 'Your paranormal location has been added to the map',
        });
      }
    } catch (error) {
      console.error('Location submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit location. Please try again.';

      toast({
        title: 'Submission failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lime-400">
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
              className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-lime-500"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Category *
            </label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleInputChange('category', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-gray-100 focus:border-lime-500">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="ghost" className="text-gray-100 focus:bg-gray-700">👻 Ghost / Apparition</SelectItem>
                <SelectItem value="haunting" className="text-gray-100 focus:bg-gray-700">🏚️ Haunting</SelectItem>
                <SelectItem value="poltergeist" className="text-gray-100 focus:bg-gray-700">💥 Poltergeist</SelectItem>
                <SelectItem value="ufo" className="text-gray-100 focus:bg-gray-700">🛸 UFO / UAP</SelectItem>
                <SelectItem value="cryptid" className="text-gray-100 focus:bg-gray-700">🦎 Cryptid</SelectItem>
                <SelectItem value="orb" className="text-gray-100 focus:bg-gray-700">⭕ Orbs / Light Phenomena</SelectItem>
                <SelectItem value="evp" className="text-gray-100 focus:bg-gray-700">🎙️ EVP / Audio Phenomena</SelectItem>
                <SelectItem value="shadow" className="text-gray-100 focus:bg-gray-700">🌑 Shadow Figure</SelectItem>
                <SelectItem value="other" className="text-gray-100 focus:bg-gray-700">❓ Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Location Name
            </label>
            <Input
              value={formData.locationName}
              onChange={(e) => handleInputChange('locationName', e.target.value)}
              placeholder="e.g., Waverly Hills Sanatorium, Louisville, KY"
              className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-lime-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 mt-1">Optional: Human-readable location name</p>
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
              className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-lime-500 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Media Upload Section */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Photos / Videos
            </label>
            <div className="space-y-3">
              {/* Upload Button */}
              <div className="flex items-center gap-2">
                <Input
                  id="media-upload"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isSubmitting || isUploading || !user}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('media-upload')?.click()}
                  disabled={isSubmitting || isUploading || !user}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-lime-500 hover:text-lime-400"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-lime-400 mr-2" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Media
                    </>
                  )}
                </Button>
                <span className="text-xs text-gray-400">
                  {user ? 'Images & videos (max 10MB each)' : 'Login to upload media'}
                </span>
              </div>

              {/* Uploaded Media Preview */}
              {uploadedMedia.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {uploadedMedia.map((url, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-gray-600 bg-gray-700">
                        {url.match(/\.(mp4|webm|mov)$/i) ? (
                          <video
                            src={url}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleRemoveMedia(url)}
                        disabled={isSubmitting}
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {url.match(/\.(mp4|webm|mov)$/i) ? 'Video' : 'Image'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-lime-500"
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
                className="bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-lime-500"
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
              className="flex items-center gap-2 border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-lime-500 hover:text-lime-400"
            >
              <Navigation className="w-4 h-4" />
              Use My Location
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-semibold"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Location'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}