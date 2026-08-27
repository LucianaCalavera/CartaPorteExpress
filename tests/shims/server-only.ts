// Shim de test para el marker package `server-only`: en Next.js el bundler
// resuelve la condición `react-server` y no ejecuta nada; en Vitest no hay
// bundler de Next, así que aliaseamos el paquete a un módulo vacío para poder
// testear lib/ que se importa exclusivamente desde Server Components/Actions.
export {};
