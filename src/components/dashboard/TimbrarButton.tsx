"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTimbrarProceso } from "@/hooks/useProceso";

export function TimbrarButton({ procesoId, filaIds }: { procesoId: string; filaIds: string[] }) {
  const [open, setOpen] = useState(false);
  const mutation = useTimbrarProceso(procesoId);

  const handleConfirm = () => {
    setOpen(false);
    mutation.mutate(filaIds, {
      onSuccess: (result) => {
        if (!result.ok) {
          toast.error(result.error ?? "No se pudo timbrar.");
          return;
        }
        const mockNote = result.usingMock ? " (simulado — sin credenciales reales del PAC)" : "";
        if (result.failed === 0) {
          toast.success(`¡Listo! ${result.stamped} timbrado(s)${mockNote}.`);
        } else {
          toast.warning(`${result.stamped} timbrado(s), ${result.failed} con error${mockNote}.`);
        }
      },
      onError: () => toast.error("No se pudo timbrar."),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button disabled={filaIds.length === 0 || mutation.isPending}>
            {mutation.isPending ? "Timbrando…" : `Timbrar ${filaIds.length} válido(s)`}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Timbrar {filaIds.length} CFDI?</AlertDialogTitle>
          <AlertDialogDescription>
            Se van a timbrar {filaIds.length} viaje(s) con el PAC. Esta acción tiene costo y no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Timbrar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
