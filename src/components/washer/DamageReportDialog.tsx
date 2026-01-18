import { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useWasherActions, type DamageReport } from '@/hooks/useWasherActions';
import { cn } from '@/lib/utils';

interface DamageReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleId: string;
  vehicleUnit: string;
  queueItemId?: string | null;
  onComplete?: () => void;
}

const DAMAGE_TYPES: { value: DamageReport['damage_type']; label: string }[] = [
  { value: 'SCRATCH', label: 'Scratch' },
  { value: 'DENT', label: 'Dent' },
  { value: 'INTERIOR', label: 'Interior Damage' },
  { value: 'GLASS', label: 'Glass/Window' },
  { value: 'OTHER', label: 'Other' },
];

export function DamageReportDialog({
  open,
  onOpenChange,
  vehicleId,
  vehicleUnit,
  queueItemId,
  onComplete,
}: DamageReportDialogProps) {
  const [damageType, setDamageType] = useState<DamageReport['damage_type'] | ''>('');
  const [damageLocation, setDamageLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { createDamageReport, uploadDamagePhoto } = useWasherActions();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Add new files
    setPhotos((prev) => [...prev, ...files]);

    // Create preview URLs
    const newUrls = files.map((file) => URL.createObjectURL(file));
    setPhotoPreviewUrls((prev) => [...prev, ...newUrls]);
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!damageType) return;

    setIsSubmitting(true);

    try {
      // Create damage report
      const report = await createDamageReport.mutateAsync({
        vehicleId,
        queueItemId,
        damageType,
        damageLocation: damageLocation || null,
        notes: notes || null,
        status: 'SUBMITTED',
      });

      // Upload photos
      for (const photo of photos) {
        await uploadDamagePhoto.mutateAsync({
          damageReportId: report.id,
          file: photo,
        });
      }

      setIsComplete(true);
    } catch (error) {
      console.error('Failed to submit damage report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Cleanup preview URLs
    photoPreviewUrls.forEach((url) => URL.revokeObjectURL(url));

    // Reset form
    setDamageType('');
    setDamageLocation('');
    setNotes('');
    setPhotos([]);
    setPhotoPreviewUrls([]);
    setIsComplete(false);

    onOpenChange(false);
    if (isComplete) {
      onComplete?.();
    }
  };

  if (isComplete) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Report Submitted</h2>
            <p className="text-muted-foreground mb-6">
              Damage report for {vehicleUnit} has been submitted successfully.
            </p>
            <Button onClick={handleClose} className="w-full h-12 text-lg">
              Back to Queue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Report Damage - {vehicleUnit}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-4">
          {/* Damage type */}
          <div className="space-y-2">
            <Label className="text-base">Damage Type *</Label>
            <Select value={damageType} onValueChange={(v) => setDamageType(v as DamageReport['damage_type'])}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select damage type..." />
              </SelectTrigger>
              <SelectContent>
                {DAMAGE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-base py-3">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Damage location */}
          <div className="space-y-2">
            <Label className="text-base">Location on Vehicle</Label>
            <Input
              value={damageLocation}
              onChange={(e) => setDamageLocation(e.target.value)}
              placeholder="e.g., Driver side front door, rear bumper..."
              className="h-12 text-base"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-base">Additional Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe the damage..."
              className="min-h-[100px] text-base"
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-3">
            <Label className="text-base">Photos</Label>

            {/* Photo previews */}
            {photoPreviewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img
                      src={url}
                      alt={`Damage photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-black/50 rounded-full hover:bg-black/70"
                    >
                      <X className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload buttons */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute('capture', 'environment');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Camera className="h-5 w-5 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12"
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.removeAttribute('capture');
                    fileInputRef.current.click();
                  }
                }}
              >
                <Upload className="h-5 w-5 mr-2" />
                Upload
              </Button>
            </div>
          </div>

          {/* Submit button */}
          <Button
            onClick={handleSubmit}
            disabled={!damageType || isSubmitting}
            className={cn(
              'w-full h-14 text-lg',
              'bg-destructive hover:bg-destructive/90'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Damage Report'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
