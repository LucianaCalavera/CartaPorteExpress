"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultsTable } from "@/components/dashboard/ResultsTable";
import { ErrorRowEditor } from "@/components/dashboard/ErrorRowEditor";
import { StampedRowsTable } from "@/components/dashboard/StampedRowsTable";
import { TimbrarButton } from "@/components/dashboard/TimbrarButton";
import { Button } from "@/components/ui/button";
import { useProceso } from "@/hooks/useProceso";

export function ProcesoDetail({ procesoId }: { procesoId: string }) {
  const { data, isLoading, error } = useProceso(procesoId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return <p className="text-destructive text-sm">No se pudo cargar el proceso.</p>;
  }

  const validas = data.filas.filter((f) => f.status === "valid");
  const invalidas = data.filas.filter((f) => f.status === "invalid");
  const timbradas = data.filas.filter((f) => f.status === "stamped" || f.status === "failed");
  const hayStampedParaDescargar = data.filas.some((f) => f.status === "stamped");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">{data.originalFilename ?? "Proceso"}</h1>
        <p className="text-muted-foreground text-sm">
          {data.validRows} listos para timbrar · {data.errorRows} con errores
        </p>
      </div>

      <Tabs defaultValue="listos">
        <TabsList>
          <TabsTrigger value="listos">Listos para timbrar ({validas.length})</TabsTrigger>
          <TabsTrigger value="errores">Errores de validación ({invalidas.length})</TabsTrigger>
          <TabsTrigger value="timbrados">Timbrados ({timbradas.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="listos" className="flex flex-col gap-3">
          {validas.length > 0 && (
            <div className="flex justify-end">
              <TimbrarButton procesoId={procesoId} filaIds={validas.map((f) => f.id)} />
            </div>
          )}
          <ResultsTable filas={validas} />
        </TabsContent>
        <TabsContent value="errores">
          <ErrorRowEditor filas={invalidas} procesoId={procesoId} />
        </TabsContent>
        <TabsContent value="timbrados" className="flex flex-col gap-3">
          {hayStampedParaDescargar && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                render={<a href={`/api/descargar?procesoId=${procesoId}&tipo=xml`} />}
              >
                Descargar XML
              </Button>
              <Button
                variant="outline"
                size="sm"
                render={<a href={`/api/descargar?procesoId=${procesoId}&tipo=pdf`} />}
              >
                Descargar PDF
              </Button>
              <Button render={<a href={`/api/descargar?procesoId=${procesoId}&tipo=zip_todos`} />}>
                Descargar todo (ZIP)
              </Button>
            </div>
          )}
          <StampedRowsTable filas={timbradas} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
