import { StyleSheet, Text as RNText, type TextProps } from 'react-native';

import { Colors, Fonts, type ColorName } from '@/constants/theme';

const variants = StyleSheet.create({
  display: { fontFamily: Fonts.headingHeavy, fontSize: 30, lineHeight: 38, color: Colors.heading },
  title: { fontFamily: Fonts.heading, fontSize: 24, lineHeight: 31, color: Colors.heading },
  heading: { fontFamily: Fonts.heading, fontSize: 20, lineHeight: 26, color: Colors.heading },
  subheading: { fontFamily: Fonts.heading, fontSize: 17, lineHeight: 23, color: Colors.heading },
  body: { fontFamily: Fonts.regular, fontSize: 16, lineHeight: 23, color: Colors.text },
  bodyMedium: { fontFamily: Fonts.medium, fontSize: 16, lineHeight: 23, color: Colors.text },
  bodySemibold: { fontFamily: Fonts.semibold, fontSize: 16, lineHeight: 23, color: Colors.text },
  small: { fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  smallMedium: { fontFamily: Fonts.medium, fontSize: 14, lineHeight: 20, color: Colors.text },
  smallSemibold: { fontFamily: Fonts.semibold, fontSize: 14, lineHeight: 20, color: Colors.text },
  caption: { fontFamily: Fonts.medium, fontSize: 12, lineHeight: 16, color: Colors.textSecondary },
  overline: {
    fontFamily: Fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textSecondary,
  },
  price: { fontFamily: Fonts.heading, fontSize: 19, lineHeight: 24, color: Colors.heading },
  priceLarge: { fontFamily: Fonts.headingHeavy, fontSize: 30, lineHeight: 36, color: Colors.heading },
});

export type TextVariant = keyof typeof variants;

type Props = TextProps & {
  variant?: TextVariant;
  color?: ColorName;
  align?: 'left' | 'center' | 'right';
};

export function Text({ variant = 'body', color, align, style, ...rest }: Props) {
  return (
    <RNText
      style={[variants[variant], color && { color: Colors[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
