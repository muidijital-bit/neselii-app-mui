import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { Colors, type ColorName } from '@/ui/theme';

type FeatherName = ComponentProps<typeof Feather>['name'];
type MciName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Feather adları doğrudan, MaterialCommunityIcons adları `mci:` önekiyle verilir. */
export type IconName = FeatherName | `mci:${MciName}`;

type Props = {
  name: IconName;
  size?: number;
  color?: ColorName | (string & {});
  style?: StyleProp<TextStyle>;
};

export function Icon({ name, size = 22, color = 'heading', style }: Props) {
  const resolved = color in Colors ? Colors[color as ColorName] : color;
  if (name.startsWith('mci:')) {
    return (
      <MaterialCommunityIcons name={name.slice(4) as MciName} size={size} color={resolved} style={style} />
    );
  }
  return <Feather name={name as FeatherName} size={size} color={resolved} style={style} />;
}
