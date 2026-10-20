import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type ComponentRef } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

const FocusScrollContext = createContext<() => void>(() => undefined);

/** Alan odaklandığında formu kaydırıp alanı klavyenin üstüne getirir (`FormScroll` içinde). */
export const useScrollFocusedIntoView = () => useContext(FocusScrollContext);

/** Odaklı alanın üstünde bırakılan boşluk (px): etiketi ve hata iletisi de görünür kalsın. */
const TOP_MARGIN = 140;

/**
 * Giriş/kayıt formu kaydırma kabı. Android'de (kenardan kenara pencere) klavye pencereyi küçültmez ve ScrollView odaklı alanı
 * kendiliğinden görünür kılmaz: klavyenin altında kalan "Şifre" alanı yazılırken görünmezdi (Android 16 emülatöründe ölçüldü).
 * Bu yüzden Android'de klavye yüksekliği kadar alt boşluk eklenir ve odaklı alan klavyenin üstüne kaydırılır (ekranlar
 * `KeyboardAvoidingView`'ı yalnızca iOS'ta etkinleştirir).
 */
type FormScrollProps = {
  children: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Filtre gibi sabit alt çubuklu ekranlarda kaydırma alanı kalan yüksekliği doldurur (`flex: 1`). */
  style?: StyleProp<ViewStyle>;
  showsVerticalScrollIndicator?: boolean;
  testID?: string;
};

export function FormScroll({ children, contentContainerStyle, style, showsVerticalScrollIndicator, testID }: FormScrollProps) {
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<ComponentRef<typeof View>>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollFocusedIntoView = useCallback(() => {
    if (Platform.OS !== 'android') return;
    const input = TextInput.State.currentlyFocusedInput?.();
    const content = contentRef.current;
    if (!input || !content) return;
    input.measureLayout(
      content,
      (_x: number, y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y - TOP_MARGIN), animated: true }),
      () => undefined,
    );
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height); // pencere küçülmediğinden kaydırma payı bizden: klavye kadar alt boşluk
      setTimeout(scrollFocusedIntoView, 80);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [scrollFocusedIntoView]);

  // Odak alanlar arasında değişince (klavye zaten açık) olay gelmez: alan kendisi bildirir; yerleşim oturduktan sonra kaydır.
  const onFieldFocus = useMemo(() => () => void setTimeout(scrollFocusedIntoView, 120), [scrollFocusedIntoView]);

  return (
    <FocusScrollContext.Provider value={onFieldFocus}>
      <ScrollView
        ref={scrollRef}
        style={style}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        testID={testID}>
        <View ref={contentRef} collapsable={false} style={[{ flexGrow: 1 }, contentContainerStyle, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}>
          {children}
        </View>
      </ScrollView>
    </FocusScrollContext.Provider>
  );
}
