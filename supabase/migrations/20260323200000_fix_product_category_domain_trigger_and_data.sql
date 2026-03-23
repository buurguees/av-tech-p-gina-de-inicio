-- Migration: fix_product_category_domain_trigger_and_data
-- Corrige dos problemas relacionados:
-- 1. El trigger check_product_category_domain se disparaba en CUALQUIER UPDATE,
--    bloqueando cambios de precio/nombre en productos con categoría legacy incorrecta.
--    El trigger debe solo validar en INSERT o cuando category_id/product_type cambia.
-- 2. 18 servicios (GR-01/GR-02/GR-03/MI-07) tenían category_id con domain='PRODUCT'
--    en lugar de domain='SERVICE'. Se reasignan a las categorías SERVICE correctas.

-- 1. Corregir la función del trigger para solo validar en cambios relevantes
CREATE OR REPLACE FUNCTION catalog.check_product_category_domain()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'catalog'
AS $$
DECLARE v_cat_domain catalog.category_domain;
BEGIN
  -- En UPDATE, solo validar si category_id o product_type han cambiado
  IF TG_OP = 'UPDATE'
     AND NEW.category_id IS NOT DISTINCT FROM OLD.category_id
     AND NEW.product_type IS NOT DISTINCT FROM OLD.product_type
  THEN
    RETURN NEW;
  END IF;

  IF NEW.category_id IS NULL THEN RETURN NEW; END IF;
  SELECT domain INTO v_cat_domain FROM catalog.categories WHERE id = NEW.category_id;
  IF v_cat_domain IS NULL THEN RETURN NEW; END IF;
  IF NEW.product_type = 'PRODUCT' AND v_cat_domain != 'PRODUCT' THEN
    RAISE EXCEPTION 'Un producto solo puede asignarse a categorías de dominio PRODUCT';
  END IF;
  IF NEW.product_type = 'SERVICE' AND v_cat_domain != 'SERVICE' THEN
    RAISE EXCEPTION 'Un servicio solo puede asignarse a categorías de dominio SERVICE';
  END IF;
  RETURN NEW;
END;
$$;

-- 2. Reasignar servicios con categoría de dominio incorrecto

-- GR-01 (desplazamientos), GR-02 (transportes), GR-03 (dietas)
-- → SP-05 LOGÍSTICA (domain=SERVICE)
UPDATE catalog.products
SET category_id = 'e3a5f852-c276-4c21-b6d3-84cc3655c37d',
    updated_at  = now()
WHERE id IN (
  -- GR-01-xxx
  '27130116-3fa2-4d0d-b701-09f6bc68efe6', -- DESPLAZAMIENTO
  '2aab98a2-e1a6-4ef0-a604-a56bee1de1c5', -- GASOLINA
  '1034c0de-3a76-45e8-9ba1-c5a227ab1512', -- PEAJES
  '384b6ffd-509c-48ee-b2b0-4a59931271e6', -- APARCAMIENTOS
  -- GR-02-xxx
  'bd41664b-b2c0-499e-b1c4-a868673ae30c', -- TRANSPORTE DE ESTRUCTURAS
  '17a37d31-e616-4662-b222-bbc151645d73', -- TRANSPORTE DE MATERIAL AUDIOVISUAL
  'e20a8eb6-0d1c-48ab-b052-eafa91111c13', -- TRASPALET
  '81209031-185c-4f9d-94e5-f150e55ea9b1', -- CAMIÓN CON PLATAFORMA
  'e113ac37-47a9-419c-b9c9-42d1923db94d', -- PLATAFORMAS ELEVADORAS
  'a53aa05a-4c69-4000-a671-36957682d0b0', -- ALQUILER DE ANDAMIO TORRE
  -- GR-03-xxx
  'd5560b01-951e-4abb-b774-c1e43c7f61f3', -- DIETA COMPLETA
  'c8fa1965-c76f-45d0-a68f-b1b9dbb6a3ea', -- MEDIA DIETA
  '1a4eb63d-ebbc-4c09-aacf-e3220b5c28d2', -- DIETA COMPLETA VIAJE
  'a4f9f241-bff5-48f4-ac1d-c75534169090'  -- MEDIA DIETA VIAJE
);

-- MI-07-xxx (conjuntos de instalación)
-- → SP-02 SERVICIOS DE INSTALACIÓN (domain=SERVICE)
UPDATE catalog.products
SET category_id = '3c247e43-a39b-454e-83a6-f0777f72d69c',
    updated_at  = now()
WHERE id IN (
  '326baa4c-9f2b-41a8-a372-400ed2ad7eb0', -- CONJUNTO DE INSTALACIÓN PANTALLA LED
  'be182641-9399-41c6-804e-1290caab56ec', -- CONJUNTO DE INSTALACIÓN MONITOR
  '2f3898df-61a7-4616-a6a6-852bc9919542', -- CONJUNTO DE INSTALACIÓN PROYECTOR
  'dc13bf32-d83b-4841-a54e-767788408e0a'  -- CONJUNTO DE INSTALACIÓN DE AUDIO
);
