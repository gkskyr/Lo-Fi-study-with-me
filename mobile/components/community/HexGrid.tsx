import { useRef } from 'react';
import { Animated, Pressable, Text, View, ScrollView, Dimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import type { Room } from '../../lib/api';

const { width: SCREEN_W } = Dimensions.get('window');
const HEX_W = Math.min(150, Math.floor((SCREEN_W - 48) / 3));
const HEX_H = Math.round(HEX_W * 1.1547);
const COLS = 3;
const ROW_STEP = Math.round(HEX_H * 0.75);
const HEX_COLORS = ['#ffb940', '#ffd34f'];

function HexRoom({ room, onPress, index }: { room: Room; onPress: () => void; index: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const bg = HEX_COLORS[index % HEX_COLORS.length];
  const pts = '50,0 100,25 100,75 50,100 0,75 0,25';

  function pressIn() {
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  }

  return (
    <Animated.View style={{ width: HEX_W, height: HEX_H, transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={onPress}
        style={{ width: HEX_W, height: HEX_H, alignItems: 'center', justifyContent: 'center' }}
      >
        <View style={{ position: 'absolute' }}>
          <Svg width={HEX_W} height={HEX_H} viewBox="0 0 100 115.47">
            <Polygon points={pts} fill={bg} />
          </Svg>
        </View>
        <Text
          style={{ color: '#78350f', fontWeight: '700', fontSize: 11, textAlign: 'center', paddingHorizontal: 10, lineHeight: 15 }}
          numberOfLines={3}
        >
          {room.title}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

interface Props {
  rooms: Room[];
  onRoomPress: (room: Room) => void;
}

export default function HexGrid({ rooms, onRoomPress }: Props) {
  const totalRows = Math.ceil(rooms.length / COLS);
  const containerH = totalRows > 1 ? (totalRows - 1) * ROW_STEP + HEX_H + 16 : HEX_H + 16;
  const containerW = COLS * HEX_W + Math.floor(HEX_W / 2);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: containerW, height: containerH, position: 'relative' }}>
          {rooms.map((room, i) => {
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            const isOddRow = row % 2 === 1;
            const x = col * HEX_W + (isOddRow ? Math.floor(HEX_W / 2) : 0);
            const y = row * ROW_STEP;
            return (
              <View key={room.id} style={{ position: 'absolute', left: x, top: y }}>
                <HexRoom room={room} onPress={() => onRoomPress(room)} index={i} />
              </View>
            );
          })}
        </View>
      </ScrollView>
    </ScrollView>
  );
}
