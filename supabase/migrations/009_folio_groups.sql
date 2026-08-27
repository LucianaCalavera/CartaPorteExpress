-- Sprint 2: `filas_proceso` pasa a representar un grupo de folio (= un CFDI),
-- no una fila de Excel 1:1. El motor de validación (Sprint 1) agrupa filas por
-- `Folio` porque un viaje puede tener varias mercancías en varias filas.
-- `row_number` se conserva (primera fila del grupo, para orden/UI simple) y se
-- agrega `row_numbers` con el detalle completo + `folio` para mostrar/buscar.
alter table public.filas_proceso
  add column folio text not null default '',
  add column row_numbers int[] not null default '{}';

create index idx_filas_proceso_folio on public.filas_proceso (proceso_id, folio);
