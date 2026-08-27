"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { APP_CONFIG } from "@/lib/constants/appConfig";
import type { ProcesarResponse } from "@/types/api";

const ACCEPTED_MIME = {
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "text/csv": [".csv"],
};

export function DropzoneValidator() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        toast.error(fileRejections[0]?.errors[0]?.message ?? "Archivo no válido.");
        return;
      }
      const file = acceptedFiles[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/procesar", { method: "POST", body: formData });
        const data: ProcesarResponse = await res.json();

        if (!res.ok || "error" in data) {
          toast.error("error" in data ? data.error : "No se pudo procesar el archivo.");
          return;
        }

        toast.success("Archivo procesado. Revisa los resultados.");
        router.push(`/proceso/${data.procesoId}`);
      } catch {
        toast.error("Error de red al subir el archivo.");
      } finally {
        setIsUploading(false);
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_MIME,
    maxSize: APP_CONFIG.MAX_EXCEL_FILE_SIZE_MB * 1024 * 1024,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors",
        isDragActive ? "border-primary bg-primary/5" : "border-border",
        isUploading && "pointer-events-none opacity-60",
      )}
    >
      <input {...getInputProps()} />
      {isUploading ? (
        <>
          <FileSpreadsheet className="text-muted-foreground size-8 animate-pulse" />
          <p className="text-sm font-medium">Validando tu archivo…</p>
        </>
      ) : (
        <>
          <UploadCloud className="text-muted-foreground size-8" />
          <p className="text-sm font-medium">Arrastra tu Excel o haz clic para subirlo</p>
          <p className="text-muted-foreground text-xs">
            .xlsx o .csv, máximo {APP_CONFIG.MAX_EXCEL_FILE_SIZE_MB} MB
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-2">
            Seleccionar archivo
          </Button>
        </>
      )}
    </div>
  );
}
