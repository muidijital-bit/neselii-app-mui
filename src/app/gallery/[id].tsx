import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { StateView } from '@/components/state-view';
import { Text } from '@/components/text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useListing } from '@/features/listings/api';
import type { ListingMediaRow } from '@/types/database';

const THUMB = 84;

export default function GalleryScreen() {
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listing = useListing(id);
  const pager = useRef<FlatList<ListingMediaRow>>(null);
  const thumbs = useRef<FlatList<ListingMediaRow>>(null);
  const [current, setCurrent] = useState(Number(index ?? 0));

  // Fotoğraflar önce, video en sonda
  const media = [
    ...(listing.data?.media.filter((m) => m.type === 'image') ?? []),
    ...(listing.data?.media.filter((m) => m.type === 'video') ?? []),
  ];
  const photoCount = media.filter((m) => m.type === 'image').length;
  const videoUrl = media.find((m) => m.type === 'video')?.url ?? null;
  const player = useVideoPlayer(videoUrl);
  const active = media[current];

  const goTo = (i: number) => {
    setCurrent(i);
    pager.current?.scrollToIndex({ index: i, animated: true });
  };

  const onPageChange = (i: number) => {
    if (i === current) return;
    setCurrent(i);
    thumbs.current?.scrollToIndex({ index: i, animated: true, viewPosition: 0.5 });
    if (media[i]?.type !== 'video') player.pause();
  };

  if (listing.isLoading) return <StateView loading />;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <Pressable hitSlop={12} accessibilityLabel="Kapat" onPress={() => router.back()}>
          <Icon name="x" size={30} color="white" />
        </Pressable>
        <Text variant="heading" style={styles.white}>
          {active?.type === 'video' ? 'Video' : `${Math.min(current + 1, photoCount)} / ${photoCount}`}
        </Text>
        <Pressable
          hitSlop={12}
          accessibilityLabel="Paylaş"
          onPress={() => active && Share.share({ message: `${listing.data?.title}\n${active.url}` })}>
          <Icon name="share-2" size={26} color="white" />
        </Pressable>
      </View>

      <FlatList
        ref={pager}
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={Math.min(current, Math.max(0, media.length - 1))}
        getItemLayout={(_d, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(m) => m.id}
        onMomentumScrollEnd={(e) => onPageChange(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.pager}
        renderItem={({ item }) => (
          <View style={[styles.page, { width }]}>
            {item.type === 'video' ? (
              <VideoView player={player} style={{ width, height: width * 0.78 }} nativeControls contentFit="contain" />
            ) : (
              <ScrollView
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}>
                <Image source={item.url} style={{ width, height: width * 0.78 }} contentFit="contain" />
              </ScrollView>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.page, { width }]}>
            <Icon name="camera-off" size={48} color={Colors.navyBorder} />
            <Text variant="body" style={styles.muted}>
              Bu ilana henüz fotoğraf eklenmedi.
            </Text>
          </View>
        }
      />

      <View style={styles.caption}>
        <Text variant="subheading" align="center" style={styles.white}>
          {listing.data?.title}
        </Text>
        <Text variant="small" align="center" style={styles.muted}>
          {active?.type === 'video' ? 'Kaydırarak gezinin' : 'Kaydırarak gezinin · iki parmakla yakınlaştırın'}
        </Text>
      </View>

      <FlatList
        ref={thumbs}
        data={media}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(m) => `thumb-${m.id}`}
        getItemLayout={(_d, i) => ({ length: THUMB + Spacing.two, offset: (THUMB + Spacing.two) * i, index: i })}
        contentContainerStyle={[styles.thumbs, { paddingBottom: insets.bottom + Spacing.three }]}
        style={styles.thumbList}
        renderItem={({ item, index: i }) => (
          <Pressable
            accessibilityLabel={item.type === 'video' ? 'Video' : `Fotoğraf ${i + 1}`}
            onPress={() => goTo(i)}
            style={[styles.thumb, i === current && styles.thumbActive]}>
            {item.type === 'video' ? (
              <View style={styles.videoThumb}>
                <Icon name="play" size={24} color="green" />
                <Text variant="caption" style={styles.white}>
                  Video
                </Text>
              </View>
            ) : (
              <Image source={item.url} style={styles.thumbImage} contentFit="cover" />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  white: { color: Colors.white },
  muted: { color: '#9AA4B2' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
  },
  pager: { flexGrow: 0, marginTop: 'auto' },
  page: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, minHeight: 280 },
  caption: { gap: Spacing.one, paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  thumbList: { flexGrow: 0, marginTop: 'auto' },
  thumbs: { gap: Spacing.two, paddingHorizontal: Spacing.four },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#161D29',
  },
  thumbActive: { borderColor: Colors.white },
  thumbImage: { width: '100%', height: '100%' },
  videoThumb: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
});
