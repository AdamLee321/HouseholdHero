import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function getCurrentScreenName(): string | undefined {
  if (!navigationRef.isReady()) { return undefined; }
  return navigationRef.getCurrentRoute()?.name;
}
