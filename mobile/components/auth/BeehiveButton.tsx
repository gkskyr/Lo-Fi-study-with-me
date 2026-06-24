import { useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

const SIZE = 200;

export default function BeehiveButton({ onPress }: { onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  function pressIn() {
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ width: SIZE, height: SIZE, transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ position: 'absolute' }}>
          <Svg width={SIZE} height={SIZE} viewBox="0 0 200 200">
            <Polygon
              points="100,5 190,52 190,148 100,195 10,148 10,52"
              fill="#fbbf24"
              stroke="#f59e0b"
              strokeWidth="3"
            />
          </Svg>
        </View>
        <Text style={{ color: '#78350f', fontWeight: '900', fontSize: 24, letterSpacing: 2 }}>
          koZan
        </Text>
        <Text style={{ color: '#b45309', fontSize: 11, marginTop: 4, letterSpacing: 1 }}>
          BAŞLA
        </Text>
      </Pressable>
    </Animated.View>
  );
}
