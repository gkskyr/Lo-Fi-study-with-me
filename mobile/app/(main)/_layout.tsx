import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#fef3c7' },
        headerTintColor: '#92400e',
        headerTitleStyle: { fontWeight: 'bold' },
        headerBackTitle: 'Geri',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'koZan', headerShown: false }} />
      <Stack.Screen name="personal-room/index" options={{ title: 'Kişisel Oda' }} />
      <Stack.Screen name="community/index" options={{ title: 'Topluluk Odaları' }} />
      <Stack.Screen name="community/[roomId]" options={{ title: 'Oda' }} />
    </Stack>
  );
}
