import { Pressable, ScrollView, Text } from 'react-native';

export interface TabDef {
  id: string;
  label: string;
}

/** Pill tabs that scroll horizontally — three labels do not fit a phone. */
export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 pb-3"
    >
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            className={`rounded-full border px-3.5 py-1.5 ${
              on ? 'border-brand bg-brand' : 'border-neutral-200 bg-white'
            }`}
          >
            <Text className={`text-[13px] font-medium ${on ? 'text-white' : 'text-neutral-600'}`}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
