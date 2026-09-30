import { Pressable, View, Text } from 'react-native';
import { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  onPress,
}: {
  children: ReactNode;
  className?: string;
  onPress?: () => void;
}) {
  const box = `rounded-xl border border-neutral-200 bg-white ${className}`;
  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${box} active:bg-neutral-50`}>
        {children}
      </Pressable>
    );
  }
  return <View className={box}>{children}</View>;
}

type BadgeTone = 'default' | 'green' | 'red' | 'amber' | 'blue';

const TONES: Record<BadgeTone, string> = {
  default: 'bg-neutral-100 border-neutral-200 text-neutral-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  blue: 'bg-brand-50 border-brand-100 text-brand-700',
};

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <View className={`self-start rounded-md border px-2 py-0.5 ${TONES[tone]}`}>
      <Text className={`text-[11px] font-medium ${TONES[tone].split(' ').pop()}`}>{children}</Text>
    </View>
  );
}

/** Maps the API's status strings onto a tone, so colour means the same thing
 *  on every screen. */
export function statusTone(status?: string): BadgeTone {
  if (!status) return 'default';
  const s = status.toLowerCase();
  if (['approved', 'paid', 'confirmed', 'completed', 'issued', 'verified', 'active'].includes(s)) return 'green';
  if (['rejected', 'cancelled', 'failed', 'overdue', 'unpaid'].includes(s)) return 'red';
  if (['pending', 'partially_paid', 'documents_pending', 'under_review', 'draft'].includes(s)) return 'amber';
  return 'blue';
}
