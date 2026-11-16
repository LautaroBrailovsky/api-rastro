import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import { listingsCollection, usersCollection } from "../db";
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
  return;
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
  return;
});

// Comprueba que un valor es un texto con algo dentro
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

// ---------- POST /api/listings (publicar) ----------
router.post("/", async (req, res) => {
  // Si no llega Content-Type: application/json, req.body es undefined
  const body: Record<string, unknown> = req.body ?? {};
  const { title, description, price, category, city, sellerId } = body;

  if (!isNonEmptyString(title)) {
    res.status(400).json({ error: "title es obligatorio y tiene que ser un texto no vacío" });
    return;
  }

  if (!isNonEmptyString(description)) {
    res.status(400).json({ error: "description es obligatorio y tiene que ser un texto no vacío" });
    return;
  }

  if (!isNonEmptyString(category)) {
    res.status(400).json({ error: "category es obligatorio y tiene que ser un texto no vacío" });
    return;
  }

  if (!isNonEmptyString(city)) {
    res.status(400).json({ error: "city es obligatorio y tiene que ser un texto no vacío" });
    return;
  }

  if (typeof price !== "number" || price < 0) {
    res.status(400).json({ error: "price es obligatorio y tiene que ser un número mayor o igual que 0" });
    return;
  }

  let attributes: Record<string, unknown> = {};
  if (body.attributes !== undefined) {
    if (typeof body.attributes !== "object" || body.attributes === null || Array.isArray(body.attributes)) {
      res.status(400).json({ error: "attributes tiene que ser un objeto" });
      return;
    }
    attributes = body.attributes as Record<string, unknown>;
  }

  if (typeof sellerId !== "string" || !ObjectId.isValid(sellerId)) {
    res.status(400).json({ error: "sellerId no tiene un formato válido" });
    return;
  }

  // MongoDB no comprueba las referencias: lo hacemos nosotros
  const seller = await usersCollection().findOne({ _id: new ObjectId(sellerId) });
  if (!seller) {
    res.status(400).json({ error: "No existe ningún usuario con ese sellerId" });
    return;
  }

  // Construimos el anuncio campo a campo. Nunca guardamos req.body tal cual
  const newListing: Listing = {
    title: title.trim(),
    description: description.trim(),
    price,
    category: category.trim(),
    status: "AVAILABLE",
    city: city.trim(),
    publishedAt: new Date(),
    views: 0,
    seller: { id: seller._id, name: seller.name },
    photos: [],
    attributes,
  };

  const result = await listingsCollection().insertOne(newListing);

  res.status(201).json({ _id: result.insertedId, ...newListing });
  return;
});

export default router;
