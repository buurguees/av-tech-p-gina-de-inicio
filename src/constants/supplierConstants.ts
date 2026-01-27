import { Package, Briefcase, Wrench, Utensils, Car, CircleDollarSign, ParkingSquare } from "lucide-react";

export const SUPPLIER_CATEGORIES = [
  { value: 'SOFTWARE', label: 'Software', icon: Package, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'EXTERNAL_SERVICES', label: 'Servicios Externos', icon: Briefcase, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { value: 'MATERIAL', label: 'Material', icon: Wrench, color: 'text-green-600', bgColor: 'bg-green-100' },
  { value: 'DIETAS', label: 'Dietas', icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { value: 'GASOLINA', label: 'Gasolina', icon: Car, color: 'text-red-600', bgColor: 'bg-red-100' },
  { value: 'PEAJES', label: 'Peajes', icon: CircleDollarSign, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { value: 'PARKINGS', label: 'Parkings', icon: ParkingSquare, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
] as const;

export const SUPPLIER_STATUSES = [
  { value: 'ACTIVE', label: 'Activo', color: 'text-green-600', bgColor: 'bg-green-100', dotColor: 'bg-green-500' },
  { value: 'INACTIVE', label: 'Inactivo', color: 'text-gray-600', bgColor: 'bg-gray-100', dotColor: 'bg-gray-400' },
  { value: 'BLOCKED', label: 'Bloqueado', color: 'text-red-600', bgColor: 'bg-red-100', dotColor: 'bg-red-500' },
] as const;

export function getCategoryInfo(category: string | null) {
  return SUPPLIER_CATEGORIES.find(c => c.value === category) || null;
}

export function getSupplierStatusInfo(status: string) {
  return SUPPLIER_STATUSES.find(s => s.value === status) || SUPPLIER_STATUSES[0];
}
