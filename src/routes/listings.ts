import { Router } from "express";
import { ObjectId } from "mongodb";
import type { Filter } from "mongodb";
import { listingsCollection, offersCollection, usersCollection } from "../db";
import type { Listing } from "../types";

const router = Router();

// Lo que se enseña de cada anuncio en un listado
const LIST_FIELDS = { title: 1, price: 1, category: 1, city: 1, status: 1 };

// true si es un texto con algo dentro (no vale "" ni "   ")
function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "";
}

// true si es un objeto normal (no vale null ni un array)
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

// ---------- GET /api/listings/:id/offers (ofertas de un anuncio) ----------
router.get("/:id/offers", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  const listingId = new ObjectId(req.params.id);

  // findOne y no findOneAndUpdate: mirar las ofertas no cuenta como visita
  const listing = await listingsCollection().findOne({ _id: listingId });
  if (!listing) {
    res.status(404).json({ error: "Anuncio no encontrado" });
    return;
  }

  // Las ofertas guardan el id del anuncio en listing.id
  const offers = await offersCollection().find({ "listing.id": listingId }).toArray();

  res.json(offers);
});

// ---------- POST /api/listings (publicar) ----------
router.post("/", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const { title, description, price, category, city } = body;

  if (!isText(title) || !isText(description) || !isText(category) || !isText(city)) {
    res.status(400).json({ error: "title, description, category y city son obligatorios y tienen que ser texto" });
    return;
  }

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    res.status(400).json({ error: "price tiene que ser un número mayor o igual que 0" });
    return;
  }

  if (typeof body.sellerId !== "string" || !ObjectId.isValid(body.sellerId)) {
    res.status(400).json({ error: "sellerId no tiene un formato válido" });
    return;
  }

  // attributes es opcional: si no llega, objeto vacío
  const attributes = body.attributes ?? {};
  if (!isObject(attributes)) {
    res.status(400).json({ error: "attributes tiene que ser un objeto" });
    return;
  }

  // MongoDB no comprueba las referencias: lo hacemos nosotros
  const seller = await usersCollection().findOne({ _id: new ObjectId(body.sellerId) });
  if (!seller) {
    res.status(400).json({ error: "No existe ningún usuario con ese sellerId" });
    return;
  }

  // Se construye campo a campo, nunca se guarda req.body tal cual
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
});

// ---------- PATCH /api/listings/:id (cambiar el precio) ----------
router.patch("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  // Solo se lee price, el resto del body se ignora
  const price: unknown = req.body?.price;

  if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
    res.status(400).json({ error: "price tiene que ser un número mayor o igual que 0" });
    return;
  }

  const listing = await listingsCollection().findOneAndUpdate(
    { _id: new ObjectId(req.params.id) },
    { $set: { price } },
    { returnDocument: "after" }
  );

  if (!listing) {
    res.status(404).json({ error: "Anuncio no encontrado" });
    return;
  }

  res.json(listing);
});

// ---------- DELETE /api/listings/:id (borrar) ----------
router.delete("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) {
    res.status(400).json({ error: "El id no tiene un formato válido" });
    return;
  }

  const result = await listingsCollection().deleteOne({ _id: new ObjectId(req.params.id) });

  // Si no ha borrado nada es que no existía
  if (result.deletedCount === 0) {
    res.status(404).json({ error: "Anuncio no encontrado" });
    return;
  }

  res.status(204).send();
});

export default router;
