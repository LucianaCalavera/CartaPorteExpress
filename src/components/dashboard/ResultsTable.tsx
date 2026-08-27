import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mapRowToSchema } from "@/lib/validators/excelRowToCpeSchema";
import type { FilaProcesoRow } from "@/hooks/useProceso";

function sumPeso(rows: FilaProcesoRow["rawData"]): number {
  return rows.reduce((acc, row) => {
    const raw = mapRowToSchema(row).mercPesoKg ?? "0";
    const n = Number(raw.replace(/,/g, ""));
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

export function ResultsTable({ filas }: { filas: FilaProcesoRow[] }) {
  if (filas.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        No hay filas listas para timbrar todavía.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Fila(s)</TableHead>
          <TableHead>RFC Cliente</TableHead>
          <TableHead>Origen → Destino</TableHead>
          <TableHead>Mercancía</TableHead>
          <TableHead className="text-right">Peso (kg)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => {
          const trip = mapRowToSchema(f.rawData[0] ?? {});
          const mercancias = [
            ...new Set(f.rawData.map((r) => mapRowToSchema(r).mercDescripcion).filter(Boolean)),
          ];
          return (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.folio || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{f.rowNumbers.join(", ")}</TableCell>
              <TableCell>{trip.receptorRfc}</TableCell>
              <TableCell>
                {trip.origenCp} → {trip.destinoCp}
              </TableCell>
              <TableCell className="max-w-[220px] truncate" title={mercancias.join(", ")}>
                {mercancias.join(", ") || "—"}
              </TableCell>
              <TableCell className="text-right">
                {sumPeso(f.rawData).toLocaleString("es-MX")}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
