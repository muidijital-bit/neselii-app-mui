import { Image } from 'expo-image';
import { StyleSheet, View, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/ui/Icon';
import { Text } from '@/ui/Text';
import { Colors } from '@/ui/theme';

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  dark?: boolean;
  iconSize?: number;
  /** Fotoğraf yoksa gösterilecek kategori simgesi */
  icon?: IconName;
  /** Yer tutucuda "Fotoğraf yakında" yazısı */
  showLabel?: boolean;
};

/** İlan fotoğrafı; fotoğraf yoksa kategori simgeli yer tutucu gösterir. */
export function ListingImage({ uri, style, dark, iconSize = 28, icon = 'camera', showLabel }: Props) {
  if (!uri) {
    return (
      <View style={[styles.placeholder, dark && styles.dark, style as StyleProp<ViewStyle>]}>
        <Icon name={icon} size={iconSize} color={dark ? Colors.navyBorder : '#9FB0C7'} />
        {showLabel ? (
          <Text variant="caption" style={styles.label}>
            Fotoğraf yakında
          </Text>
        ) : null}
      </View>
    );
  }
  return <Image source={uri} style={[styles.image, style]} contentFit="cover" transition={200} recyclingKey={uri} />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#E8EDF4', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dark: { backgroundColor: '#161D29' },
  image: { backgroundColor: '#E8EDF4' },
  label: { color: '#8A9AB0' },
});
