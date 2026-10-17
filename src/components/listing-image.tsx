import { Image } from 'expo-image';
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { Colors } from '@/constants/theme';

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  dark?: boolean;
  iconSize?: number;
};

/** İlan fotoğrafı; fotoğraf yoksa yer tutucu gösterir. */
export function ListingImage({ uri, style, dark, iconSize = 28 }: Props) {
  if (!uri) {
    return (
      <View style={[styles.placeholder, dark && styles.dark, style as StyleProp<ViewStyle>]}>
        <Icon name="camera-off" size={iconSize} color={dark ? Colors.navyBorder : Colors.textTertiary} />
      </View>
    );
  }
  return <Image source={uri} style={[styles.image, style]} contentFit="cover" transition={150} />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: Colors.chip, alignItems: 'center', justifyContent: 'center' },
  dark: { backgroundColor: '#161D29' },
  image: { backgroundColor: Colors.chip },
});
