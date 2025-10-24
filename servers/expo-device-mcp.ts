import { Platform } from 'react-native';

export type GyroSample = { x: number; y: number; z: number; timestamp?: number };
export type GyroOutput = { gyro?: GyroSample; error?: string };
export type CameraPermissionOutput = { canAccessCamera: boolean; platform: string };

export class ExpoDeviceMCPServer {
  async handleGyroscopeData(): Promise<GyroOutput> {
    if (Platform.OS === 'web') {
      console.log('[ExpoDeviceMCPServer] Gyroscope not supported on web via expo-sensors');
      return { error: 'Gyroscope not available on web' };
    }

    try {
      const Sensors = await import('expo-sensors');
      Sensors.Gyroscope.setUpdateInterval(100);
      return await new Promise<GyroOutput>((resolve) => {
        const sub = Sensors.Gyroscope.addListener((data: any) => {
          console.log('[ExpoDeviceMCPServer] Gyro sample', data);
          // return first sample then clean up
          sub.remove();
          resolve({ gyro: data as GyroSample });
        });
        // safety timeout
        setTimeout(() => {
          try {
            sub.remove();
          } catch {}
          resolve({ error: 'Gyroscope timeout' });
        }, 3000);
      });
    } catch (e) {
      console.error('[ExpoDeviceMCPServer] Gyroscope error', e);
      return { error: 'Failed to read gyroscope' };
    }
  }

  async handleTakePhoto(): Promise<CameraPermissionOutput> {
    try {
      const { Camera } = await import('expo-camera');
      const perm = await Camera.requestCameraPermissionsAsync();
      const granted = perm.status === 'granted';
      console.log('[ExpoDeviceMCPServer] Camera permission', perm.status);
      return { canAccessCamera: granted, platform: Platform.OS };
    } catch (e) {
      console.error('[ExpoDeviceMCPServer] Camera permission error', e);
      return { canAccessCamera: false, platform: Platform.OS };
    }
  }
}
