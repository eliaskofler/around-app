import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Region } from "react-native-maps";

const DEFAULT_REGION: Region = {
  latitude: 40.7128,
  longitude: -74.006,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export default function HomeScreen() {
  const mapRef = useRef<MapView>(null);
  const router = useRouter();
  const hasOpenedSheetRef = useRef(false);
  const [mapType, setMapType] = useState<"standard" | "hybrid">("standard");

  useEffect(() => {
    if (!hasOpenedSheetRef.current) {
      hasOpenedSheetRef.current = true;
      const timeout = setTimeout(() => {
        router.push("/modal");
      }, 0);

      return () => clearTimeout(timeout);
    }

    let active = true;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (!active) {
        return;
      }

      if (status !== "granted") {
        console.log("Location permission denied");
        return;
      }

      try {
        const location = await Location.getCurrentPositionAsync({});

        if (!active) {
          return;
        }

        // Smoothly fly to the user's location instead of forcing a controlled
        // `region` prop, which was fighting the user's own pan/zoom gestures.
        mapRef.current?.animateToRegion(
          {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          800
        );
      } catch (error) {
        console.warn("Unable to get location", error);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={DEFAULT_REGION}
        mapType={mapType}
        showsUserLocation
        showsMyLocationButton
      />

      <Pressable
        onPress={() => setMapType(mapType === "standard" ? "hybrid" : "standard")}
        style={styles.mapToggle}
      >
        <Text style={{ fontSize: 22 }}>{mapType === "standard" ? "🛰️" : "🗺️"}</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapToggle: {
    position: "absolute",
    top: 60,
    right: 20,
    backgroundColor: "white",
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },
});