import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { StyleSheet, Text, TextInput, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <BlurView intensity={80} tint="systemThinMaterialLight" style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#4a4a4a" />
          <TextInput
            placeholder="Search nearby"
            placeholderTextColor="#5f5f5f"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </BlurView>

        <View style={styles.avatarShell}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>E</Text>
          </View>
        </View>
      </View>

      <View style={styles.contentCard}>
        <Text style={styles.title}>Nearby spots</Text>
        <Text style={styles.copy}>
          This opens as a native form sheet with liquid-glass styling and detents.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: 'transparent',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '30%',
  },
  searchBar: {
    flex: 1,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 0,
    fontSize: 15,
    fontWeight: '500',
    color: '#111',
  },
  avatarShell: {
    padding: 2,
    borderRadius: 999,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2f6fed',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  contentCard: {
    marginTop: 14,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  copy: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
});
