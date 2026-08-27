import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FilaProcesoRow } from "@/hooks/useProceso";

export function StampedRowsTable({ filas }: { filas: FilaProcesoRow[] }) {
  if (filas.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Todavía no se ha timbrado nada en este proceso.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>UUID / Error</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filas.map((f) => (
          <TableRow key={f.id}>
            <TableCell className="font-medium">{f.folio || "—"}</TableCell>
            <TableCell>
              {f.status === "stamped" ? (
                <Badge>Timbrado</Badge>
              ) : (
                <Badge variant="destructive">Error</Badge>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground font-mono text-xs whitespace-normal">
              {f.status === "stamped" ? f.uuidTimbre : f.lastPacError}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
