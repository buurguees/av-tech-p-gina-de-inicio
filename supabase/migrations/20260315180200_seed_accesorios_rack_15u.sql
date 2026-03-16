-- Accesorios recomendados para rack 15U exterior IP55 (PA-06)
-- Proveedor: ArmariosRack.com | Margen +60% | IVA 21%

BEGIN;

INSERT INTO catalog.products (sku, name, description, product_type, category_id, unit, cost_price, sale_price, discount_percent, tax_rate_id, track_stock, supplier_id)
VALUES
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'REGLETA 19" GTLAN CONECTOR IEC C13',
   'Regleta 19" 1U con 11 conectores IEC C13 e interruptor general. 483 x 45 x 45 mm. Ref: 50R12IEC.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 27.76, 44.42, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid),
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'BANDEJA FIJACIÓN FRONTAL 19" 2U BIACOM FONDO 400MM',
   'Bandeja rack 19" 2U de fijación frontal, fondo 400 mm, carga hasta 15 kg. 485 x 396 x 90 mm. Ref: BFJ-400.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 24.84, 39.74, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid),
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'GUIA 1U CON TAPA MONOLYTH',
   'Guía pasacables 1U con tapa para organización de cableado. 50 x 70 x 485 mm. Ref: 3060001.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 7.88, 12.61, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid),
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'PANEL CIEGO METAL 1U MONOLYTH',
   'Panel ciego metálico 1U para cerrar huecos libres en rack 19". 480 x 10 x 45 mm. Ref: 30701100.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 8.18, 13.09, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid),
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'PANEL CIEGO METAL 2U MONOLYTH',
   'Panel ciego metálico 2U para cerrar huecos libres en rack 19". 480 x 10 x 90 mm. Ref: 30702100.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 9.15, 14.64, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid),
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'VENTILADOR PARA ARMARIO 12x12 220V AC MONOLYTH',
   'Ventilador 220V 12x12 para rack mural o de suelo. Ref: 3090004.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 27.12, 43.39, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid),
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'TERMOSTATO ANALOGICO CONTROL DE TEMPERATURA ARMARIO RACK',
   'Termostato analógico para activar/desactivar ventilación según temperatura interior. Ref: AUNO-00011-TEA.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 10.50, 16.80, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid),
  (catalog.next_product_number('270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'PRODUCT'),
   'CERRADURA BOMBIN PARA ARMARIOS RACK',
   'Cerradura bombín de recambio para armarios rack. 100 x 60 x 20 mm. Ref: AUNO-00020-ST.',
   'PRODUCT', '270be13f-a7c4-4a48-935e-9a6791ea95d0'::uuid, 'ud', 5.60, 8.96, 0,
   '087c9828-3f47-4f56-8a79-55d36f30f943'::uuid, true, '9759efd2-dc7f-48b3-96ae-336e66ee9b04'::uuid);

COMMIT;
