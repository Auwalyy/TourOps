import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View className="mb-3 flex-row items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3">
      <Search color="#a3a3a3" size={16} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        autoCapitalize="none"
        className="h-11 flex-1 text-[15px] text-neutral-900"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} hitSlop={8}>
          <X color="#a3a3a3" size={16} />
        </Pressable>
      )}
    </View>
  );
}
