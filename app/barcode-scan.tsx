import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlassSurface } from '@/components/glass-surface';
import { Radius } from '@/constants/theme';
import { lookupBarcode } from '@/utils/open-food-facts';

const FRAME_SIZE = 260;

/** Full-screen camera scanner: point it at a package's barcode, or fall back to typing one in. */
export default function BarcodeScan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ date: string; section?: string }>();
  const [permission, requestPermission] = useCameraPermissions();

  const [status, setStatus] = useState<'scanning' | 'looking-up' | 'not-found'>('scanning');
  // A camera keeps firing `onBarcodeScanned` for the same code every frame —
  // this blocks every call after the first until the lookup it started settles.
  const handling = useRef(false);

  async function handleBarcode(barcode: string) {
    if (handling.current) return;
    handling.current = true;
    setStatus('looking-up');

    const product = await lookupBarcode(barcode);

    if (product) {
      router.push({ pathname: '/food-result', params: { ...params, barcode: product.barcode } });
      return;
    }

    handling.current = false;
    setStatus('not-found');
  }

  function tryAgain() {
    setStatus('scanning');
  }

  function openByName() {
    router.push({ pathname: '/food-search', params });
  }

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer, { paddingTop: insets.top }]}>
        <SymbolView
          name={{ ios: 'barcode.viewfinder', android: 'barcode_scanner', web: 'barcode_scanner' }}
          size={40}
          tintColor="#FFFFFF"
        />
        <Text style={styles.permissionTitle}>Camera Access Needed</Text>
        <Text style={styles.permissionBody}>
          Around uses your camera to scan a package&apos;s barcode and look up its nutrition.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
          style={({ pressed }) => [styles.permissionButton, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.permissionButtonLabel}>
            {permission.canAskAgain ? 'Allow Camera Access' : 'Open Settings'}
          </Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.cancelLink}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
        onBarcodeScanned={
          status === 'scanning' ? ({ data }) => void handleBarcode(data) : undefined
        }
      />

      <View style={[styles.topBar, { top: insets.top + 12 }]}>
        <RoundButton icon={{ ios: 'xmark', android: 'close', web: 'close' }} onPress={() => router.back()} />
        <RoundButton
          icon={{ ios: 'text.magnifyingglass', android: 'search', web: 'search' }}
          onPress={openByName}
        />
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={styles.frame} />
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 24 }]}>
        {status === 'looking-up' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.statusText}>Looking it up…</Text>
          </View>
        ) : status === 'not-found' ? (
          <View style={styles.notFound}>
            <Text style={styles.statusText}>No match for that barcode.</Text>
            <View style={styles.notFoundActions}>
              <Pressable
                accessibilityRole="button"
                onPress={tryAgain}
                style={({ pressed }) => [styles.pill, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={styles.pillLabel}>Try Again</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={openByName}
                style={({ pressed }) => [styles.pill, styles.pillPrimary, { opacity: pressed ? 0.7 : 1 }]}>
                <Text style={[styles.pillLabel, styles.pillLabelPrimary]}>Search by Name</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.statusText}>Align the barcode within the frame</Text>
            <Pressable accessibilityRole="button" onPress={openByName} hitSlop={12}>
              <Text style={styles.manualLink}>Enter barcode manually</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

type RoundButtonProps = {
  icon: Parameters<typeof SymbolView>[0]['name'];
  onPress: () => void;
};

function RoundButton({ icon, onPress }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      <GlassSurface style={styles.roundButton}>
        <SymbolView name={icon} size={19} tintColor="#FFFFFF" />
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  permissionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 8,
  },
  permissionBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.pill,
  },
  permissionButtonLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelLink: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginTop: 8,
  },
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE * 0.62,
    borderRadius: Radius.large,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'center',
  },
  manualLink: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  notFound: {
    alignItems: 'center',
    gap: 14,
  },
  notFoundActions: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  pillPrimary: {
    backgroundColor: '#FFFFFF',
  },
  pillLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  pillLabelPrimary: {
    color: '#000000',
  },
});
