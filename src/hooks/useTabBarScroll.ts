import {useCallback} from 'react';
import {NativeScrollEvent, NativeSyntheticEvent} from 'react-native';
import {useTabBarStore} from '../store/tabBarStore';

const THRESHOLD = 16;

export function useTabBarScroll() {
  const setVisible = useTabBarStore(s => s.setVisible);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
      const atTop = contentOffset.y <= THRESHOLD;
      const atBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - THRESHOLD;
      setVisible(atTop || atBottom);
    },
    [setVisible],
  );

  // Always show when scroll fully stops
  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const {contentOffset, contentSize, layoutMeasurement} = e.nativeEvent;
      const atTop = contentOffset.y <= THRESHOLD;
      const atBottom =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - THRESHOLD;
      setVisible(atTop || atBottom);
    },
    [setVisible],
  );

  return {
    onScroll,
    onMomentumScrollEnd: onScrollEnd,
    onScrollEndDrag: onScrollEnd,
    scrollEventThrottle: 16,
  };
}
