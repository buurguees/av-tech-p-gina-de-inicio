import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Upload, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  AlertTriangle,
  Package,
  Wrench
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface ParsedProduct {
  productNumber: string;       // Columna A: Código de producto (ej: SP-01-0001)
  categoryCode: string;        // Columna B: Código de categoría (ej: SP)
  categoryName: string;        // Columna C: Nombre de categoría
  subcategoryCode: string;     // Columna D: Código de subcategoría (ej: SP-01)
  subcategoryName: string;     // Columna E: Nombre de subcategoría
  name: string;                // Columna F: Nombre del producto
  description: string;         // Columna G: Descripción
  type: 'product' | 'service'; // Columna H: Tipo
  status: boolean;             // Columna J: Estado (Activo/Inactivo)
  costPrice: number;           // Columna K: Coste (sin IVA)
  margin: number;              // Columna M: Margen %
  basePrice: number;           // Columna N: Precio de venta (sin IVA)
  taxRate: number;             // Columna O: % IVA
  priceWithTax: number;        // Columna P: Precio final
  taxCode: string;             // Columna Q: Código de impuesto
}

interface ImportResult {
  productsCreated: number;
  productsSkipped: number;
  productsUpdated: number;
  errors: string[];
}

interface ProductImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  existingProducts: { product_number: string; id: string }[];
  categories: { code: string; id: string; name: string }[];
  subcategories: { code: string; id: string; category_id: string; name: string }[];
  taxes: { id: string; code: string; rate: number }[];
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export function ProductImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  existingProducts,
  categories,
  subcategories,
  taxes,
}: ProductImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setStep('upload');
    setParsedData([]);
    setImportResult(null);
    setFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const parseNumber = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    // Handle strings with euro symbol, spaces, etc.
    const cleaned = String(value)
      .replace(/[€$\s]/g, '')
      .replace(/,/g, '.')
      .trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parsePercentage = (value: any): number => {
    if (value === null || value === undefined || value === '') return 0;
    const cleaned = String(value).replace(/%/g, '').trim();
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const parseType = (value: any): 'product' | 'service' => {
    const str = String(value || '').toLowerCase().trim();
    if (str.includes('serv') || str === 'service' || str === 'servicios' || str === 'servicio') {
      return 'service';
    }
    return 'product';
  };

  const parseStatus = (value: any): boolean => {
    const str = String(value || '').toLowerCase().trim();
    return str === 'activo' || str === 'active' || str === '1' || str === 'true' || str === 'sí' || str === 'si';
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Buscar la hoja "Catalogo Master" o similar
      const sheetName = workbook.SheetNames.find(
        name => name.toLowerCase().includes('catalogo master') || 
                name.toLowerCase().includes('catálogo master')
      );
      
      if (!sheetName) {
        toast.error('No se encontró la hoja "Catalogo Master" en el archivo');
        return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      const products: ParsedProduct[] = [];

      // Procesar los datos (saltando la primera fila de encabezados)
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.length < 6) continue;

        const productNumber = String(row[0] || '').trim();
        const categoryCode = String(row[1] || '').trim();
        const categoryName = String(row[2] || '').trim();
        const subcategoryCode = String(row[3] || '').trim();
        const subcategoryName = String(row[4] || '').trim();
        const name = String(row[5] || '').trim();
        const description = String(row[6] || '').trim();
        const type = parseType(row[7]);
        // Columna I (índice 8) es unidad de medida - la omitimos
        const status = parseStatus(row[9]);
        const costPrice = parseNumber(row[10]);
        // Columna L (índice 11) es proveedor - lo omitimos por ahora
        const margin = parsePercentage(row[12]);
        const basePrice = parseNumber(row[13]);
        const taxRate = parsePercentage(row[14]);
        const priceWithTax = parseNumber(row[15]);
        const taxCode = String(row[16] || '').trim();

        // Validar que tenga código de producto y nombre
        if (!productNumber || !name) continue;

        products.push({
          productNumber,
          categoryCode,
          categoryName,
          subcategoryCode,
          subcategoryName,
          name,
          description,
          type,
          status,
          costPrice,
          margin,
          basePrice,
          taxRate,
          priceWithTax,
          taxCode,
        });
      }

      if (products.length === 0) {
        toast.error('No se encontraron productos válidos en el archivo');
        return;
      }

      setParsedData(products);
      setFileName(file.name);
      setStep('preview');
      toast.success(`Se encontraron ${products.length} productos`);
    } catch (error) {
      console.error('Error parsing Excel:', error);
      toast.error('Error al procesar el archivo Excel');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseExcelFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseExcelFile(file);
    } else {
      toast.error('Por favor, sube un archivo Excel (.xlsx o .xls)');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const isProductExisting = (productNumber: string) => {
    return existingProducts.some(p => p.product_number.toLowerCase() === productNumber.toLowerCase());
  };

  const findCategoryId = (code: string): string | null => {
    const category = categories.find(c => c.code.toLowerCase() === code.toLowerCase());
    return category?.id || null;
  };

  const findSubcategoryId = (code: string, categoryId: string): string | null => {
    const subcategory = subcategories.find(
      s => s.code.toLowerCase() === code.toLowerCase() && s.category_id === categoryId
    );
    return subcategory?.id || null;
  };

  const findTaxId = (code: string, rate: number): string | null => {
    // First try to find by code
    let tax = taxes.find(t => t.code.toLowerCase() === code.toLowerCase());
    if (tax) return tax.id;
    
    // Then try to find by rate
    tax = taxes.find(t => Math.abs(t.rate - rate) < 0.01);
    return tax?.id || null;
  };

  const handleImport = async () => {
    setStep('importing');
    
    const result: ImportResult = {
      productsCreated: 0,
      productsSkipped: 0,
      productsUpdated: 0,
      errors: [],
    };

    for (const product of parsedData) {
      // Skip if product already exists
      if (isProductExisting(product.productNumber)) {
        result.productsSkipped++;
        continue;
      }

      // Find category ID
      const categoryId = findCategoryId(product.categoryCode);
      if (!categoryId) {
        result.errors.push(`Producto ${product.productNumber}: Categoría "${product.categoryCode}" no encontrada`);
        continue;
      }

      // Find subcategory ID (optional but recommended)
      let subcategoryId: string | null = null;
      if (product.subcategoryCode) {
        subcategoryId = findSubcategoryId(product.subcategoryCode, categoryId);
        if (!subcategoryId) {
          // Try to find by just the code without requiring category match
          const sub = subcategories.find(s => s.code.toLowerCase() === product.subcategoryCode.toLowerCase());
          subcategoryId = sub?.id || null;
        }
      }

      // Important: Products MUST have a subcategory as main categories cannot have products directly
      if (!subcategoryId) {
        result.errors.push(`Producto ${product.productNumber}: Subcategoría "${product.subcategoryCode}" no encontrada. Los productos deben ir en subcategorías.`);
        continue;
      }

      // Find tax ID
      const taxId = findTaxId(product.taxCode, product.taxRate);

      try {
        const { data, error } = await supabase.rpc('create_product', {
          p_category_id: categoryId,
          p_subcategory_id: subcategoryId,
          p_name: product.name.toUpperCase(),
          p_description: product.description || null,
          p_cost_price: product.costPrice,
          p_base_price: product.basePrice,
          p_tax_rate: product.taxRate,
          p_type: product.type,
          p_stock: product.type === 'product' ? 0 : null,
          p_default_tax_id: taxId,
        });

        if (error) {
          result.errors.push(`Producto ${product.productNumber}: ${error.message}`);
        } else {
          result.productsCreated++;
          
          // If product was created but should be inactive, update it
          if (!product.status && data?.[0]?.product_id) {
            await supabase.rpc('update_product', {
              p_product_id: data[0].product_id,
              p_is_active: false,
            });
          }
        }
      } catch (error: any) {
        result.errors.push(`Producto ${product.productNumber}: ${error.message}`);
      }
    }

    setImportResult(result);
    setStep('complete');
    
    if (result.productsCreated > 0) {
      onImportComplete();
    }
  };

  const getNewProductsCount = () => {
    return parsedData.filter(p => !isProductExisting(p.productNumber)).length;
  };

  const getSkippedProductsCount = () => {
    return parsedData.filter(p => isProductExisting(p.productNumber)).length;
  };

  const getProductsWithoutCategory = () => {
    return parsedData.filter(p => !findCategoryId(p.categoryCode)).length;
  };

  const getProductsWithoutSubcategory = () => {
    return parsedData.filter(p => {
      const categoryId = findCategoryId(p.categoryCode);
      if (!categoryId) return false;
      return !findSubcategoryId(p.subcategoryCode, categoryId);
    }).length;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-orange-500" />
            Importar Productos desde Excel
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {step === 'upload' && 'Sube un archivo Excel con la hoja "Catalogo Master"'}
            {step === 'preview' && 'Revisa los datos antes de importar'}
            {step === 'importing' && 'Importando productos...'}
            {step === 'complete' && 'Importación completada'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-6"
            >
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/20 rounded-lg p-12 text-center cursor-pointer hover:border-orange-500/50 hover:bg-white/5 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-white/40" />
                <p className="text-white/80 mb-2">
                  Arrastra tu archivo Excel aquí o haz clic para seleccionar
                </p>
                <p className="text-white/40 text-sm">
                  Formatos soportados: .xlsx, .xls
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h4 className="text-white/80 font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Formato esperado (Hoja: "Catalogo Master")
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-white/60 text-sm">
                  <div>• Columna A: Código de producto</div>
                  <div>• Columna B: Código de categoría</div>
                  <div>• Columna C: Nombre de categoría</div>
                  <div>• Columna D: Código de subcategoría</div>
                  <div>• Columna E: Nombre de subcategoría</div>
                  <div>• Columna F: Nombre del producto</div>
                  <div>• Columna G: Descripción</div>
                  <div>• Columna H: Tipo (product/service)</div>
                  <div>• Columna J: Estado (Activo/Inactivo)</div>
                  <div>• Columna K: Coste (sin IVA)</div>
                  <div>• Columna M: Margen %</div>
                  <div>• Columna N: Precio de venta (sin IVA)</div>
                  <div>• Columna O: % IVA</div>
                  <div>• Columna Q: Código de impuesto</div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'preview' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-hidden flex flex-col min-h-0"
            >
              <div className="flex items-center gap-4 mb-4 p-3 bg-white/5 rounded-lg border border-white/10 flex-shrink-0">
                <FileSpreadsheet className="w-8 h-8 text-green-500" />
                <div className="flex-1">
                  <p className="text-white font-medium">{fileName}</p>
                  <p className="text-white/60 text-sm">
                    {parsedData.length} productos encontrados
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="border-green-500/50 text-green-400">
                    +{getNewProductsCount()} nuevos
                  </Badge>
                  {getSkippedProductsCount() > 0 && (
                    <Badge variant="outline" className="border-yellow-500/50 text-yellow-400">
                      {getSkippedProductsCount()} existentes
                    </Badge>
                  )}
                  {getProductsWithoutCategory() > 0 && (
                    <Badge variant="outline" className="border-red-500/50 text-red-400">
                      {getProductsWithoutCategory()} sin categoría
                    </Badge>
                  )}
                  {getProductsWithoutSubcategory() > 0 && (
                    <Badge variant="outline" className="border-orange-500/50 text-orange-400">
                      {getProductsWithoutSubcategory()} sin subcategoría
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="h-[350px] border border-white/10 rounded-lg">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-[#1a1a2e] z-10">
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-white/60 w-28">Código</TableHead>
                        <TableHead className="text-white/60 min-w-[200px]">Nombre</TableHead>
                        <TableHead className="text-white/60 w-24">Categoría</TableHead>
                        <TableHead className="text-white/60 w-24">Subcat.</TableHead>
                        <TableHead className="text-white/60 w-16">Tipo</TableHead>
                        <TableHead className="text-white/60 w-20 text-right">Coste</TableHead>
                        <TableHead className="text-white/60 w-20 text-right">Precio</TableHead>
                        <TableHead className="text-white/60 w-16 text-right">IVA</TableHead>
                        <TableHead className="text-white/60 w-24">Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.slice(0, 100).map((product, index) => {
                        const categoryExists = !!findCategoryId(product.categoryCode);
                        const categoryId = findCategoryId(product.categoryCode);
                        const subcategoryExists = categoryId ? !!findSubcategoryId(product.subcategoryCode, categoryId) : false;
                        const productExists = isProductExisting(product.productNumber);

                        return (
                          <TableRow 
                            key={`${product.productNumber}-${index}`}
                            className="border-white/10 hover:bg-white/5"
                          >
                            <TableCell className="font-mono text-orange-400 text-xs">
                              {product.productNumber}
                            </TableCell>
                            <TableCell className="text-white text-sm truncate max-w-[200px]" title={product.name}>
                              {product.name}
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs ${categoryExists ? 'text-green-400' : 'text-red-400'}`}>
                                {product.categoryCode}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`text-xs ${subcategoryExists ? 'text-green-400' : categoryId ? 'text-orange-400' : 'text-white/40'}`}>
                                {product.subcategoryCode || '-'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {product.type === 'service' ? (
                                <Wrench className="w-4 h-4 text-blue-400" />
                              ) : (
                                <Package className="w-4 h-4 text-emerald-400" />
                              )}
                            </TableCell>
                            <TableCell className="text-right text-white/70 text-sm">
                              {product.costPrice.toFixed(2)}€
                            </TableCell>
                            <TableCell className="text-right text-white/70 text-sm">
                              {product.basePrice.toFixed(2)}€
                            </TableCell>
                            <TableCell className="text-right text-white/70 text-sm">
                              {product.taxRate}%
                            </TableCell>
                            <TableCell>
                              {productExists ? (
                                <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                                  Existe
                                </Badge>
                              ) : !categoryExists ? (
                                <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">
                                  Sin cat.
                                </Badge>
                              ) : !subcategoryExists ? (
                                <Badge variant="outline" className="border-orange-500/50 text-orange-400 text-xs">
                                  Sin sub.
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                  Nuevo
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {parsedData.length > 100 && (
                    <div className="p-3 text-center text-white/40 text-sm border-t border-white/10">
                      Mostrando 100 de {parsedData.length} productos
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2 flex-shrink-0 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('upload')}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Volver
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={getNewProductsCount() === 0}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Importar {getNewProductsCount()} productos
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'importing' && (
            <motion.div
              key="importing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-12 flex flex-col items-center justify-center"
            >
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
              <p className="text-white/80">Importando productos...</p>
              <p className="text-white/40 text-sm mt-2">
                Esto puede tardar unos segundos
              </p>
            </motion.div>
          )}

          {step === 'complete' && importResult && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-6"
            >
              <div className="flex items-center justify-center gap-3 mb-6">
                {importResult.errors.length === 0 ? (
                  <CheckCircle2 className="w-12 h-12 text-green-500" />
                ) : importResult.productsCreated > 0 ? (
                  <AlertTriangle className="w-12 h-12 text-yellow-500" />
                ) : (
                  <XCircle className="w-12 h-12 text-red-500" />
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold text-green-400">
                    {importResult.productsCreated}
                  </div>
                  <div className="text-white/60 text-sm">Productos creados</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold text-yellow-400">
                    {importResult.productsSkipped}
                  </div>
                  <div className="text-white/60 text-sm">Ya existentes</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4 text-center border border-white/10">
                  <div className="text-3xl font-bold text-red-400">
                    {importResult.errors.length}
                  </div>
                  <div className="text-white/60 text-sm">Errores</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-white/80 font-medium mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500" />
                    Errores durante la importación
                  </h4>
                  <ScrollArea className="h-32 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <ul className="text-red-400 text-sm space-y-1">
                      {importResult.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}

              <DialogFooter>
                <Button
                  onClick={handleClose}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
