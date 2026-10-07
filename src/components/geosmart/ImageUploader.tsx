import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateImage } from "@/api/uploadApi";
import { toast } from "sonner";

export function ImageUploader({
  label,
  onSelect,
  file,
}: {
  label: string;
  onSelect: (file: File | null) => void;
  file: File | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handle = (next: File | null) => {
    if (!next) {
      setPreview(null);
      onSelect(null);
      return;
    }
    const invalid = validateImage(next);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setPreview(URL.createObjectURL(next));
    onSelect(next);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img src={preview} alt="Selected waste" className="h-48 w-full object-cover" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-2 top-2"
            onClick={() => handle(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ImagePlus className="h-6 w-6" />
          Tap to upload a photo (JPG, PNG, WEBP · max 10 MB)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      {file ? <p className="text-xs text-muted-foreground">{file.name}</p> : null}
    </div>
  );
}
