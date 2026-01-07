-- Update existing products to be services
UPDATE internal.products 
SET type = 'service', stock = NULL 
WHERE id IN ('867ccb90-c30e-45ff-98ea-3d1eee06874b', 'f2130d79-8c17-4356-9958-6034a5ead803');