import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useUploadFile } from '@/hooks/useUploadFile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MediaDisplay } from '@/components/MediaDisplay';
import { Ghost, MapPin, Upload, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { nanoid } from 'nanoid';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  location: z.string().min(1, 'Location is required').max(200, 'Location too long'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.enum(['ghosts', 'ufos', 'cryptids', 'supernatural', 'unexplained', 'urban_legends']),
  encounterType: z.string().optional(),
  encounterDate: z.string().optional(),
  evidenceLevel: z.enum(['none', 'low', 'medium', 'high']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

type FormData = z.infer<typeof formSchema>;

const categoryOptions = [
  { value: 'ghosts', label: '👻 Ghosts & Spirits', description: 'Apparitions, hauntings, EVP recordings' },
  { value: 'ufos', label: '👽 UFOs & Aliens', description: 'UFO sightings, alien encounters, abductions' },
  { value: 'cryptids', label: '🦸 Cryptids', description: 'Bigfoot, Loch Ness Monster, other creatures' },
  { value: 'supernatural', label: '🔮 Supernatural', description: 'Demonic activity, possessions, miracles' },
  { value: 'unexplained', label: '❓ Unexplained', description: 'Mysterious phenomena that don\'t fit other categories' },
  { value: 'urban_legends', label: '🏚️ Urban Legends', description: 'Locations associated with local legends' },
];

const evidenceLevels = [
  { value: 'none', label: 'No Evidence', description: 'Personal testimony only' },
  { value: 'low', label: 'Low Evidence', description: 'Minor evidence (unclear photos, personal recordings)' },
  { value: 'medium', label: 'Medium Evidence', description: 'Substantial evidence (clear photos, multiple witnesses)' },
  { value: 'high', label: 'High Evidence', description: 'Compelling evidence (video, scientific measurements)' },
];

interface AddLocationFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialPosition?: { lat: number; lng: number };
  className?: string;
}

export function AddLocationForm({ onSuccess, onCancel, initialPosition, className }: AddLocationFormProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { mutate: publishEvent, isPending: isPublishing } = useNostrPublish();
  const { mutateAsync: uploadFile } = useUploadFile();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      latitude: initialPosition?.lat || 0,
      longitude: initialPosition?.lng || 0,
      evidenceLevel: 'none',
    },
  });

  const watchedCategory = watch('category');
  const watchedEvidenceLevel = watch('evidenceLevel');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      const newUrls: string[] = [];
      
      for (const file of files) {
        const [[_, url]] = await uploadFile(file);
        newUrls.push(url);
      }
      
      setUploadedUrls(prev => [...prev, ...newUrls]);
      setUploadedFiles(prev => [...prev, ...files]);
      
      toast.success(`Successfully uploaded ${files.length} file(s)`);
    } catch (error) {
      toast.error('Failed to upload files');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const removeFile = (index: number) => {
    setUploadedUrls(prev => prev.filter((_, i) => i !== index));
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    try {
      // Generate unique identifier for this location
      const locationId = nanoid();
      
      // Simple geohash generation (in production, use a proper geohash library)
      const geohash = generateSimpleGeohash(data.latitude, data.longitude);
      
      const tags = [
        ['d', locationId],
        ['title', data.title],
        ['location', data.location],
        ['g', geohash],
        ['t', data.category],
        ['evidence_level', data.evidenceLevel],
        ['alt', 'Paranormal encounter location data'],
      ];

      // Add optional tags
      if (data.encounterType) {
        tags.push(['encounter_type', data.encounterType]);
      }
      
      if (data.encounterDate) {
        tags.push(['encounter_date', data.encounterDate]);
      }

      // Add image URLs
      uploadedUrls.forEach(url => {
        tags.push(['image', url]);
      });

      publishEvent({
        kind: 7479,
        content: data.description,
        tags,
      }, {
        onSuccess: () => {
          toast.success('Paranormal location reported successfully!');
          reset();
          setUploadedUrls([]);
          setUploadedFiles([]);
          onSuccess?.();
        },
        onError: (error) => {
          toast.error('Failed to report location');
          console.error('Publish error:', error);
        },
      });
    } catch (error) {
      toast.error('An error occurred while submitting the report');
      console.error('Submit error:', error);
    }
  };

  // Simple geohash generation (very basic approximation)
  function generateSimpleGeohash(lat: number, lng: number): string {
    const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
    let hash = '';
    
    // Convert to positive coordinates
    const latNormalized = (lat + 90) / 180;
    const lngNormalized = (lng + 180) / 360;
    
    // Generate a simple 6-character geohash
    for (let i = 0; i < 6; i++) {
      const latIndex = Math.floor(latNormalized * 32);
      const lngIndex = Math.floor(lngNormalized * 32);
      hash += base32[latIndex];
      if (i < 5) hash += base32[lngIndex];
    }
    
    return hash;
  }

  return (
    <div className={className}>
      <Card className="border-lime-500/20">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Ghost className="h-6 w-6 text-lime-400" />
            Report Paranormal Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-lime-100">
                  Location Title *
                </Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g., The Haunted Mansion on Elm Street"
                  className="bg-black/40 border-lime-500/20 text-lime-100 placeholder:text-lime-500/60"
                />
                {errors.title && (
                  <p className="text-sm text-red-400 mt-1">{errors.title.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="location" className="text-lime-100">
                  Location Address/Description *
                </Label>
                <Textarea
                  id="location"
                  {...register('location')}
                  placeholder="e.g., 123 Elm Street, Springfield, OR - Old abandoned Victorian house"
                  className="bg-black/40 border-lime-500/20 text-lime-100 placeholder:text-lime-500/60"
                  rows={2}
                />
                {errors.location && (
                  <p className="text-sm text-red-400 mt-1">{errors.location.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="description" className="text-lime-100">
                  Encounter Description *
                </Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe what you experienced, saw, or felt at this location..."
                  className="bg-black/40 border-lime-500/20 text-lime-100 placeholder:text-lime-500/60"
                  rows={4}
                />
                {errors.description && (
                  <p className="text-sm text-red-400 mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>

            {/* Category and Evidence */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-lime-100">
                  Paranormal Category *
                </Label>
                <Select onValueChange={(value) => setValue('category', value as any)}>
                  <SelectTrigger className="bg-black/40 border-lime-500/20 text-lime-100">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-lime-500/60">{option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-400 mt-1">{errors.category.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="evidenceLevel" className="text-lime-100">
                  Evidence Level *
                </Label>
                <Select onValueChange={(value) => setValue('evidenceLevel', value as any)}>
                  <SelectTrigger className="bg-black/40 border-lime-500/20 text-lime-100">
                    <SelectValue placeholder="Select evidence level" />
                  </SelectTrigger>
                  <SelectContent>
                    {evidenceLevels.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <div className="flex flex-col">
                          <span>{level.label}</span>
                          <span className="text-xs text-lime-500/60">{level.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.evidenceLevel && (
                  <p className="text-sm text-red-400 mt-1">{errors.evidenceLevel.message}</p>
                )}
              </div>
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="encounterType" className="text-lime-100">
                  Encounter Type
                </Label>
                <Input
                  id="encounterType"
                  {...register('encounterType')}
                  placeholder="e.g., Apparition, UFO Sighting, Bigfoot Track"
                  className="bg-black/40 border-lime-500/20 text-lime-100 placeholder:text-lime-500/60"
                />
              </div>

              <div>
                <Label htmlFor="encounterDate" className="text-lime-100">
                  Encounter Date
                </Label>
                <Input
                  id="encounterDate"
                  type="date"
                  {...register('encounterDate')}
                  className="bg-black/40 border-lime-500/20 text-lime-100"
                />
              </div>
            </div>

            {/* Coordinates (hidden, set by map click) */}
            <div className="hidden">
              <Input {...register('latitude', { valueAsNumber: true })} type="number" step="any" />
              <Input {...register('longitude', { valueAsNumber: true })} type="number" step="any" />
            </div>

            {/* Evidence Upload */}
            <div>
              <Label className="text-lime-100">
                Evidence Photos/Videos
              </Label>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('file-upload')?.click()}
                    disabled={isUploading}
                    className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Evidence
                  </Button>
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {isUploading && (
                    <span className="text-sm text-lime-500/60">Uploading files...</span>
                  )}
                </div>

                {/* Uploaded Files Preview */}
                {uploadedUrls.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {uploadedUrls.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden border border-lime-500/20">
                          <MediaDisplay
                            url={url}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-lime-500/20">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting || isPublishing}
                  className="border-lime-500/50 text-lime-400 hover:bg-lime-500/10"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={isSubmitting || isPublishing || isUploading}
                className="bg-lime-500 hover:bg-lime-600 text-black"
              >
                {isSubmitting || isPublishing ? (
                  <>
                    <Ghost className="h-4 w-4 mr-2 animate-pulse" />
                    Reporting...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Report Location
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}