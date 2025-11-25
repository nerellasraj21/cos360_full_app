// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'person.2.fill': 'people',
  'dollarsign.circle.fill': 'monetization-on',
  'book.fill': 'book',
  'car.fill': 'directions-car',
  'person.3.fill': 'people-alt',
  // New mappings for drawer
  'gear': 'settings',
  'calendar': 'calendar-today',
  'building.2': 'business',
  'rectangle.3.group': 'view-module',
  'person.2': 'people',
  'clock': 'access-time',
  'person.badge.plus': 'person-add',
  'book': 'book',
  'folder': 'folder',
  'link': 'link',
  'sun.max': 'wb-sunny',
  'person.2.circle': 'account-circle',
  'calendar.badge.clock': 'schedule',
  'graduationcap': 'school',
  'checkmark.circle': 'check-circle',
  'doc': 'description',
  'rosette': 'stars',
  'bus': 'directions-bus',
  'tag': 'local-offer',
  'dollarsign.circle': 'monetization-on',
  'creditcard': 'credit-card',
  'receipt': 'receipt',
  'arrow.uturn.backward.circle': 'undo',
  'banknote': 'attach-money',
  'map': 'map',
  'mappin.circle': 'place',
  'car': 'directions-car',
  'location.circle': 'my-location',
  'chart.bar': 'bar-chart',
  'person.circle': 'account-circle',
  'person.badge.shield.checkmark': 'verified-user',
  'lock.shield': 'security',
  'list.bullet': 'list',
  'gearshape': 'settings',
  'app': 'apps',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.down': 'keyboard-arrow-down',
  'xmark': 'close',
  'arrow.right.square': 'logout',
  'magnifyingglass': 'search',
  'line.horizontal.3': 'menu',
  'folder.fill': 'folder',
  'folder.badge.plus': 'create-new-folder',
  'doc.fill': 'description',
  'chevron.left': 'chevron-left',
  'person.fill': 'person',
  'bell.fill': 'notifications',
  'pencil': 'edit',
  'exclamationmark.triangle': 'warning',
  'person.fill.questionmark': 'help',
  'create': 'edit',
  'info.circle': 'info',
} as any;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  weight,
}: {
  name: IconSymbolName;
  size?: number;
  color?: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const themeColor = useThemeColor({}, 'foreground');

  return <MaterialIcons color={color || themeColor} size={size} name={MAPPING[name]} style={style} />;
}
