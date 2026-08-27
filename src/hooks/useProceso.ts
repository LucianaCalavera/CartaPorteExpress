"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { revalidarFila, timbrarProceso } from "@/app/(dashboard)/proceso/[id]/actions";
import type { RawExcelRow, FilaStatus, ProcesoStatus } from "@/types/cpe";
import type { ValidationIssue } from "@/lib/utils/errors";

export interface FilaProcesoRow {
  id: string;
  folio: string;
  rowNumbers: number[];
  status: FilaStatus;
  rawData: RawExcelRow[];
  validationErrors: ValidationIssue[];
  uuidTimbre: string | null;
  lastPacError: string | null;
}

export interface ProcesoDetail {
  id: string;
  originalFilename: string | null;
  status: ProcesoStatus;
  validRows: number;
  errorRows: number;
  filas: FilaProcesoRow[];
}

/** Fetch de un proceso + sus filas (grupos de folio), respetando RLS. */
export function useProceso(procesoId: string) {
  const supabase = useSupabase();

  return useQuery({
    queryKey: ["proceso", procesoId],
    queryFn: async (): Promise<ProcesoDetail> => {
      const [{ data: proceso, error: procesoError }, { data: filas, error: filasError }] =
        await Promise.all([
          supabase
            .from("procesos")
            .select("id, original_filename, status, valid_rows, error_rows")
            .eq("id", procesoId)
            .single(),
          supabase
            .from("filas_proceso")
            .select(
              "id, folio, row_numbers, status, raw_data, validation_errors, uuid_timbre, last_pac_response",
            )
            .eq("proceso_id", procesoId)
            .order("row_number", { ascending: true }),
        ]);

      if (procesoError) throw procesoError;
      if (filasError) throw filasError;

      return {
        id: proceso.id,
        originalFilename: proceso.original_filename,
        status: (proceso.status ?? "uploaded") as ProcesoStatus,
        validRows: proceso.valid_rows ?? 0,
        errorRows: proceso.error_rows ?? 0,
        filas: (filas ?? []).map((f) => ({
          id: f.id,
          folio: f.folio,
          rowNumbers: f.row_numbers,
          status: (f.status ?? "pending") as FilaStatus,
          rawData: (f.raw_data ?? []) as unknown as RawExcelRow[],
          validationErrors: (f.validation_errors ?? []) as unknown as ValidationIssue[],
          uuidTimbre: f.uuid_timbre,
          lastPacError:
            f.status === "failed"
              ? ((f.last_pac_response as { error?: string } | null)?.error ?? "Error al timbrar")
              : null,
        })),
      };
    },
  });
}

/** `revalidarFila` (Server Action) + invalidación para que la UI se actualice al instante. */
export function useRevalidarFila(procesoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      filaId,
      correctedRawData,
    }: {
      filaId: string;
      correctedRawData: RawExcelRow[];
    }) => revalidarFila(procesoId, filaId, correctedRawData),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["proceso", procesoId] });
    },
  });
}

/** `timbrarProceso` (Server Action) + invalidación tras terminar el timbrado. */
export function useTimbrarProceso(procesoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (filaIds: string[]) => timbrarProceso(procesoId, filaIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["proceso", procesoId] });
    },
  });
}
