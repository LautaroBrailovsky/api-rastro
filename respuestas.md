# Respuestas

## Ejercicio 0

```text
remote: error: GH013: Repository rule violations found for refs/heads/main.
```

GitHub no deja hacer push a main porque está protegida y hay que usar una PR.

## Pregunta 1

Recibo un 500 con "Error interno del servidor" después de unos 5 segundos. Responde el middleware de errores (punto 5 de index.ts).

## Pregunta 2

Porque todo lo que viene en la URL llega como texto, así que busca price: "380" y en Mongo el precio es el número 380.

## Pregunta 3

Porque esos campos los pone la API, no el cliente. Si no los ignorara, alguien podría publicar un anuncio con visitas falsas o ya como SOLD.

## Pregunta 4

No, la oferta guarda el precio que tenía el anuncio cuando Sara ofertó. Es un historial y no tiene que cambiar.

## Pregunta 5

Porque la petición está bien hecha, pero choca con el estado del anuncio, que ya está vendido.

## Pregunta 6

MongoDB comprueba los índices únicos, por ejemplo que no se repita un email. Yo he tenido que comprobar el resto, por ejemplo que el sellerId exista en users o que price sea un número.
