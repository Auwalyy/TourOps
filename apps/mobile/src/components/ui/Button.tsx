import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { ReactNode } from 'react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const BASE = 'flex-row items-center justify-center gap-2 rounded-lg';

const VARIANTS: Record<Variant, { box: string; label: string }> = {
  primary: { box: 'bg-brand active:bg-brand-700', label: 'text-white' },
  outline: { box: 'border border-neutral-300 bg-white active:bg-neutral-50', label: 'text-neutral-800' },
  ghost: { box: 'active:bg-neutral-100', label: 'text-neutral-700' },
  danger: { box: 'bg-red-600 active:bg-red-700', label: 'text-white' },
};

const SIZES: Record<Size, { box: string; label: string }> = {
  sm: { box: 'h-9 px-3', label: 'text-[13px]' },
  md: { box: 'h-11 px-4', label: 'text-[15px]' },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  icon,
  fullWidth,
}: {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}) {
  const off = disabled || loading;
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <Pressable
      onPress={off ? undefined : onPress}
      className={`${BASE} ${v.box} ${s.box} ${fullWidth ? 'w-full' : ''} ${off ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#fff' : '#0d6e52'} />
      ) : (
        <>
          {icon && <View>{icon}</View>}
          <Text className={`font-medium ${v.label} ${s.label}`}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}
