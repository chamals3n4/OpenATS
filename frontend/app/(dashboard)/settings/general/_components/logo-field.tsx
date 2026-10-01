"use client";

import { useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Building02Icon, Upload06Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface LogoFieldProps {
  companyName: string;
  logoSrc: string | null;
  isUploading: boolean;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
}

export function LogoField({
  companyName,
  logoSrc,
  isUploading,
  onSelectFile,
  onRemove,
}: LogoFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const initial = companyName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-4">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300 bg-slate-50 dark:border-neutral-600 dark:bg-neutral-800">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={`${companyName || "Company"} logo`}
            className="h-full w-full object-contain"
          />
        ) : initial ? (
          <span className="text-2xl font-semibold text-theme dark:text-primary">
            {initial}
          </span>
        ) : (
          <HugeiconsIcon
            icon={Building02Icon}
            className="size-7 text-slate-400"
          />
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onSelectFile(file);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="cancel"
            disabled={isUploading}
            onClick={() => fileRef.current?.click()}
            className="h-8 gap-2 px-3 text-sm"
          >
            {isUploading ? (
              <Spinner className="size-3.5" />
            ) : (
              <HugeiconsIcon
                icon={Upload06Icon}
                className="size-4"
                strokeWidth={1.75}
              />
            )}
            {logoSrc ? "Replace logo" : "Upload logo"}
          </Button>
          {logoSrc && (
            <Button
              type="button"
              variant="ghost"
              disabled={isUploading}
              onClick={onRemove}
              className="h-8 px-3 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-neutral-300 dark:hover:bg-red-950/40 dark:hover:text-red-400"
            >
              Remove
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-neutral-400">
          Square images work best. PNG, JPG, WebP, GIF or SVG, up to 10 MB.
        </p>
      </div>
    </div>
  );
}
