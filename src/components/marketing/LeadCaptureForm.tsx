"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSupabase } from "@/components/providers/SupabaseProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const leadSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
});

type LeadFormValues = z.infer<typeof leadSchema>;

export function LeadCaptureForm() {
  const supabase = useSupabase();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({ resolver: zodResolver(leadSchema) });

  async function onSubmit(values: LeadFormValues) {
    const { error } = await supabase.from("leads").insert({ email: values.email });

    if (error) {
      toast.error("No pudimos registrar tu correo. Intenta de nuevo.");
      return;
    }

    toast.success("¡Listo! Te avisamos en cuanto tengamos un lugar disponible.");
    reset();
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="flex w-full max-w-sm flex-col gap-2 sm:flex-row"
    >
      <div className="flex-1">
        <Input
          type="email"
          placeholder="tu@empresa.com"
          aria-label="Correo electrónico"
          {...register("email")}
        />
        {errors.email && <p className="text-destructive mt-1 text-sm">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Quiero probarlo"}
      </Button>
    </form>
  );
}
