import { useAuthStore } from '../store/authStore';

beforeEach(() => {
  useAuthStore.setState({ username: null, accessToken: null, isLoggedIn: false });
});

test('setAuth stores credentials and sets isLoggedIn=true', () => {
  useAuthStore.getState().setAuth('testuser', 'tok123');
  const state = useAuthStore.getState();
  expect(state.username).toBe('testuser');
  expect(state.accessToken).toBe('tok123');
  expect(state.isLoggedIn).toBe(true);
});

test('logout clears all credentials', () => {
  useAuthStore.getState().setAuth('testuser', 'tok123');
  useAuthStore.getState().logout();
  const state = useAuthStore.getState();
  expect(state.username).toBeNull();
  expect(state.accessToken).toBeNull();
  expect(state.isLoggedIn).toBe(false);
});
