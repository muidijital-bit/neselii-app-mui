import { SvgXml } from 'react-native-svg';

import { emblemWhiteXml, logoWhiteXml } from './brandAssets.generated';

// Kaynak SVG oranları: logo 282×65, amblem kare.
const variants = {
  logo: { xml: logoWhiteXml, ratio: 282 / 65 },
  emblem: { xml: emblemWhiteXml, ratio: 1 },
} as const;

type Props = {
  /** `logo`: Neşeli Otomotiv yatay logosu · `emblem`: yalnızca amblem. Her ikisi de beyazdır (lacivert zemin için). */
  variant?: keyof typeof variants;
  height: number;
  accessibilityLabel?: string;
  testID?: string;
};

export function BrandLogo({ variant = 'logo', height, accessibilityLabel = 'Neşeli Otomotiv', testID }: Props) {
  const { xml, ratio } = variants[variant];
  return (
    <SvgXml
      xml={xml}
      width={height * ratio}
      height={height}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID ?? `brand-${variant}`}
    />
  );
}
