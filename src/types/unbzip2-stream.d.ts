declare module "unbzip2-stream" {
  import type { Transform } from "node:stream";
  /** Devuelve un stream Transform que descomprime bzip2. */
  export default function unbzip2Stream(): Transform;
}
