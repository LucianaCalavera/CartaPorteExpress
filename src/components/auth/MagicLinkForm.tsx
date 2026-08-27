"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const magicLinkSchema = z.object({
  email: z.string().trim().toLowerCase().email("Ingresa un correo válido"),
});

type MagicLinkFormValues = z.infer<typeof magicLinkSchema>;

export function MagicLinkForm() {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MagicLinkFormValues>({ resolver: zodResolver(magicLinkSchema) });

  async function onSubmit(values: MagicLinkFormValues) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: values.email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error("No pudimos enviar el link. Intenta de nuevo.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-muted-foreground text-sm">
        Te enviamos un link de acceso a tu correo. Revisa tu bandeja de entrada (y spam).
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo electrónico</Label>
        <Input
          id="email"
          type="email"
          placeholder="tu@empresa.com"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Enviando..." : "Enviar link de acceso"}
      </Button>
    </form>
  );
}
