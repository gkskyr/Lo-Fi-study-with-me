import { Modal, View, Image, Pressable, Text, StyleSheet, StatusBar, Dimensions } from 'react-native';

interface Props {
  uri: string | null;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export default function ImageViewer({ uri, onClose }: Props) {
  if (!uri) return null;
  return (
    <Modal visible animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <Pressable style={s.backdrop} onPress={onClose}>
        <Image source={{ uri }} style={s.image} resizeMode="contain" />
        <View style={s.closeBtn} pointerEvents="none">
          <Text style={s.closeText}>✕</Text>
        </View>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width,
    height: height * 0.85,
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
