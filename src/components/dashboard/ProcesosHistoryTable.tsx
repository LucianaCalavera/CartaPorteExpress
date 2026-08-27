"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProcesoSummary } from "@/types/api";

const STATUS_LABELS: Record<string, string> = {
  uploaded: "Subido",
  validating: "Validando",
  validated: "Validado",
  stamping: "Timbrando",
  completed: "Completado",
  failed: "Falló",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  uploaded: "secondary",
  validating: "secondary",
  validated: "outline",
  stamping: "secondary",
  completed: "default",
  failed: "destructive",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
}

export function ProcesosHistoryTable({ procesos }: { procesos: ProcesoSummary[] }) {
  const router = useRouter();

  if (procesos.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center text-sm">
        Aún no has subido ningún Excel. Sube tu primer archivo arriba para validarlo.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Archivo</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Listos</TableHead>
          <TableHead className="text-right">Errores</TableHead>
          <TableHead className="text-right">Timbrados</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {procesos.map((p) => (
          <TableRow
            key={p.id}
            className="cursor-pointer"
            onClick={() => router.push(`/proceso/${p.id}`)}
          >
            <TableCell className="font-medium">{p.originalFilename ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[p.status] ?? "secondary"}>
                {STATUS_LABELS[p.status] ?? p.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{p.validRows}</TableCell>
            <TableCell className="text-right">{p.errorRows}</TableCell>
            <TableCell className="text-right">{p.stampedRows}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
