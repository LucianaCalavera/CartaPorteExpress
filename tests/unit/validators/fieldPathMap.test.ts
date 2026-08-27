import { describe, expect, it } from "vitest";
import { resolveFieldTarget } from "@/lib/validators/fieldPathMap";

describe("resolveFieldTarget", () => {
  it("resuelve un campo trip simple", () => {
    expect(resolveFieldTarget("comprobante.receptor.rfc")).toEqual({ key: "receptorRfc" });
  });

  it("resuelve domicilio de origen (índice 0) y destino (índice 1)", () => {
    expect(resolveFieldTarget("cartaPorte.ubicaciones.0.domicilio.codigoPostal")).toEqual({
      key: "origenCp",
    });
    expect(resolveFieldTarget("cartaPorte.ubicaciones.1.domicilio.codigoPostal")).toEqual({
      key: "destinoCp",
    });
  });

  it("resuelve un campo de mercancía con su índice de fila", () => {
    expect(resolveFieldTarget("cartaPorte.mercancias.mercancia.2.bienesTransp")).toEqual({
      key: "mercClaveProdServ",
      mercanciaIndex: 2,
    });
  });

  it("resuelve el prefijo columna. de inconsistencia de grupo", () => {
    expect(resolveFieldTarget("columna.destinoCp")).toEqual({ key: "destinoCp" });
  });

  it("devuelve null para rutas compuestas o desconocidas", () => {
    expect(resolveFieldTarget("cartaPorte.ubicaciones")).toBeNull();
    expect(resolveFieldTarget("columna.noExiste")).toBeNull();
    expect(resolveFieldTarget("algo.que.no.existe")).toBeNull();
  });
});
