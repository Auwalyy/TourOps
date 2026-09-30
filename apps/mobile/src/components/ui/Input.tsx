import { Text, TextInput, TextInputProps, View } from 'react-native';

export function Label({ children }: { children: string }) {
  return <Text className="mb-1.5 text-[13px] font-medium text-neutral-700">{children}</Text>;
}

export function Input({
  label,
  error,
  className = '',
  ...props
}: TextInputProps & { label?: string; error?: string }) {
  return (
    <View>
      {label && <Label>{label}</Label>}
      <TextInput
        placeholderTextColor="#a3a3a3"
        className={`h-11 rounded-lg border bg-white px-3 text-[15px] text-neutral-900 ${
          error ? 'border-red-400' : 'border-neutral-300'
        } ${className}`}
        {...props}
      />
      {error ? <Text className="mt-1 text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}
