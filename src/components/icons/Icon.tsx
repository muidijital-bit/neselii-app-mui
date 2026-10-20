import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';

import { colors } from '@/theme';

import { iconData, type IconName } from './iconData.generated';

export type { IconName };

const elements = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline, polygon: Polygon, ellipse: Ellipse };

const toCamel = (key: string) => key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

type Props = {
  name: IconName;
  /** Piksel; tasarımdaki `font-size` ile aynı (24×24 çizim ölçeklenir, stroke oranı korunur). */
  size?: number;
  color?: string;
  /** Çizim biriminde (24'lük viewBox), kaynakta 2. */
  strokeWidth?: number;
  /** Dolu ikon (ör. seçili favori kalbi). */
  filled?: boolean;
  /** Verilmezse ikon süs sayılır ve ekran okuyucudan gizlenir. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

export function Icon({
  name,
  size = 24,
  color = colors.ink,
  strokeWidth = 2,
  filled = false,
  accessibilityLabel,
  style,
  testID,
}: Props) {
  const decorative = accessibilityLabel === undefined;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
      testID={testID ?? `icon-${name}`}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}>
      {iconData[name].map(([tag, props], index) => {
        const Element = elements[tag];
        const camelProps = Object.fromEntries(Object.entries(props).map(([k, v]) => [toCamel(k), v]));
        return <Element key={`${name}-${index}`} {...camelProps} />;
      })}
    </Svg>
  );
}
