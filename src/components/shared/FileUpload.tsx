'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface FileUploadProps {
  accept?: string;
  maxSize?: number;
  onUpload: (file: File) => void;
  label?: string;
  className?: string;
}

export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  onUpload,
  label = 'Upload a file',
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      setError(null);

      if (maxSize && file.size > maxSize) {
        const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
        setError(`File size exceeds ${maxMB}MB limit`);
        return false;
      }

      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const fileType = file.type;
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

        const isAccepted = acceptedTypes.some(
          (type) =>
            type === fileType ||
            type === fileExtension ||
            (type.endsWith('/*') && fileType.startsWith(type.replace('/*', '/')))
        );

        if (!isAccepted) {
          setError(`File type not accepted. Accepted: ${accept}`);
          return false;
        }
      }

      return true;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (!validateFile(file)) return;

      setSelectedFile(file);
      setUploadProgress(0);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          onUpload(file);
        }
      }, 150);
    },
    [validateFile, onUpload]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setUploadProgress(0);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, []);

  return (
    <div className={cn('w-full', className)}>
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400'
          )}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <Upload
            className={cn(
              'mb-3 h-8 w-8',
              isDragging ? 'text-primary' : 'text-gray-400'
            )}
          />
          <p className="mb-1 text-sm font-medium text-gray-700">{label}</p>
          <p className="text-xs text-gray-500">
            Drag and drop or click to browse
          </p>
          {maxSize && (
            <p className="mt-1 text-xs text-gray-400">
              Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </p>
          )}
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            aria-label={label}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-gray-100 p-2">
              <FileText className="h-5 w-5 text-gray-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-700">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-400">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">{uploadProgress}% uploaded</p>
            </div>
          )}
          {uploadProgress >= 100 && (
            <p className="mt-2 text-xs font-medium text-green-600">Upload complete</p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
