"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mapRowToSchema, setPlantillaValue } from "@/lib/validators/excelRowToCpeSchema";
import { resolveFieldTarget, type FieldTarget } from "@/lib/validators/fieldPathMap";
import { PLANTILLA_COLUMNAS_MAP, type PlantillaKey } from "@/lib/validators/plantillaColumns";
import { useRevalidarFila, type FilaProcesoRow } from "@/hooks/useProceso";
import type { RawExcelRow } from "@/types/cpe";
import type { ValidationIssue } from "@/lib/utils/errors";

const COLUMN_LABEL = new Map<PlantillaKey, string>(
  PLANTILLA_COLUMNAS_MAP.map((c) => [c.key as PlantillaKey, c.header]),
);

/** Clave local de edición: distingue campos de mercancía (por fila) de campos de viaje. */
type EditKey = string;

function editKey(key: PlantillaKey, mercanciaIndex?: number): EditKey {
  return `${mercanciaIndex ?? "trip"}:${key}`;
}

function currentValue(fila: FilaProcesoRow, key: PlantillaKey, mercanciaIndex?: number): string {
  const row = fila.rawData[mercanciaIndex ?? 0];
  if (!row) return "";
  return mapRowToSchema(row)[key] ?? "";
}

function ErrorRowCard({ fila, procesoId }: { fila: FilaProcesoRow; procesoId: string }) {
  const [edits, setEdits] = useState<Record<EditKey, string>>({});
  const mutation = useRevalidarFila(procesoId);

  const setEdit = (key: PlantillaKey, mercanciaIndex: number | undefined, value: string) => {
    setEdits((prev) => ({ ...prev, [editKey(key, mercanciaIndex)]: value }));
  };

  const handleSave = () => {
    let correctedRawData: RawExcelRow[] = fila.rawData.map((r) => ({ ...r }));
    for (const [k, value] of Object.entries(edits)) {
      const [scope, key] = k.split(":") as [string, PlantillaKey];
      if (scope === "trip") {
        correctedRawData = correctedRawData.map((row) => setPlantillaValue(row, key, value));
      } else {
        const idx = Number(scope);
        if (correctedRawData[idx]) {
          correctedRawData[idx] = setPlantillaValue(correctedRawData[idx], key, value);
        }
      }
    }

    mutation.mutate(
      { filaId: fila.id, correctedRawData },
      {
        onSuccess: (result) => {
          if (!result.ok) {
            toast.error(result.error ?? "No se pudo revalidar la fila.");
            return;
          }
          if (result.status === "valid") {
            toast.success(
              `Folio ${fila.folio || fila.id.slice(0, 8)} corregido: ya está listo para timbrar.`,
            );
            setEdits({});
          } else {
            toast.warning("Se guardaron los cambios; todavía quedan errores por corregir.");
          }
        },
        onError: () => toast.error("No se pudo revalidar la fila."),
      },
    );
  };

  const mapped: { issue: ValidationIssue; target: FieldTarget }[] = [];
  const unmapped: ValidationIssue[] = [];
  for (const issue of fila.validationErrors) {
    const target = resolveFieldTarget(issue.field);
    if (target) mapped.push({ issue, target });
    else unmapped.push(issue);
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="font-medium">Folio {fila.folio || "(sin folio)"}</span>{" "}
          <span className="text-muted-foreground text-xs">
            Fila(s) {fila.rowNumbers.join(", ")}
          </span>
        </div>
        <Badge variant="destructive">{fila.validationErrors.length} error(es)</Badge>
      </div>

      {unmapped.length > 0 && (
        <ul className="text-destructive mb-3 list-inside list-disc text-sm">
          {unmapped.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      )}

      {mapped.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campo</TableHead>
              <TableHead>Valor actual</TableHead>
              <TableHead>Mensaje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mapped.map(({ issue, target }, i) => {
              const label = COLUMN_LABEL.get(target.key) ?? target.key;
              const key = editKey(target.key, target.mercanciaIndex);
              const value = edits[key] ?? currentValue(fila, target.key, target.mercanciaIndex);
              return (
                <TableRow key={i}>
                  <TableCell className="font-medium whitespace-normal">
                    {label}
                    {target.mercanciaIndex !== undefined && (
                      <span className="text-muted-foreground">
                        {" "}
                        (mercancía {target.mercanciaIndex + 1})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={value}
                      onChange={(e) => setEdit(target.key, target.mercanciaIndex, e.target.value)}
                      className="min-w-[160px]"
                    />
                  </TableCell>
                  <TableCell className="text-destructive text-xs whitespace-normal">
                    {issue.message}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={mutation.isPending || Object.keys(edits).length === 0}
        >
          {mutation.isPending ? "Guardando…" : "Guardar y re-validar"}
        </Button>
      </div>
    </div>
  );
}

export function ErrorRowEditor({
  filas,
  procesoId,
}: {
  filas: FilaProcesoRow[];
  procesoId: string;
}) {
  if (filas.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No hay errores pendientes en este proceso.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {filas.map((fila) => (
        <ErrorRowCard key={fila.id} fila={fila} procesoId={procesoId} />
      ))}
    </div>
  );
}
