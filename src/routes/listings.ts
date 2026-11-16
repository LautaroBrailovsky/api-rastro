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

  if (req.query.maxPrice !== undefined) {
    // Llega como texto. Ojo: Number("") da 0, por eso miramos también que no venga vacío
    const maxPrice = typeof req.query.maxPrice === "string" ? req.query.maxPrice.trim() : "";
    const maxPriceNumber = Number(maxPrice);

    if (maxPrice === "" || Number.isNaN(maxPriceNumber)) {
      res.status(400).json({ error: "maxPrice tiene que ser un número" });
      return;
    }

    filter.price = { $lte: maxPriceNumber };
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
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  // Alguien abre la ficha: sumamos 1 a las visitas y devolvemos el anuncio ya cambiado
  const listing = await listingsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $inc: { views: 1 } },
    { returnDocument: "after" },
  );

  if (!listing) {
    res.status(404).json({ error: "No existe ningún anuncio con ese id" });
    return;
  }

  res.json(listing);
});

export default router;
