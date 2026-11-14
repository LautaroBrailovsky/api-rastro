import { Router } from "express";
import { ObjectId } from "mongodb";
import { listingsCollection, offersCollection, usersCollection } from "../db";
import type { Offer } from "../types";

const router = Router();

// ---------- POST /api/offers (hacer una oferta) ----------
router.post("/", async (req, res) => {
  const body: Record<string, unknown> = req.body ?? {};
  const { listingId, buyerId, amount } = body;

  // 1. Los dos ids tienen que tener formato de ObjectId
  if (typeof listingId !== "string" || !ObjectId.isValid(listingId)) {
    res.status(400).json({ error: "listingId no tiene un formato válido" });
    return;
  }

  if (typeof buyerId !== "string" || !ObjectId.isValid(buyerId)) {
    res.status(400).json({ error: "buyerId no tiene un formato válido" });
    return;
  }

  // 2. La cantidad tiene que ser un número mayor que 0
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "amount tiene que ser un número mayor que 0" });
    return;
  }

  // 3. El anuncio tiene que existir (viene en el body, por eso es 400)
  const listing = await listingsCollection().findOne({ _id: new ObjectId(listingId) });
  if (!listing) {
    res.status(400).json({ error: "No existe ningún anuncio con ese listingId" });
    return;
  }

  // 4. El comprador tiene que existir
  const buyer = await usersCollection().findOne({ _id: new ObjectId(buyerId) });
  if (!buyer) {
    res.status(400).json({ error: "No existe ningún usuario con ese buyerId" });
    return;
  }

  // 5. Solo se puede ofertar por anuncios disponibles
  if (listing.status !== "AVAILABLE") {
    res.status(409).json({ error: "El anuncio no está disponible" });
    return;
  }

  // Copias del anuncio y del comprador tal como están ahora
  const newOffer: Offer = {
    amount,
    status: "PENDING",
    createdAt: new Date(),
    listing: { id: listing._id, title: listing.title, price: listing.price },
    buyer: { id: buyer._id, name: buyer.name },
  };

  const result = await offersCollection().insertOne(newOffer);

  res.status(201).json({ _id: result.insertedId, ...newOffer });
});

export default router;
