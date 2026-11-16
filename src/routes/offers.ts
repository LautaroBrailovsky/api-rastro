import { Router } from "express";
import { ObjectId } from "mongodb";
import { listingsCollection, offersCollection, usersCollection } from "../db";
import type { Offer } from "../types";

const router = Router();

// ---------- POST /api/offers (hacer una oferta) ----------
router.post("/", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const { listingId, buyerId, amount } = body;

  // 1. Los ids tienen formato de ObjectId
  if (typeof listingId !== "string" || !ObjectId.isValid(listingId)) {
    res.status(400).json({ error: "listingId no tiene un formato válido" });
    return;
  }

  if (typeof buyerId !== "string" || !ObjectId.isValid(buyerId)) {
    res.status(400).json({ error: "buyerId no tiene un formato válido" });
    return;
  }

  // 2. amount es un número mayor que 0
  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "amount tiene que ser un número mayor que 0" });
    return;
  }

  // 3. El anuncio existe (viene en el body, así que es 400 y no 404)
  const listing = await listingsCollection().findOne({ _id: new ObjectId(listingId) });
  if (!listing) {
    res.status(400).json({ error: "No existe ningún anuncio con ese listingId" });
    return;
  }

  // 4. El comprador existe
  const buyer = await usersCollection().findOne({ _id: new ObjectId(buyerId) });
  if (!buyer) {
    res.status(400).json({ error: "No existe ningún usuario con ese buyerId" });
    return;
  }

  // 5. El anuncio está disponible. Si no, la petición choca con el estado actual
  if (listing.status !== "AVAILABLE") {
    res.status(409).json({ error: `No se puede ofertar: el anuncio está ${listing.status}` });
    return;
  }

  // Guardamos copias del anuncio y del comprador (desnormalización)
  const newOffer: Offer = {
    amount,
    status: "PENDING",
    createdAt: new Date(),
    listing: { id: listing._id, title: listing.title, price: listing.price },
    buyer: { id: buyer._id, name: buyer.name },
  };

  const result = await offersCollection().insertOne(newOffer);

  res.status(201).json({ _id: result.insertedId, ...newOffer });
  return;
});

export default router;
