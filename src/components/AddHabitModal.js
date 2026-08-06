import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTheme } from '../theme';
import ColorPicker from './ColorPicker';
import EmojiPicker from './EmojiPicker';
import Sheet from './Sheet';

export default function AddHabitModal({ visible, onClose, onAdd }) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => makeStyles(C), [C]);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💧');
  const [color, setColor] = useState(C.primary);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed, emoji, color);
    setName('');
    setEmoji('💧');
    setColor(C.primary);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Yeni Alışkanlık">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Canlı önizleme: isim + sembol + renk anında burada görünür */}
        <View style={[styles.preview, { backgroundColor: color + '22', borderColor: color + '66' }]}>
          <View style={[styles.previewCircle, { backgroundColor: color }]}>
            <Text style={styles.previewEmoji}>{emoji}</Text>
          </View>
          <Text style={[styles.previewName, !name.trim() && styles.previewNameEmpty]} numberOfLines={1}>
            {name.trim() || 'Alışkanlık adı'}
          </Text>
          <Text style={styles.previewHint}>
            {name.trim() ? 'Harika görünüyor!' : 'Yukarıdan bir ad yaz'}
          </Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Alışkanlık adı..."
          placeholderTextColor={C.textMuted}
          value={name}
          onChangeText={setName}
          onSubmitEditing={submit}
          returnKeyType="done"
          autoFocus
        />
        <EmojiPicker value={emoji} onChange={setEmoji} />
        <ColorPicker value={color} onChange={setColor} />
        <Pressable
          style={[styles.button, { backgroundColor: color }, !name.trim() && styles.buttonDisabled]}
          onPress={submit}
          disabled={!name.trim()}
        >
          <Text style={styles.buttonText}>Alışkanlığı Ekle</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Sheet>
  );
}

function makeStyles(C) {
  return StyleSheet.create({
    preview: {
      alignItems: 'center',
      gap: 6,
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'dashed',
      padding: 16,
    },
    previewCircle: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    previewEmoji: {
      fontSize: 30,
    },
    previewName: {
      color: C.text,
      fontSize: 17,
      fontWeight: '800',
    },
    previewNameEmpty: {
      color: C.textMuted,
    },
    previewHint: {
      color: C.textMuted,
      fontSize: 12,
    },
    input: {
      height: 50,
      borderRadius: 14,
      backgroundColor: C.surfaceLight,
      borderWidth: 1,
      borderColor: C.border,
      paddingHorizontal: 16,
      color: C.text,
      fontSize: 15,
    },
    button: {
      height: 50,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    buttonDisabled: {
      opacity: 0.4,
      shadowOpacity: 0,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
}
