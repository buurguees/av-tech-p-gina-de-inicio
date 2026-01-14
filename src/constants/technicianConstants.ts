import { Building2, User, UserCheck, Wrench, Speaker, Tv, Lightbulb, MonitorPlay, Settings } from "lucide-react";

export const TECHNICIAN_TYPES = [
  { value: 'COMPANY', label: 'Empresa', icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { value: 'FREELANCER', label: 'Autónomo', icon: User, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { value: 'EMPLOYEE', label: 'Plantilla', icon: UserCheck, color: 'text-green-600', bgColor: 'bg-green-100' },
] as const;

export const TECHNICIAN_STATUSES = [
  { value: 'ACTIVE', label: 'Activo', color: 'text-green-600', bgColor: 'bg-green-100', dotColor: 'bg-green-500' },
  { value: 'INACTIVE', label: 'Inactivo', color: 'text-gray-600', bgColor: 'bg-gray-100', dotColor: 'bg-gray-400' },
  { value: 'BLOCKED', label: 'Bloqueado', color: 'text-red-600', bgColor: 'bg-red-100', dotColor: 'bg-red-500' },
] as const;

export const TECHNICIAN_SPECIALTIES = [
  { value: 'LED Indoor', label: 'LED Indoor', icon: MonitorPlay },
  { value: 'LED Outdoor', label: 'LED Outdoor', icon: Tv },
  { value: 'Audio', label: 'Audio', icon: Speaker },
  { value: 'Iluminación', label: 'Iluminación', icon: Lightbulb },
  { value: 'Rigging', label: 'Rigging', icon: Wrench },
  { value: 'Instalación', label: 'Instalación', icon: Settings },
  { value: 'Mantenimiento', label: 'Mantenimiento', icon: Wrench },
  { value: 'Video', label: 'Video', icon: Tv },
] as const;

export const SPANISH_PROVINCES = [
  'Álava', 'Albacete', 'Alicante', 'Almería', 'Asturias', 'Ávila', 'Badajoz', 'Barcelona',
  'Burgos', 'Cáceres', 'Cádiz', 'Cantabria', 'Castellón', 'Ciudad Real', 'Córdoba', 'Cuenca',
  'Girona', 'Granada', 'Guadalajara', 'Guipúzcoa', 'Huelva', 'Huesca', 'Islas Baleares',
  'Jaén', 'La Coruña', 'La Rioja', 'Las Palmas', 'León', 'Lleida', 'Lugo', 'Madrid',
  'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Palencia', 'Pontevedra', 'Salamanca',
  'Santa Cruz de Tenerife', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo',
  'Valencia', 'Valladolid', 'Vizcaya', 'Zamora', 'Zaragoza'
] as const;

export function getTypeInfo(type: string) {
  return TECHNICIAN_TYPES.find(t => t.value === type) || TECHNICIAN_TYPES[1];
}

export function getStatusInfo(status: string) {
  return TECHNICIAN_STATUSES.find(s => s.value === status) || TECHNICIAN_STATUSES[0];
}
