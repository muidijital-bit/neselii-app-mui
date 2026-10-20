import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import type { CategoryDefinition } from '@/domain';

import { Icon } from './icons/Icon';

/**
 * Kategori simgesi (2. aşama): Çekici ve Ticari Araç tasarımda dolu araç siluetleriyle çizilir; diğerleri çizgi (lucide) simgedir.
 */
export function CategoryGlyph({ category, size = 22, color }: { category: Pick<CategoryDefinition, 'id' | 'icon'>; size?: number; color: string }) {
  if (category.id === 'cekici') return <MaterialCommunityIcons name="truck" size={size + 4} color={color} />;
  if (category.id === 'ticari-arac') return <MaterialCommunityIcons name="van-utility" size={size + 4} color={color} />;
  return <Icon name={category.icon} size={size} color={color} />;
}
