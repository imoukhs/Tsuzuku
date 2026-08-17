import { Redirect } from 'expo-router';

// Sits outside the (tabs) group deliberately: NativeTabs only builds its
// route table from explicitly declared <NativeTabs.Trigger> children (see
// node_modules/expo-router/build/native-tabs/NativeBottomTabsNavigator.js),
// so an index.tsx *inside* (tabs)/ with no matching Trigger would leave the
// navigator unable to find a focused tab for it. Redirecting here, before
// NativeTabs ever mounts, avoids that entirely.
export default function RootIndex() {
  return <Redirect href="/library" />;
}
