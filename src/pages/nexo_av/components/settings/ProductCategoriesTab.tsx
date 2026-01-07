import { useState, useEffect } from 'react';
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
  Tags, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  FolderTree,
  Package,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';

interface Category {
  id: string;
  name: string;
  code: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  subcategory_count: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

interface Subcategory {
  id: string;
  category_id: string;
  category_name: string;
  category_code: string;
  name: string;
  code: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

interface CategoryFormData {
  name: string;
  code: string;
  description: string;
  display_order: number;
}

interface SubcategoryFormData {
  category_id: string;
  name: string;
  code: string;
  description: string;
  display_order: number;
}

export function ProductCategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Category dialogs
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [categoryFormData, setCategoryFormData] = useState<CategoryFormData>({
    name: '',
    code: '',
    description: '',
    display_order: 0,
  });

  // Subcategory dialogs
  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);
  const [subcategoryFormData, setSubcategoryFormData] = useState<SubcategoryFormData>({
    category_id: '',
    name: '',
    code: '',
    description: '',
    display_order: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesResult, subcategoriesResult] = await Promise.all([
        supabase.rpc('list_product_categories'),
        supabase.rpc('list_product_subcategories'),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (subcategoriesResult.error) throw subcategoriesResult.error;

      setCategories(categoriesResult.data || []);
      setSubcategories(subcategoriesResult.data || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  // Category handlers
  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryFormData({ name: '', code: '', description: '', display_order: categories.length });
    setShowCategoryDialog(true);
  };

  const openEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      code: category.code,
      description: category.description || '',
      display_order: category.display_order,
    });
    setShowCategoryDialog(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim() || !categoryFormData.code.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const { error } = await supabase.rpc('update_product_category', {
          p_category_id: editingCategory.id,
          p_name: categoryFormData.name,
          p_code: categoryFormData.code,
          p_description: categoryFormData.description || null,
          p_display_order: categoryFormData.display_order,
        });
        if (error) throw error;
        toast.success('Categoría actualizada');
      } else {
        const { error } = await supabase.rpc('create_product_category', {
          p_name: categoryFormData.name,
          p_code: categoryFormData.code,
          p_description: categoryFormData.description || null,
          p_display_order: categoryFormData.display_order,
        });
        if (error) throw error;
        toast.success('Categoría creada');
      }
      setShowCategoryDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving category:', error);
      toast.error(error.message || 'Error al guardar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('delete_product_category', {
        p_category_id: deletingCategory.id,
      });
      if (error) throw error;
      toast.success('Categoría eliminada');
      setDeletingCategory(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error(error.message || 'Error al eliminar la categoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCategoryStatus = async (category: Category) => {
    try {
      const { error } = await supabase.rpc('update_product_category', {
        p_category_id: category.id,
        p_is_active: !category.is_active,
      });
      if (error) throw error;
      toast.success(category.is_active ? 'Categoría desactivada' : 'Categoría activada');
      fetchData();
    } catch (error: any) {
      console.error('Error toggling category status:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  // Subcategory handlers
  const openCreateSubcategory = (categoryId: string) => {
    const categorySubcats = subcategories.filter(s => s.category_id === categoryId);
    setEditingSubcategory(null);
    setSubcategoryFormData({
      category_id: categoryId,
      name: '',
      code: '',
      description: '',
      display_order: categorySubcats.length,
    });
    setShowSubcategoryDialog(true);
  };

  const openEditSubcategory = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory);
    setSubcategoryFormData({
      category_id: subcategory.category_id,
      name: subcategory.name,
      code: subcategory.code,
      description: subcategory.description || '',
      display_order: subcategory.display_order,
    });
    setShowSubcategoryDialog(true);
  };

  const handleSaveSubcategory = async () => {
    if (!subcategoryFormData.name.trim() || !subcategoryFormData.code.trim()) {
      toast.error('Nombre y código son obligatorios');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSubcategory) {
        const { error } = await supabase.rpc('update_product_subcategory', {
          p_subcategory_id: editingSubcategory.id,
          p_name: subcategoryFormData.name,
          p_code: subcategoryFormData.code,
          p_description: subcategoryFormData.description || null,
          p_display_order: subcategoryFormData.display_order,
        });
        if (error) throw error;
        toast.success('Subcategoría actualizada');
      } else {
        const { error } = await supabase.rpc('create_product_subcategory', {
          p_category_id: subcategoryFormData.category_id,
          p_name: subcategoryFormData.name,
          p_code: subcategoryFormData.code,
          p_description: subcategoryFormData.description || null,
          p_display_order: subcategoryFormData.display_order,
        });
        if (error) throw error;
        toast.success('Subcategoría creada');
      }
      setShowSubcategoryDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving subcategory:', error);
      toast.error(error.message || 'Error al guardar la subcategoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deletingSubcategory) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.rpc('delete_product_subcategory', {
        p_subcategory_id: deletingSubcategory.id,
      });
      if (error) throw error;
      toast.success('Subcategoría eliminada');
      setDeletingSubcategory(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting subcategory:', error);
      toast.error(error.message || 'Error al eliminar la subcategoría');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleSubcategoryStatus = async (subcategory: Subcategory) => {
    try {
      const { error } = await supabase.rpc('update_product_subcategory', {
        p_subcategory_id: subcategory.id,
        p_is_active: !subcategory.is_active,
      });
      if (error) throw error;
      toast.success(subcategory.is_active ? 'Subcategoría desactivada' : 'Subcategoría activada');
      fetchData();
    } catch (error: any) {
      console.error('Error toggling subcategory status:', error);
      toast.error('Error al cambiar el estado');
    }
  };

  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(s => s.category_id === categoryId);
  };

  if (loading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-white/40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Tags className="w-5 h-5" />
              Categorías de Producto
            </CardTitle>
            <CardDescription className="text-white/60">
              Gestiona las categorías y subcategorías de productos para el catálogo.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={openCreateCategory}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Categoría
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-white/40 text-center py-12">
              <FolderTree className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay categorías creadas</p>
              <p className="text-sm mt-2">
                Crea tu primera categoría para empezar a organizar el catálogo.
              </p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <AccordionItem 
                    value={category.id} 
                    className="border border-white/10 rounded-lg overflow-hidden bg-white/5"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:bg-white/5 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant="outline" 
                            className={`${category.is_active ? 'border-orange-500/50 text-orange-400' : 'border-white/20 text-white/40'}`}
                          >
                            {category.code}
                          </Badge>
                          <span className={`font-medium ${category.is_active ? 'text-white' : 'text-white/40'}`}>
                            {category.name}
                          </span>
                          <span className="text-white/40 text-sm">
                            ({category.subcategory_count} subcategorías, {category.product_count} productos)
                          </span>
                        </div>
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Switch
                            checked={category.is_active}
                            onCheckedChange={() => handleToggleCategoryStatus(category)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditCategory(category)}
                            className="text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingCategory(category)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            disabled={category.product_count > 0}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="border-t border-white/10">
                      <div className="p-4">
                        {category.description && (
                          <p className="text-white/60 text-sm mb-4">{category.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white/80 text-sm font-medium flex items-center gap-2">
                            <FolderTree className="w-4 h-4" />
                            Subcategorías
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openCreateSubcategory(category.id)}
                            className="border-white/20 text-white hover:bg-white/10"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Añadir
                          </Button>
                        </div>

                        {getSubcategoriesForCategory(category.id).length === 0 ? (
                          <p className="text-white/40 text-sm text-center py-4">
                            No hay subcategorías
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow className="border-white/10 hover:bg-transparent">
                                <TableHead className="text-white/60">Código</TableHead>
                                <TableHead className="text-white/60">Nombre</TableHead>
                                <TableHead className="text-white/60">Productos</TableHead>
                                <TableHead className="text-white/60">Estado</TableHead>
                                <TableHead className="text-white/60 text-right">Acciones</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getSubcategoriesForCategory(category.id).map(subcategory => (
                                <TableRow 
                                  key={subcategory.id} 
                                  className="border-white/10 hover:bg-white/5"
                                >
                                  <TableCell>
                                    <Badge variant="outline" className="border-white/20 text-white/60">
                                      {category.code}-{subcategory.code}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className={subcategory.is_active ? 'text-white' : 'text-white/40'}>
                                    {subcategory.name}
                                  </TableCell>
                                  <TableCell className="text-white/60">
                                    <div className="flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      {subcategory.product_count}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Switch
                                      checked={subcategory.is_active}
                                      onCheckedChange={() => handleToggleSubcategoryStatus(subcategory)}
                                    />
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditSubcategory(subcategory)}
                                        className="text-white/60 hover:text-white hover:bg-white/10"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeletingSubcategory(subcategory)}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingCategory 
                ? 'Modifica los datos de la categoría.' 
                : 'Crea una nueva categoría para organizar tus productos.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Nombre *</Label>
                <Input
                  value={categoryFormData.name}
                  onChange={e => setCategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Pantallas LED"
                  className="bg-white/5 border-white/10 text-white uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Código *</Label>
                <Input
                  value={categoryFormData.code}
                  onChange={e => setCategoryFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Ej: LED"
                  className="bg-white/5 border-white/10 text-white uppercase"
                  maxLength={10}
                />
                <p className="text-xs text-white/40">Código único para identificar la categoría</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Descripción</Label>
              <Textarea
                value={categoryFormData.description}
                onChange={e => setCategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la categoría..."
                className="bg-white/5 border-white/10 text-white"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Orden de visualización</Label>
              <Input
                type="number"
                value={categoryFormData.display_order}
                onChange={e => setCategoryFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="bg-white/5 border-white/10 text-white"
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCategoryDialog(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCategory}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingCategory ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={showSubcategoryDialog} onOpenChange={setShowSubcategoryDialog}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              {editingSubcategory ? 'Editar Subcategoría' : 'Nueva Subcategoría'}
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {editingSubcategory 
                ? 'Modifica los datos de la subcategoría.' 
                : 'Crea una nueva subcategoría dentro de esta categoría.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white/80">Nombre *</Label>
                <Input
                  value={subcategoryFormData.name}
                  onChange={e => setSubcategoryFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ej: Interior"
                  className="bg-white/5 border-white/10 text-white uppercase"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white/80">Código *</Label>
                <Input
                  value={subcategoryFormData.code}
                  onChange={e => setSubcategoryFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Ej: INT"
                  className="bg-white/5 border-white/10 text-white uppercase"
                  maxLength={10}
                />
                <p className="text-xs text-white/40">Código único dentro de la categoría</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Descripción</Label>
              <Textarea
                value={subcategoryFormData.description}
                onChange={e => setSubcategoryFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción de la subcategoría..."
                className="bg-white/5 border-white/10 text-white"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Orden de visualización</Label>
              <Input
                type="number"
                value={subcategoryFormData.display_order}
                onChange={e => setSubcategoryFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                className="bg-white/5 border-white/10 text-white w-24"
                min={0}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubcategoryDialog(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveSubcategory}
              disabled={isSubmitting}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingSubcategory ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Alert */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción eliminará la categoría "{deletingCategory?.name}" y todas sus subcategorías.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Subcategory Alert */}
      <AlertDialog open={!!deletingSubcategory} onOpenChange={() => setDeletingSubcategory(null)}>
        <AlertDialogContent className="bg-zinc-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar subcategoría?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Esta acción eliminará la subcategoría "{deletingSubcategory?.name}".
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSubcategory}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
