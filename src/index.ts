import express from "express";
import type { NextFunction, Request, Response } from "express";
import { connectDb, getDb } from "./db";
import listingsRouter from "./routes/listings";

const app = express();
const PORT = 3000;

// 1. Registrar cada petición en la terminal
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// 2. Leer bodies JSON
app.use(express.json());

// 3. Rutas
app.get("/api/health", async (_req, res) => {
  await getDb().command({ ping: 1 }); // pregunta a MongoDB "¿estás ahí?"
  res.json({ status: "ok", db: getDb().databaseName });
});

app.use("/api/listings", listingsRouter);

// 4. Ninguna ruta ha respondido: 404
app.use((req, res) => {
  res.status(404).json({ error: `No existe la ruta ${req.method} ${req.url}` });
});

// 5. Ha ocurrido un error: respuesta JSON sin detalles internos
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ error: "El body no es un JSON válido" });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
});

async function start() {
  await connectDb();

  app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
  });
}

start();
