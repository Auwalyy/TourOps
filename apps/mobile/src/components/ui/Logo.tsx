import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { BRAND } from '@/lib/brand';

/**
 * The TourOps mark — a route rising to its destination over the record it
 * leaves behind. Same geometry as apps/web/src/components/ui/Logo.tsx.
 */
export function Logo({ size = 40, tile = true }: { size?: number; tile?: boolean }) {
  const stroke = tile ? '#ffffff' : BRAND;

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      {tile && <Rect width={40} height={40} rx={11} fill={BRAND} />}
      <Path
        d="M9.5 28.5C12.5 19.5 18.5 14.8 25.2 13.6"
        stroke={stroke}
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <Circle cx={29.6} cy={13.1} r={3.3} fill={stroke} />
      <Rect x={9} y={31.4} width={21} height={3.2} rx={1.6} fill={stroke} opacity={0.5} />
    </Svg>
  );
}
