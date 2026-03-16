import { useRef, useState } from 'react';
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
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Package,
  Upload,
  Wrench,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'motion/react';

type CategoryDomain = 'PRODUCT' | 'SERVICE';
type ImportStep = 'upload' | 'preview' | 'importing' | 'complete';

interface ParsedSubcategory {
  code: string;
  name: string;
  display_order: number;
}

interface ParsedCategory {
  code: string;
  name: string;
  domain: CategoryDomain;
  subcategories: ParsedSubcategory[];
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
  existingCategories: { code: string; id: string; domain: CategoryDomain }[];
  existingSubcategories: { code: string; id: string; category_id: string }[];
}

type ExcelCellLike = { value: unknown };
type ExcelRowLike = { getCell: (colIndex: number) => ExcelCellLike };
type ExcelRichText = { richText: { text: string }[] };

const hasRichText = (value: unknown): value is ExcelRichText =>
  typeof value === 'object' && value !== null && 'richText' in value;

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Error desconocido';

function normalizeCode(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function slugify(parts: string[]) {
  return parts
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

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
  const [fileName, setFileName] = useState('');
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

  const getCellValue = (row: ExcelRowLike, colIndex: number) => {
    const cell = row.getCell(colIndex);
    if (cell.value === null || cell.value === undefined) return '';
    if (hasRichText(cell.value)) {
      return cell.value.richText.map((item) => item.text).join('');
    }
    return cell.value;
  };

  const parseExcelFile = async (file: File) => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets.find((sheet) =>
        sheet.name.toLowerCase().includes('control categ'),
      );

      if (!worksheet) {
        toast.error('No se encontró la hoja "Control Categorías" en el archivo');
        return;
      }

      const categoriesMap = new Map<string, ParsedCategory>();

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;

        const categoryCode = normalizeCode(String(getCellValue(row, 1) || '').trim());
        const categoryName = String(getCellValue(row, 2) || '').trim();
        const rawSubcategoryCode = String(getCellValue(row, 3) || '').trim();
        const subcategoryName = String(getCellValue(row, 4) || '').trim();
        const typeRaw = String(getCellValue(row, 6) || 'product').trim().toLowerCase();
        const domain: CategoryDomain = typeRaw.includes('service') ? 'SERVICE' : 'PRODUCT';

        if (!categoryCode || !categoryName) return;

        if (!categoriesMap.has(categoryCode)) {
          categoriesMap.set(categoryCode, {
            code: categoryCode,
            name: categoryName,
            domain,
            subcategories: [],
          });
        }

        const category = categoriesMap.get(categoryCode)!;
        category.domain = domain;

        if (!rawSubcategoryCode || !subcategoryName) return;

        const cleanedSubcategoryCode = normalizeCode(
          rawSubcategoryCode.startsWith(`${categoryCode}-`)
            ? rawSubcategoryCode.slice(categoryCode.length + 1)
            : rawSubcategoryCode,
        );

        if (!cleanedSubcategoryCode) return;
        if (category.subcategories.some((subcategory) => subcategory.code === cleanedSubcategoryCode)) return;

        const numberMatch = rawSubcategoryCode.match(/-(\d+)$/);
        category.subcategories.push({
          code: cleanedSubcategoryCode,
          name: subcategoryName,
          display_order: numberMatch ? Number.parseInt(numberMatch[1], 10) : category.subcategories.length + 1,
        });
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
      void parseExcelFile(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file || (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls'))) {
      toast.error('Por favor, sube un archivo Excel (.xlsx o .xls)');
      return;
    }

    void parseExcelFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const isCategoryExisting = (code: string) =>
    existingCategories.some((category) => category.code.toLowerCase() === code.toLowerCase());

  const isSubcategoryExisting = (categoryCode: string, subcategoryCode: string) => {
    const category = existingCategories.find((item) => item.code.toLowerCase() === categoryCode.toLowerCase());
    if (!category) return false;

    return existingSubcategories.some(
      (subcategory) =>
        subcategory.category_id === category.id &&
        subcategory.code.toLowerCase() === subcategoryCode.toLowerCase(),
    );
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

    const categoryMap = new Map<string, { id: string; domain: CategoryDomain }>();
    existingCategories.forEach((category) => {
      categoryMap.set(category.code.toLowerCase(), {
        id: category.id,
        domain: category.domain,
      });
    });

    for (const category of parsedData) {
      if (isCategoryExisting(category.code)) {
        result.categoriesSkipped++;
        continue;
      }

      try {
        const { data, error } = await supabase.rpc('create_catalog_category', {
          p_name: category.name,
          p_code: category.code,
          p_description: null,
          p_sort_order: 0,
          p_slug: slugify([category.code, category.name]),
          p_domain: category.domain,
        });

        if (error) {
          result.errors.push(`Categoría ${category.code}: ${error.message}`);
          continue;
        }

        result.categoriesCreated++;
        categoryMap.set(category.code.toLowerCase(), {
          id: data,
          domain: category.domain,
        });
      } catch (error: unknown) {
        result.errors.push(`Categoría ${category.code}: ${getErrorMessage(error)}`);
      }
    }

    for (const category of parsedData) {
      const categoryInfo = categoryMap.get(category.code.toLowerCase());
      if (!categoryInfo) {
        result.errors.push(`No se encontró ID para categoría ${category.code}`);
        continue;
      }

      const sortedSubcategories = [...category.subcategories].sort(
        (left, right) => left.display_order - right.display_order,
      );

      for (const subcategory of sortedSubcategories) {
        if (isSubcategoryExisting(category.code, subcategory.code)) {
          result.subcategoriesSkipped++;
          continue;
        }

        try {
          const { error } = await supabase.rpc('create_catalog_category', {
            p_parent_id: categoryInfo.id,
            p_code: subcategory.code,
            p_name: subcategory.name,
            p_description: null,
            p_sort_order: subcategory.display_order,
            p_slug: slugify([category.code, subcategory.code, subcategory.name]),
            p_domain: categoryInfo.domain,
          });

          if (error) {
            result.errors.push(`Subcategoría ${category.code}-${subcategory.code}: ${error.message}`);
            continue;
          }

          result.subcategoriesCreated++;
        } catch (error: unknown) {
          result.errors.push(`Subcategoría ${category.code}-${subcategory.code}: ${getErrorMessage(error)}`);
        }
      }
    }

    setImportResult(result);
    setStep('complete');

    if (result.categoriesCreated > 0 || result.subcategoriesCreated > 0) {
      onImportComplete();
    }
  };

  const getTotalSubcategories = () =>
    parsedData.reduce((total, category) => total + category.subcategories.length, 0);

  const getNewCategoriesCount = () =>
    parsedData.filter((category) => !isCategoryExisting(category.code)).length;

  const getNewSubcategoriesCount = () =>
    parsedData.reduce(
      (total, category) =>
        total +
        category.subcategories.filter(
          (subcategory) => !isSubcategoryExisting(category.code, subcategory.code),
        ).length,
      0,
    );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] max-w-3xl flex-col overflow-hidden border-white/10 bg-[#1a1a2e] text-white">
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
                className="cursor-pointer rounded-lg border-2 border-dashed border-white/20 p-12 text-center transition-colors hover:border-orange-500/50 hover:bg-white/5"
              >
                <Upload className="mx-auto mb-4 h-12 w-12 text-white/40" />
                <p className="mb-2 text-white/80">Arrastra tu archivo Excel aquí o haz clic para seleccionar</p>
                <p className="text-sm text-white/40">Formatos soportados: .xlsx, .xls</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium text-white/80">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  Formato esperado
                </h4>
                <ul className="space-y-1 text-sm text-white/60">
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
              className="flex min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div className="mb-4 flex flex-shrink-0 items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-3">
                <FileSpreadsheet className="h-8 w-8 text-green-500" />
                <div className="flex-1">
                  <p className="font-medium text-white">{fileName}</p>
                  <p className="text-sm text-white/60">
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

              <ScrollArea className="h-[350px] rounded-lg border border-white/10">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-[#1a1a2e]">
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="w-24 text-white/60">Código Cat.</TableHead>
                      <TableHead className="text-white/60">Categoría</TableHead>
                      <TableHead className="w-24 text-white/60">Código Sub.</TableHead>
                      <TableHead className="text-white/60">Subcategoría</TableHead>
                      <TableHead className="w-20 text-white/60">Tipo</TableHead>
                      <TableHead className="w-24 text-white/60">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((category) => {
                      const sortedSubcategories = [...category.subcategories].sort(
                        (left, right) => left.display_order - right.display_order,
                      );
                      const domainLabel =
                        category.domain === 'PRODUCT' ? (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <Package className="w-3 h-3" /> Producto
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-purple-400">
                            <Wrench className="w-3 h-3" /> Servicio
                          </span>
                        );

                      if (sortedSubcategories.length === 0) {
                        return (
                          <TableRow key={category.code} className="border-white/10 hover:bg-white/5">
                            <TableCell className="font-mono text-orange-400">{category.code}</TableCell>
                            <TableCell className="text-white">{category.name}</TableCell>
                            <TableCell className="text-white/40">-</TableCell>
                            <TableCell className="text-white/40">-</TableCell>
                            <TableCell>{domainLabel}</TableCell>
                            <TableCell>
                              {isCategoryExisting(category.code) ? (
                                <Badge variant="outline" className="border-yellow-500/50 text-xs text-yellow-400">
                                  Existe
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-500/50 text-xs text-green-400">
                                  Nueva
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return sortedSubcategories.map((subcategory, index) => (
                        <TableRow key={`${category.code}-${subcategory.code}`} className="border-white/10 hover:bg-white/5">
                          <TableCell className="font-mono text-orange-400">{index === 0 ? category.code : ''}</TableCell>
                          <TableCell className="text-white">{index === 0 ? category.name : ''}</TableCell>
                          <TableCell className="font-mono text-blue-400">{subcategory.code}</TableCell>
                          <TableCell className="text-white/80">{subcategory.name}</TableCell>
                          <TableCell>{domainLabel}</TableCell>
                          <TableCell>
                            {isSubcategoryExisting(category.code, subcategory.code) ? (
                              <Badge variant="outline" className="border-yellow-500/50 text-xs text-yellow-400">
                                Existe
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500/50 text-xs text-green-400">
                                Nueva
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ));
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
              <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-orange-500" />
              <p className="text-white/80">Importando datos...</p>
              <p className="mt-2 text-sm text-white/40">
                Por favor, espera mientras se crean categorías y subcategorías.
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
              <div className="mb-6 text-center">
                {importResult.errors.length === 0 ? (
                  <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
                ) : (
                  <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
                )}
                <h3 className="text-lg font-medium text-white">Importación completada</h3>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-sm text-white/60">Categorías</p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      {importResult.categoriesCreated} creadas
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      {importResult.categoriesSkipped} omitidas
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="mb-1 text-sm text-white/60">Subcategorías</p>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      {importResult.subcategoriesCreated} creadas
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      {importResult.subcategoriesSkipped} omitidas
                    </span>
                  </div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="mb-2 flex items-center gap-2 font-medium text-red-400">
                    <XCircle className="w-4 h-4" />
                    Errores ({importResult.errors.length})
                  </p>
                  <ScrollArea className="h-32">
                    <ul className="space-y-1 text-sm text-red-300/80">
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
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
                onClick={() => void handleImport()}
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
