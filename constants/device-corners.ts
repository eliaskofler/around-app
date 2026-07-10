import * as Device from "expo-device";
import { Platform } from "react-native";

export const DEVICE_CORNER_RADII = {
  iphoneX: 39.0,
  iphoneXr: 41.5,
  iphone12Mini: 44.0,
  iphone12: 47.33,
  iphone12ProMax: 53.33,
  iphone14Pro: 55.0,
  iphone16Pro: 62.0,
  ipad: 18.0,
} as const;

export const DEFAULT_DEVICE_CORNER_RADIUS = DEVICE_CORNER_RADII.iphone14Pro;

export function getDeviceCornerRadius(deviceName?: string | null) {
  const normalized = (deviceName ?? Device.modelId ?? "").toLowerCase();

  if (Platform.OS === "ios") {
    if (normalized.includes("ipad")) {
      return DEVICE_CORNER_RADII.ipad;
    }

    if (normalized.includes("iphone 16 pro max") || normalized.includes("iphone 17 pro max") || normalized.includes("iphone air")) {
      return DEVICE_CORNER_RADII.iphone16Pro;
    }

    if (normalized.includes("iphone 16") || normalized.includes("iphone 15") || normalized.includes("iphone 14 pro") || normalized.includes("iphone 14") || normalized.includes("iphone 13") || normalized.includes("iphone 12")) {
      return normalized.includes("max") || normalized.includes("plus")
        ? DEVICE_CORNER_RADII.iphone12ProMax
        : normalized.includes("mini")
          ? DEVICE_CORNER_RADII.iphone12Mini
          : DEVICE_CORNER_RADII.iphone12;
    }

    if (normalized.includes("iphone 11") || normalized.includes("iphone xr") || normalized.includes("iphone x")) {
      return normalized.includes("xr") ? DEVICE_CORNER_RADII.iphoneXr : DEVICE_CORNER_RADII.iphoneX;
    }
  }

  return DEFAULT_DEVICE_CORNER_RADIUS;
}
