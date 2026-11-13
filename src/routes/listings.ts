import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import { listingsCollection } from "../db";
import type { Listing } from "../types";

const router = Router();

// Lo que se enseña de cada anuncio en un listado
const LIST_FIELDS = { title: 1, price: 1, category: 1, city: 1, status: 1 };

// ---------- GET /api/listings (listado) ----------
router.get("/", async (req, res) => {
  const filter: Filter<Listing> = {};

  if (typeof req.query.category === "string") {
    filter.category = req.query.category;
  }

  if (typeof req.query.city === "string") {
    filter.city = req.query.city;
  }

  // maxPrice llega como texto, hay que pasarlo a número
  if (req.query.maxPrice !== undefined) {
    const maxPrice = Number(req.query.maxPrice);

    if (Number.isNaN(maxPrice)) {
      res.status(400).json({ error: "maxPrice tiene que ser un número" });
      return;
    }

    filter.price = { $lte: maxPrice };
  }

  const listings = await listingsCollection()
    .find(filter)
    .project(LIST_FIELDS)
    .sort({ publishedAt: -1 })
    .toArray();

  res.json(listings);
});

// ---------- GET /api/listings/:id (ficha) ----------
router.get("/:id", async (req, res) => {
  // Si el id no tiene formato de ObjectId ni lo buscamos
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  // Suma una visita y devuelve el anuncio ya actualizado
  const listing = await listingsCollection().findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $inc: { views: 1 } },
    { returnDocument: "after" }
  );

  if (!listing) {
    res.status(404).json({ error: "Anuncio no encontrado" });
    return;
  }

  res.json(listing);
});

export default router;
