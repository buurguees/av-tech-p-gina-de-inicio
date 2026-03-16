import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FolderTree,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Tags,
  Trash2,
  Upload,
  Wrench,
} from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { CategoryImportDialog } from './CategoryImportDialog';

type CategoryDomain = 'PRODUCT' | 'SERVICE';

interface CatalogCategory {
  id: string;
  name: string;
  code: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  domain: CategoryDomain;
  product_count: number;
}

interface CategoryFormData {
  name: string;
  code: string;
  description: string;
  sort_order: number;
  domain: CategoryDomain;
}

interface SubcategoryFormData {
  category_id: string;
  name: string;
  code: string;
  description: string;
  sort_order: number;
}

const DOMAIN_META: Record<CategoryDomain, { label: string; icon: typeof Package }> = {
  PRODUCT: { label: 'Productos', icon: Package },
  SERVICE: { label: 'Servicios', icon: Wrench },
};

const DEFAULT_CATEGORY_FORM: CategoryFormData = {
  name: '',
  code: '',
  description: '',
  sort_order: 0,
  domain: 'PRODUCT',
};

const DEFAULT_SUBCATEGORY_FORM: SubcategoryFormData = {
  category_id: '',
  name: '',
  code: '',
  description: '',
  sort_order: 0,
};

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

export function ProductCategoriesTab() {
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [subcategories, setSubcategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CatalogCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CatalogCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>(DEFAULT_CATEGORY_FORM);

  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<CatalogCategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<CatalogCategory | null>(null);
  const [subcategoryFormData, setSubcategoryFormData] = useState<SubcategoryFormData>(DEFAULT_SUBCATEGORY_FORM);

  useEffect(() => {
    void fetchData();
  }, []);

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const subcategoriesByParent = useMemo(() => {
    const map = new Map<string, CatalogCategory[]>();
    for (const subcategory of subcategories) {
      const parentId = subcategory.parent_id;
      if (!parentId) continue;
      const list = map.get(parentId) || [];
      list.push(subcategory);
      map.set(parentId, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
    }

    return map;
  }, [subcategories]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rootResponses = await Promise.all(
        (['PRODUCT', 'SERVICE'] as CategoryDomain[]).map((domain) =>
          supabase.rpc('list_catalog_categories', { p_domain: domain }),
        ),
      );

      for (const response of rootResponses) {
        if (response.error) throw response.error;
      }

      const rootCategories = rootResponses.flatMap((response) => (response.data || []) as CatalogCategory[]);
      const childResponses = await Promise.all(
        rootCategories.map((category) =>
          supabase.rpc('list_catalog_categories', {
            p_domain: category.domain,
            p_parent_id: category.id,
          }),
        ),
      );

      for (const response of childResponses) {
        if (response.error) throw response.error;
      }

      setCategories(rootCategories.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)));
      setSubcategories(
        childResponses
          .flatMap((response) => (response.data || []) as CatalogCategory[])
          .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
      );
    } catch (error: unknown) {
      console.error('Error fetching catalog categories:', error);
      toast.error(getErrorMessage(error) || 'Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  };

  const getSubcategoriesForCategory = (categoryId: string) => subcategoriesByParent.get(categoryId) || [];

  const getCategoryTotalProducts = (categoryId: string) => {
    const category = categoryMap.get(categoryId);
    const children = getSubcategoriesForCategory(categoryId);
    return (category?.product_count || 0) + children.reduce((sum, child) => sum + child.product_count, 0);
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({
      ...DEFAULT_CATEGORY_FORM,
      sort_order: categories.length,
    });
    setShowCategoryDialog(true);
  };

  const openEditCategory = (category: CatalogCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      code: category.code,
      description: category.description || '',
      sort_order: category.sort_order,
      domain: category.domain,
    });
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    const name = categoryFormData.name.trim();
    const code = normalizeCode(categoryFormData.code);
    if (!name || !code) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const { error } = await supabase.rpc('update_catalog_category', {
          p_id: editingCategory.id,
          p_name: name,
          p_code: code,
          p_description: categoryFormData.description.trim() || null,
          p_sort_order: categoryFormData.sort_order,
          p_slug: slugify([code, name]),
        });
        if (error) throw error;
        toast.success('Categoría actualizada');
      } else {
        const { error } = await supabase.rpc('create_catalog_category', {
          p_name: name,
          p_code: code,
          p_description: categoryFormData.description.trim() || null,
          p_sort_order: categoryFormData.sort_order,
          p_slug: slugify([code, name]),
          p_domain: categoryFormData.domain,
        });
        if (error) throw error;
        toast.success('Categoría creada');
      }

      setShowCategoryDialog(false);
      await fetchData();
    } catch (error: unknown) {
      console.error('Error saving category:', error);
      toast.error(getErrorMessage(error) || 'Error al guardar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('delete_catalog_category', {
        p_id: deletingCategory.id,
      });
      if (error) throw error;
      toast.success('Categoría eliminada');
      setDeletingCategory(null);
      await fetchData();
    } catch (error: unknown) {
      console.error('Error deleting category:', error);
      toast.error(getErrorMessage(error) || 'Error al eliminar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCategoryStatus = async (category: CatalogCategory) => {
    try {
      const { error } = await supabase.rpc('update_catalog_category', {
        p_id: category.id,
        p_is_active: !category.is_active,
      });
      if (error) throw error;
      toast.success(category.is_active ? 'Categoría desactivada' : 'Categoría activada');
      await fetchData();
    } catch (error: unknown) {
      console.error('Error toggling category status:', error);
      toast.error(getErrorMessage(error) || 'Error al cambiar el estado');
    }
  };

  const openCreateSubcategory = (category: CatalogCategory) => {
    const categorySubcategories = getSubcategoriesForCategory(category.id);
    setEditingSubcategory(null);
    setSubcategoryFormData({
      ...DEFAULT_SUBCATEGORY_FORM,
      category_id: category.id,
      sort_order: categorySubcategories.length,
    });
    setShowSubcategoryDialog(true);
  };

  const openEditSubcategory = (subcategory: CatalogCategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryFormData({
      category_id: subcategory.parent_id || '',
      name: subcategory.name,
      code: subcategory.code,
      description: subcategory.description || '',
      sort_order: subcategory.sort_order,
    });
    setShowSubcategoryDialog(true);
  };

  const handleSaveSubcategory = async () => {
    const parent = categoryMap.get(subcategoryFormData.category_id);
    const name = subcategoryFormData.name.trim();
    const code = normalizeCode(subcategoryFormData.code);

    if (!parent) {
      toast.error('Selecciona una categoría válida');
      return;
    }

    if (!name || !code) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        p_name: name,
        p_code: code,
        p_description: subcategoryFormData.description.trim() || null,
        p_sort_order: subcategoryFormData.sort_order,
        p_parent_id: parent.id,
        p_slug: slugify([parent.code, code, name]),
      };

      if (editingSubcategory) {
        const { error } = await supabase.rpc('update_catalog_category', {
          p_id: editingSubcategory.id,
          ...payload,
        });
        if (error) throw error;
        toast.success('Subcategoría actualizada');
      } else {
        const { error } = await supabase.rpc('create_catalog_category', {
          ...payload,
          p_domain: parent.domain,
        });
        if (error) throw error;
        toast.success('Subcategoría creada');
      }

      setShowSubcategoryDialog(false);
      await fetchData();
    } catch (error: unknown) {
      console.error('Error saving subcategory:', error);
      toast.error(getErrorMessage(error) || 'Error al guardar la subcategoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deletingSubcategory) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('delete_catalog_category', {
        p_id: deletingSubcategory.id,
      });
      if (error) throw error;
      toast.success('Subcategoría eliminada');
      setDeletingSubcategory(null);
      await fetchData();
    } catch (error: unknown) {
      console.error('Error deleting subcategory:', error);
      toast.error(getErrorMessage(error) || 'Error al eliminar la subcategoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSubcategoryStatus = async (subcategory: CatalogCategory) => {
    try {
      const { error } = await supabase.rpc('update_catalog_category', {
        p_id: subcategory.id,
        p_is_active: !subcategory.is_active,
      });
      if (error) throw error;
      toast.success(subcategory.is_active ? 'Subcategoría desactivada' : 'Subcategoría activada');
      await fetchData();
    } catch (error: unknown) {
      console.error('Error toggling subcategory status:', error);
      toast.error(getErrorMessage(error) || 'Error al cambiar el estado');
    }
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Tags className="w-5 h-5" />
              Categorías del Catálogo
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Gestiona la taxonomía base de productos y servicios para catálogo, numeración y packs.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void fetchData()}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Upload className="w-4 h-4 mr-2" />
              Importar Excel
            </Button>
            <Button onClick={openCreateCategory}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {(['PRODUCT', 'SERVICE'] as CategoryDomain[]).map((domain) => {
            const domainCategories = categories.filter((category) => category.domain === domain);
            const DomainIcon = DOMAIN_META[domain].icon;

            return (
              <div key={domain} className="space-y-3">
                <div className="flex items-center gap-2">
                  <DomainIcon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">{DOMAIN_META[domain].label}</h3>
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    {domainCategories.length}
                  </Badge>
                </div>

                {domainCategories.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay categorías en {DOMAIN_META[domain].label.toLowerCase()}.
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {domainCategories.map((category, index) => {
                      const childItems = getSubcategoriesForCategory(category.id);
                      const totalProducts = getCategoryTotalProducts(category.id);
                      const canDelete = childItems.length === 0 && totalProducts === 0;

                      return (
                        <motion.div
                          key={category.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <AccordionItem
                            value={category.id}
                            className="overflow-hidden rounded-lg border border-border bg-muted/30"
                          >
                            <AccordionTrigger className="px-4 py-3 hover:bg-muted/50 hover:no-underline">
                              <div className="flex w-full items-center justify-between gap-4 pr-4">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    variant="outline"
                                    className={category.is_active ? 'border-primary/50 text-primary' : 'border-border text-muted-foreground'}
                                  >
                                    {category.code}
                                  </Badge>
                                  <span className={category.is_active ? 'text-foreground font-medium' : 'text-muted-foreground font-medium'}>
                                    {category.name}
                                  </span>
                                  <span className="text-sm text-muted-foreground">
                                    {childItems.length} subcategorías, {totalProducts} referencias
                                  </span>
                                </div>
                                <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
                                  <Switch
                                    checked={category.is_active}
                                    onCheckedChange={() => void handleToggleCategoryStatus(category)}
                                  />
                                  <Button variant="ghost" size="icon" onClick={() => openEditCategory(category)}>
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeletingCategory(category)}
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={!canDelete}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="border-t border-border">
                              <div className="space-y-4 p-4">
                                {category.description && (
                                  <p className="text-sm text-muted-foreground">{category.description}</p>
                                )}

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                                    <FolderTree className="w-4 h-4" />
                                    Subcategorías
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => openCreateSubcategory(category)}>
                                    <Plus className="w-3 h-3 mr-1" />
                                    Añadir
                                  </Button>
                                </div>

                                {childItems.length === 0 ? (
                                  <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                    No hay subcategorías.
                                  </div>
                                ) : (
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="text-muted-foreground">Código</TableHead>
                                        <TableHead className="text-muted-foreground">Nombre</TableHead>
                                        <TableHead className="text-muted-foreground">Productos</TableHead>
                                        <TableHead className="text-muted-foreground">Estado</TableHead>
                                        <TableHead className="text-right text-muted-foreground">Acciones</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {childItems.map((subcategory) => (
                                        <TableRow key={subcategory.id} className="border-border hover:bg-muted/50">
                                          <TableCell>
                                            <Badge variant="outline" className="border-border text-muted-foreground">
                                              {category.code}-{subcategory.code}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className={subcategory.is_active ? 'text-foreground' : 'text-muted-foreground'}>
                                            {subcategory.name}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground">{subcategory.product_count}</TableCell>
                                          <TableCell>
                                            <Switch
                                              checked={subcategory.is_active}
                                              onCheckedChange={() => void handleToggleSubcategoryStatus(subcategory)}
                                            />
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                              <Button variant="ghost" size="icon" onClick={() => openEditSubcategory(subcategory)}>
                                                <Pencil className="w-4 h-4" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeletingSubcategory(subcategory)}
                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                disabled={subcategory.product_count > 0}
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </motion.div>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Define el código base que se reutilizará en catálogo, numeración automática y packs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nombre *</Label>
                <Input
                  value={categoryFormData.name}
                  onChange={(event) => setCategoryFormData((current) => ({ ...current, name: event.target.value }))}
                  className="bg-background border-input text-foreground"
                  placeholder="Ej: Pantallas LED"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Código *</Label>
                <Input
                  value={categoryFormData.code}
                  onChange={(event) => setCategoryFormData((current) => ({ ...current, code: normalizeCode(event.target.value) }))}
                  className="bg-background border-input text-foreground"
                  placeholder="Ej: LED"
                  maxLength={12}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Dominio *</Label>
                {editingCategory ? (
                  <div className="flex h-10 items-center rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    {DOMAIN_META[categoryFormData.domain].label}
                  </div>
                ) : (
                  <Select
                    value={categoryFormData.domain}
                    onValueChange={(value: CategoryDomain) =>
                      setCategoryFormData((current) => ({ ...current, domain: value }))
                    }
                  >
                    <SelectTrigger className="bg-background border-input text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PRODUCT">Productos</SelectItem>
                      <SelectItem value="SERVICE">Servicios</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Orden</Label>
                <Input
                  type="number"
                  value={categoryFormData.sort_order}
                  onChange={(event) =>
                    setCategoryFormData((current) => ({
                      ...current,
                      sort_order: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                  className="bg-background border-input text-foreground"
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Descripción</Label>
              <Textarea
                value={categoryFormData.description}
                onChange={(event) =>
                  setCategoryFormData((current) => ({ ...current, description: event.target.value }))
                }
                className="bg-background border-input text-foreground"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveCategory()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubcategoryDialog} onOpenChange={setShowSubcategoryDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Las subcategorías se numeran dentro del código de su categoría padre.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Categoría *</Label>
              <Select
                value={subcategoryFormData.category_id}
                onValueChange={(value) =>
                  setSubcategoryFormData((current) => ({ ...current, category_id: value }))
                }
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.code} - {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Nombre *</Label>
                <Input
                  value={subcategoryFormData.name}
                  onChange={(event) =>
                    setSubcategoryFormData((current) => ({ ...current, name: event.target.value }))
                  }
                  className="bg-background border-input text-foreground"
                  placeholder="Ej: Exterior"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Código *</Label>
                <Input
                  value={subcategoryFormData.code}
                  onChange={(event) =>
                    setSubcategoryFormData((current) => ({
                      ...current,
                      code: normalizeCode(event.target.value),
                    }))
                  }
                  className="bg-background border-input text-foreground"
                  placeholder="Ej: 01"
                  maxLength={12}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Descripción</Label>
                <Textarea
                  value={subcategoryFormData.description}
                  onChange={(event) =>
                    setSubcategoryFormData((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="bg-background border-input text-foreground"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Orden</Label>
                <Input
                  type="number"
                  value={subcategoryFormData.sort_order}
                  onChange={(event) =>
                    setSubcategoryFormData((current) => ({
                      ...current,
                      sort_order: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                  className="bg-background border-input text-foreground"
                  min={0}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubcategoryDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handleSaveSubcategory()} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSubcategory ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Se eliminará la categoría "{deletingCategory?.name}" solo si no tiene subcategorías ni productos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteCategory()}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingSubcategory} onOpenChange={() => setDeletingSubcategory(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">¿Eliminar subcategoría?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Se eliminará la subcategoría "{deletingSubcategory?.name}" si no tiene productos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteSubcategory()}
              disabled={isSubmitting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={() => void fetchData()}
        existingCategories={categories.map((category) => ({
          code: category.code,
          id: category.id,
          domain: category.domain,
        }))}
        existingSubcategories={subcategories.map((subcategory) => ({
          code: subcategory.code,
          id: subcategory.id,
          category_id: subcategory.parent_id || '',
        }))}
      />
    </>
  );
}
