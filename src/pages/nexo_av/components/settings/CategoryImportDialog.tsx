import { useState, useRef } from 'react';
import '@/polyfills/buffer';
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

interface ParsedCategory {
  code: string;
  name: string;
  type: 'product' | 'service';
  subcategories: ParsedSubcategory[];
}

interface ParsedSubcategory {
  code: string;
  name: string;
  type: 'product' | 'service';
  display_order: number;
}

interface ImportResult {
  categoriesCreated: number;
  categoriesSkipped: number;
  subcategoriesCreated: number;
  subcategoriesSkipped: number;
  errors: string[];
}

interface CategoryImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  existingCategories: { code: string; id: string }[];
  existingSubcategories: { code: string; id: string; category_id: string }[];
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

export function CategoryImportDialog({
  open,
  onOpenChange,
  onImportComplete,
  existingCategories,
  existingSubcategories,
}: CategoryImportDialogProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [parsedData, setParsedData] = useState<ParsedCategory[]>([]);
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

  const getCellValue = (row: any, colIndex: number): any => {
    const cell = row.getCell(colIndex);
    if (cell.value === null || cell.value === undefined) return '';
    // Handle rich text
    if (typeof cell.value === 'object' && 'richText' in cell.value) {
      return (cell.value as any).richText.map((r: any) => r.text).join('');
    }
    return cell.value;
  };

  const parseExcelFile = async (file: File) => {
    try {
      // Dynamic import de ExcelJS solo cuando se necesita
      const ExcelJS = (await import('exceljs')).default;
      
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);
      
      // Buscar la hoja "Control Categorías" o "Control Categorias"
      const worksheet = workbook.worksheets.find(
        ws => ws.name.toLowerCase().includes('control categ')
      );
      
      if (!worksheet) {
        toast.error('No se encontró la hoja "Control Categorías" en el archivo');
        return;
      }

      // Procesar los datos (saltando la primera fila de encabezados)
      const categoriesMap = new Map<string, ParsedCategory>();

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const categoryCode = String(getCellValue(row, 1) || '').trim();
        const categoryName = String(getCellValue(row, 2) || '').trim();
        const subcategoryCode = String(getCellValue(row, 3) || '').trim();
        const subcategoryName = String(getCellValue(row, 4) || '').trim();
        // Columna F (índice 6) contiene el tipo
        const typeRaw = String(getCellValue(row, 6) || 'product').trim().toLowerCase();
        const type: 'product' | 'service' = typeRaw.includes('service') ? 'service' : 'product';

        if (!categoryCode || !categoryName) return;

        // Añadir o actualizar categoría
        if (!categoriesMap.has(categoryCode)) {
          categoriesMap.set(categoryCode, {
            code: categoryCode,
            name: categoryName,
            type: type, // Usar el tipo de la primera subcategoría encontrada
            subcategories: [],
          });
        }

        // Añadir subcategoría si existe
        if (subcategoryCode && subcategoryName) {
          const category = categoriesMap.get(categoryCode)!;
          // Evitar duplicados de subcategorías
          if (!category.subcategories.some(s => s.code === subcategoryCode)) {
            // Extraer el número de subcategoría del código (ej: GR-01 -> 1, GR-02 -> 2)
            const numberMatch = subcategoryCode.match(/-(\d+)$/);
            const displayOrder = numberMatch ? parseInt(numberMatch[1], 10) : category.subcategories.length + 1;
            
            category.subcategories.push({
              code: subcategoryCode,
              name: subcategoryName,
              type,
              display_order: displayOrder,
            });
            // Actualizar el tipo de categoría si todas las subcategorías son del mismo tipo
            // O usar el tipo más común
            const subcategoryTypes = category.subcategories.map(s => s.type);
            const serviceCount = subcategoryTypes.filter(t => t === 'service').length;
            const productCount = subcategoryTypes.filter(t => t === 'product').length;
            // Si hay más servicios, la categoría es de tipo service, sino product
            category.type = serviceCount > productCount ? 'service' : 'product';
          }
        } else {
          // Si no hay subcategoría, usar el tipo de la fila actual para la categoría
          const category = categoriesMap.get(categoryCode)!;
          category.type = type;
        }
      });

      const categories = Array.from(categoriesMap.values());
      
      if (categories.length === 0) {
        toast.error('No se encontraron categorías válidas en el archivo');
        return;
      }

      setParsedData(categories);
      setFileName(file.name);
      setStep('preview');
      toast.success(`Se encontraron ${categories.length} categorías`);
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

  const isCategoryExisting = (code: string) => {
    return existingCategories.some(c => c.code.toLowerCase() === code.toLowerCase());
  };

  const isSubcategoryExisting = (code: string) => {
    return existingSubcategories.some(s => s.code.toLowerCase() === code.toLowerCase());
  };

  const handleImport = async () => {
    setStep('importing');
    
    const result: ImportResult = {
      categoriesCreated: 0,
      categoriesSkipped: 0,
      subcategoriesCreated: 0,
      subcategoriesSkipped: 0,
      errors: [],
    };

    // Mapa para guardar los IDs de las categorías creadas
    const categoryIdMap = new Map<string, string>();

    // Primero, copiar las categorías existentes al mapa
    existingCategories.forEach(c => {
      categoryIdMap.set(c.code.toLowerCase(), c.id);
    });

    // Crear categorías
    for (const category of parsedData) {
      if (isCategoryExisting(category.code)) {
        result.categoriesSkipped++;
        continue;
      }

      try {
        const { data, error } = await supabase.rpc('create_product_category', {
          p_name: category.name,
          p_code: category.code,
          p_description: null,
          p_display_order: 0,
          p_type: category.type,
        });

        if (error) {
          result.errors.push(`Categoría ${category.code}: ${error.message}`);
        } else {
          result.categoriesCreated++;
          categoryIdMap.set(category.code.toLowerCase(), data);
        }
      } catch (error: any) {
        result.errors.push(`Categoría ${category.code}: ${error.message}`);
      }
    }

    // Crear subcategorías
    for (const category of parsedData) {
      const categoryId = categoryIdMap.get(category.code.toLowerCase());
      
      if (!categoryId) {
        result.errors.push(`No se encontró ID para categoría ${category.code}`);
        continue;
      }

      // Ordenar subcategorías por display_order antes de crearlas
      const sortedSubcategories = [...category.subcategories].sort(
        (a, b) => a.display_order - b.display_order
      );

      for (const subcategory of sortedSubcategories) {
        if (isSubcategoryExisting(subcategory.code)) {
          result.subcategoriesSkipped++;
          continue;
        }

        try {
          const { error } = await supabase.rpc('create_product_subcategory', {
            p_category_id: categoryId,
            p_code: subcategory.code,
            p_name: subcategory.name,
            p_description: null,
            p_display_order: subcategory.display_order,
          });

          if (error) {
            result.errors.push(`Subcategoría ${subcategory.code}: ${error.message}`);
          } else {
            result.subcategoriesCreated++;
          }
        } catch (error: any) {
          result.errors.push(`Subcategoría ${subcategory.code}: ${error.message}`);
        }
      }
    }

    setImportResult(result);
    setStep('complete');
    
    if (result.categoriesCreated > 0 || result.subcategoriesCreated > 0) {
      onImportComplete();
    }
  };

  const getTotalSubcategories = () => {
    return parsedData.reduce((acc, cat) => acc + cat.subcategories.length, 0);
  };

  const getNewCategoriesCount = () => {
    return parsedData.filter(c => !isCategoryExisting(c.code)).length;
  };

  const getNewSubcategoriesCount = () => {
    return parsedData.reduce((acc, cat) => {
      return acc + cat.subcategories.filter(s => !isSubcategoryExisting(s.code)).length;
    }, 0);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-orange-500" />
            Importar Categorías desde Excel
          </DialogTitle>
          <DialogDescription className="text-white/60">
            {step === 'upload' && 'Sube un archivo Excel con la hoja "Control Categorías"'}
            {step === 'preview' && 'Revisa los datos antes de importar'}
            {step === 'importing' && 'Importando categorías y subcategorías...'}
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
                  Formato esperado
                </h4>
                <ul className="text-white/60 text-sm space-y-1">
                  <li>• Hoja: "Control Categorías"</li>
                  <li>• Columna A: Código de categoría principal</li>
                  <li>• Columna B: Nombre de categoría principal</li>
                  <li>• Columna C: Código de subcategoría</li>
                  <li>• Columna D: Nombre de subcategoría</li>
                  <li>• Columna F: Tipo (product/service)</li>
                </ul>
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
                    {parsedData.length} categorías, {getTotalSubcategories()} subcategorías
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="border-green-500/50 text-green-400">
                    +{getNewCategoriesCount()} nuevas
                  </Badge>
                  <Badge variant="outline" className="border-blue-500/50 text-blue-400">
                    +{getNewSubcategoriesCount()} subcategorías
                  </Badge>
                </div>
              </div>

              <ScrollArea className="h-[350px] border border-white/10 rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-[#1a1a2e] z-10">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60 w-24">Código Cat.</TableHead>
                      <TableHead className="text-white/60">Categoría</TableHead>
                      <TableHead className="text-white/60 w-24">Código Sub.</TableHead>
                      <TableHead className="text-white/60">Subcategoría</TableHead>
                      <TableHead className="text-white/60 w-20">Tipo</TableHead>
                      <TableHead className="text-white/60 w-24">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((category) => {
                      // Ordenar subcategorías por display_order para el preview
                      const sortedSubcategories = [...category.subcategories].sort(
                        (a, b) => a.display_order - b.display_order
                      );
                      
                      return (
                        <>
                          {sortedSubcategories.length === 0 ? (
                            <TableRow key={category.code} className="border-white/10 hover:bg-white/5">
                              <TableCell className="font-mono text-orange-400">{category.code}</TableCell>
                              <TableCell className="text-white">{category.name}</TableCell>
                              <TableCell className="text-white/40">-</TableCell>
                              <TableCell className="text-white/40">-</TableCell>
                              <TableCell>-</TableCell>
                              <TableCell>
                                {isCategoryExisting(category.code) ? (
                                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                                    Existe
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                    Nueva
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ) : (
                            sortedSubcategories.map((sub, subIndex) => (
                            <TableRow 
                              key={`${category.code}-${sub.code}`} 
                              className="border-white/10 hover:bg-white/5"
                            >
                              <TableCell className="font-mono text-orange-400">
                                {subIndex === 0 ? category.code : ''}
                              </TableCell>
                              <TableCell className="text-white">
                                {subIndex === 0 ? category.name : ''}
                              </TableCell>
                              <TableCell className="font-mono text-blue-400">{sub.code}</TableCell>
                              <TableCell className="text-white/80">{sub.name}</TableCell>
                              <TableCell>
                                {sub.type === 'product' ? (
                                  <span className="flex items-center gap-1 text-blue-400 text-xs">
                                    <Package className="w-3 h-3" /> Producto
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-purple-400 text-xs">
                                    <Wrench className="w-3 h-3" /> Servicio
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isSubcategoryExisting(sub.code) ? (
                                  <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs">
                                    Existe
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-green-500/50 text-green-400 text-xs">
                                    Nueva
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </motion.div>
          )}

          {step === 'importing' && (
            <motion.div
              key="importing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="py-12 text-center"
            >
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-orange-500" />
              <p className="text-white/80">Importando datos...</p>
              <p className="text-white/40 text-sm mt-2">Por favor, espera mientras se procesan las categorías</p>
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
              <div className="text-center mb-6">
                {importResult.errors.length === 0 ? (
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
                ) : (
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
                )}
                <h3 className="text-white text-lg font-medium">
                  Importación Completada
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Categorías</p>
                  <div className="flex items-center gap-4">
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {importResult.categoriesCreated} creadas
                    </span>
                    <span className="text-yellow-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {importResult.categoriesSkipped} omitidas
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <p className="text-white/60 text-sm mb-1">Subcategorías</p>
                  <div className="flex items-center gap-4">
                    <span className="text-green-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {importResult.subcategoriesCreated} creadas
                    </span>
                    <span className="text-yellow-400 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {importResult.subcategoriesSkipped} omitidas
                    </span>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
                  <p className="text-red-400 font-medium mb-2 flex items-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Errores ({importResult.errors.length})
                  </p>
                  <ScrollArea className="h-32">
                    <ul className="text-red-300/80 text-sm space-y-1">
                      {importResult.errors.map((error, i) => (
                        <li key={i}>• {error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <DialogFooter className="border-t border-white/10 pt-4">
          {step === 'upload' && (
            <Button variant="outline" onClick={handleClose} className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </Button>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={resetState} className="border-white/20 text-white hover:bg-white/10">
                Cambiar archivo
              </Button>
              <Button 
                onClick={handleImport} 
                className="bg-orange-600 hover:bg-orange-700"
                disabled={getNewCategoriesCount() === 0 && getNewSubcategoriesCount() === 0}
              >
                Importar {getNewCategoriesCount()} categorías y {getNewSubcategoriesCount()} subcategorías
              </Button>
            </>
          )}

          {step === 'complete' && (
            <Button onClick={handleClose} className="bg-orange-600 hover:bg-orange-700">
              Cerrar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
