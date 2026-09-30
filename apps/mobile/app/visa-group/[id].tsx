import { useState } from 'react';
import { View, Text, FlatList, Alert, Modal, ScrollView, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Camera, Image as ImageIcon, Paperclip, Plus, FileDown, X } from 'lucide-react-native';
import { issuedVisasApi } from '@/services/api.service';
import { VisaGroup, VisaIssuance } from '@/types';
import { Screen, Loading, EmptyState } from '@/components/ui/Screen';
import { Card, Badge } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatDate } from '@/lib/utils';
import { errorMessage, ACCESS_TOKEN_KEY, getToken } from '@/lib/api';
import { BRAND, MUTED } from '@/lib/brand';

interface Attachment {
  uri: string;
  name: string;
  type: string;
}

export default function VisaGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery<VisaGroup>({
    queryKey: ['issued-visas', 'group', id],
    queryFn: () => issuedVisasApi.groups.getById(id!).then((r) => r.data.data),
    enabled: !!id,
  });

  const download = useMutation({
    mutationFn: () => downloadManifest(id!, data?.groupNumber || 'group'),
    onError: (e) => Alert.alert('Download failed', errorMessage(e, 'Could not build the list')),
  });

  if (isLoading) return <Loading />;
  if (!data) return <EmptyState title="Group not found" />;

  const entries = data.entries || [];

  return (
    <Screen scroll={false}>
      <View className="px-4 pb-3">
        <View className="flex-row items-center gap-2">
          <Text className="font-mono text-[13px] font-semibold text-brand">{data.groupNumber}</Text>
          <Badge tone={data.status === 'open' ? 'blue' : 'default'}>
            {data.status === 'open' ? 'Open' : 'Closed'}
          </Badge>
        </View>
        <Text className="mt-1 text-lg font-semibold text-neutral-900">{data.name}</Text>
        <Text className="mt-0.5 text-[12px] text-neutral-500">
          {[
            data.partnerCompany && `For ${data.partnerCompany}`,
            data.destination,
            `${entries.length} traveller${entries.length === 1 ? '' : 's'}`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>

        <View className="mt-3 flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="outline"
              size="sm"
              loading={download.isPending}
              onPress={() => download.mutate()}
              icon={<FileDown color={BRAND} size={14} />}
              fullWidth
            >
              Download list
            </Button>
          </View>
          <View className="flex-1">
            <Button
              size="sm"
              onPress={() => setShowForm(true)}
              icon={<Plus color="#fff" size={14} />}
              fullWidth
            >
              Add visa
            </Button>
          </View>
        </View>
      </View>

      <FlatList
        data={entries}
        keyExtractor={(e) => e._id}
        contentContainerClassName="px-4 pb-8"
        refreshing={isFetching}
        onRefresh={refetch}
        ItemSeparatorComponent={() => <View className="h-2" />}
        ListEmptyComponent={
          <EmptyState
            title="No visas in this group yet"
            body="Add them as they come through — you can keep adding over several days."
            action={<Button onPress={() => setShowForm(true)}>Add the first one</Button>}
          />
        }
        renderItem={({ item }) => <EntryRow entry={item} />}
      />

      <EntryFormModal
        visible={showForm}
        groupId={id!}
        onClose={() => setShowForm(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['issued-visas'] })}
      />
    </Screen>
  );
}

function EntryRow({ entry }: { entry: VisaIssuance }) {
  return (
    <Card className="p-3.5">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="font-mono text-[13px] font-semibold text-neutral-900">
          {entry.passportNumber}
        </Text>
        {entry.fileUrl ? <Paperclip color={MUTED} size={14} /> : null}
      </View>
      <Text className="mt-1 text-[15px] text-neutral-800">{entry.travellerName}</Text>
      <View className="mt-2.5 flex-row justify-between border-t border-neutral-100 pt-2.5">
        <Text className="font-mono text-[12px] text-neutral-600">{entry.documentNumber || '—'}</Text>
        <Text className="text-[12px] text-neutral-400">{formatDate(entry.issueDate)}</Text>
      </View>
    </Card>
  );
}

const EMPTY = {
  type: 'visa',
  travellerName: '',
  passportNumber: '',
  documentNumber: '',
  purpose: '',
};

function EntryFormModal({
  visible,
  groupId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  groupId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ ...EMPTY });
  const [file, setFile] = useState<Attachment | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, String(v));
      });
      fd.append('groupId', groupId);
      fd.append('issueDate', new Date().toISOString().slice(0, 10));
      // React Native FormData takes { uri, name, type }, not a browser File.
      if (file) fd.append('file', file as unknown as Blob);
      return issuedVisasApi.create(fd);
    },
    onSuccess: () => {
      setForm({ ...EMPTY });
      setFile(null);
      onSaved();
      onClose();
    },
    onError: (e) => Alert.alert('Could not save', errorMessage(e)),
  });

  /** Photographing the visa at the counter beats typing it later. */
  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Allow camera access to photograph the visa.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setFile({ uri: a.uri, name: a.fileName || `visa-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
    }
  }

  async function pickImage() {
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) {
      const a = res.assets[0];
      setFile({ uri: a.uri, name: a.fileName || `visa-${Date.now()}.jpg`, type: a.mimeType || 'image/jpeg' });
    }
  }

  async function pickDocument() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!res.canceled && res.assets?.[0]) {
      const a = res.assets[0];
      setFile({ uri: a.uri, name: a.name, type: a.mimeType || 'application/pdf' });
    }
  }

  const canSave = form.travellerName.trim() && form.passportNumber.trim();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View className="flex-1 bg-white">
        <View className="flex-row items-center justify-between border-b border-neutral-200 px-4 py-3">
          <Text className="text-[16px] font-semibold text-neutral-900">Add visa or ticket</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <X color={MUTED} size={20} />
          </Pressable>
        </View>

        <ScrollView contentContainerClassName="gap-4 p-4 pb-10">
          <Input
            label="Traveller name"
            placeholder="Ado Idris"
            value={form.travellerName}
            onChangeText={(v) => setForm((f) => ({ ...f, travellerName: v }))}
          />
          <Input
            label="Passport number"
            placeholder="B04173557"
            autoCapitalize="characters"
            value={form.passportNumber}
            onChangeText={(v) => setForm((f) => ({ ...f, passportNumber: v.toUpperCase() }))}
          />
          <Input
            label={form.type === 'ticket' ? 'Ticket number' : 'Visa number'}
            placeholder="6174141815"
            value={form.documentNumber}
            onChangeText={(v) => setForm((f) => ({ ...f, documentNumber: v }))}
          />
          <Input
            label="Purpose"
            placeholder="Umrah Visa"
            value={form.purpose}
            onChangeText={(v) => setForm((f) => ({ ...f, purpose: v }))}
          />

          <View>
            <Text className="mb-1.5 text-[13px] font-medium text-neutral-700">Attach the document</Text>
            {file ? (
              <View className="flex-row items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                <Paperclip color={MUTED} size={14} />
                <Text numberOfLines={1} className="flex-1 text-[13px] text-neutral-700">
                  {file.name}
                </Text>
                <Pressable onPress={() => setFile(null)} hitSlop={8}>
                  <X color={MUTED} size={16} />
                </Pressable>
              </View>
            ) : (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button variant="outline" size="sm" onPress={takePhoto} icon={<Camera color={BRAND} size={14} />} fullWidth>
                    Camera
                  </Button>
                </View>
                <View className="flex-1">
                  <Button variant="outline" size="sm" onPress={pickImage} icon={<ImageIcon color={BRAND} size={14} />} fullWidth>
                    Gallery
                  </Button>
                </View>
                <View className="flex-1">
                  <Button variant="outline" size="sm" onPress={pickDocument} icon={<Paperclip color={BRAND} size={14} />} fullWidth>
                    File
                  </Button>
                </View>
              </View>
            )}
          </View>

          <Button onPress={() => save.mutate()} disabled={!canSave} loading={save.isPending} fullWidth>
            Add entry
          </Button>
        </ScrollView>
      </View>
    </Modal>
  );
}

/**
 * The manifest comes back as a PDF stream. Axios cannot hold a binary body
 * well on React Native, so this downloads straight to a file and hands it to
 * the share sheet — which is how an agent sends it on WhatsApp.
 */
async function downloadManifest(groupId: string, groupNumber: string): Promise<void> {
  const base = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';
  const token = await getToken(ACCESS_TOKEN_KEY);

  // SDK 57's File/Paths API. `idempotent` so downloading the same group twice
  // overwrites rather than rejecting.
  const target = new FileSystem.File(FileSystem.Paths.cache, `${groupNumber}.pdf`);

  const file = await FileSystem.File.downloadFileAsync(
    `${base}/api/v1/issued-visas/groups/${groupId}/pdf`,
    target,
    {
      idempotent: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  } else {
    Alert.alert('Saved', `The list was saved to ${file.uri}`);
  }
}
