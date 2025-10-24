import { useCallback, useMemo, useRef } from 'react';
import { Animated, GestureResponderEvent, PanResponder, PanResponderGestureState, PanResponderInstance, Platform } from 'react-native';

export type MobileGestures = {
  panHandlers: PanResponderInstance['panHandlers'];
  scale: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  reset: () => void;
  getTransformStyle: () => {
    transform: (
      | { translateX: Animated.Value }
      | { translateY: Animated.Value }
      | { scale: Animated.Value }
    )[];
  };
};

function distance(touches: readonly { pageX: number; pageY: number }[]) {
  const [a, b] = touches;
  const dx = a.pageX - b.pageX;
  const dy = a.pageY - b.pageY;
  return Math.hypot(dx, dy);
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

export function useMobileGestures(): MobileGestures {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const currentScaleRef = useRef<number>(1);
  const lastOffsetXRef = useRef<number>(0);
  const lastOffsetYRef = useRef<number>(0);
  const initialPinchDistanceRef = useRef<number | null>(null);
  const startScaleRef = useRef<number>(1);

  const setScale = useCallback((val: number) => {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, val));
    currentScaleRef.current = clamped;
    scale.setValue(clamped);
  }, [scale]);

  const applyPan = useCallback((dx: number, dy: number) => {
    translateX.setValue(lastOffsetXRef.current + dx);
    translateY.setValue(lastOffsetYRef.current + dy);
  }, [translateX, translateY]);

  const onMove = useCallback((_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    const touchesCount = (gestureState as unknown as { numberActiveTouches?: number }).numberActiveTouches ?? 1;

    if ((gestureState as unknown as { touches?: any[] }).touches?.length >= 2 || touchesCount >= 2) {
      const nativeEvent = _?.nativeEvent as unknown as { touches?: { pageX: number; pageY: number }[] };
      const t = nativeEvent?.touches ?? [];
      if (t.length >= 2) {
        if (initialPinchDistanceRef.current == null) {
          initialPinchDistanceRef.current = distance(t);
          startScaleRef.current = currentScaleRef.current;
        }
        const d = distance(t);
        const ratio = d / (initialPinchDistanceRef.current || d);
        setScale(startScaleRef.current * ratio);
      }
    } else {
      applyPan(gestureState.dx, gestureState.dy);
    }
  }, [applyPan, setScale]);

  const onGrant = useCallback((_: GestureResponderEvent) => {
    initialPinchDistanceRef.current = null;
  }, []);

  const onRelease = useCallback((_: GestureResponderEvent, gestureState: PanResponderGestureState) => {
    lastOffsetXRef.current += gestureState.dx;
    lastOffsetYRef.current += gestureState.dy;
    initialPinchDistanceRef.current = null;
    startScaleRef.current = currentScaleRef.current;
  }, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_evt, gs) => {
          const isPan = Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2;
          const nat = (_evt.nativeEvent as unknown as { touches?: any[] }).touches ?? [];
          const isPinch = nat.length >= 2;
          return isPan || isPinch;
        },
        onPanResponderGrant: onGrant,
        onPanResponderMove: onMove,
        onPanResponderRelease: onRelease,
        onPanResponderTerminate: onRelease,
        onPanResponderTerminationRequest: () => true,
      }),
    [onGrant, onMove, onRelease]
  );

  const reset = () => {
    console.log('[useMobileGestures] reset');
    currentScaleRef.current = 1;
    lastOffsetXRef.current = 0;
    lastOffsetYRef.current = 0;
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
  };

  const getTransformStyle = () => ({
    transform: [
      { translateX },
      { translateY },
      { scale },
    ],
  });

  if (Platform.OS === 'web') {
    console.log('[useMobileGestures] Loaded on web');
  }

  return { panHandlers: panResponder.panHandlers, scale, translateX, translateY, reset, getTransformStyle };
}
