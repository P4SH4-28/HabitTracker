// ============================================================
// ErrorBoundary.js — Render hatalarını yakalayan hata sınırı
// Yakalanmayan bir JS hatası (ör. bir ekranın render'ı sırasında)
// uygulamayı sessizce kapatır. Bu bileşen Root ağacını sarar ve
// böyle bir hata oluşursa çökmek yerine hatayı TAM METİNLE ekranda
// gösterir ("Yeniden Dene" ile uygulama sıfırlanır).
// FatalErrorView: hem ErrorBoundary hem de errorReporter'ın global
// handler'ı tarafından kullanılan ortak hata ekranıdır.
// ============================================================
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Component } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme';

const LAST_ERROR_KEY = '@habit_tracker_last_error';

// Hata nesnesini (Error veya errorReporter kaydı) görüntülenebilir forma çevirir.
function toViewError(error) {
  if (error && typeof error === 'object') {
    return {
      message:
        typeof error.message === 'string' && error.message
          ? error.message
          : 'Bilinmeyen hata',
      stack: typeof error.stack === 'string' ? error.stack : '',
      source: typeof error.source === 'string' ? error.source : 'render',
    };
  }
  return { message: String(error || 'Bilinmeyen hata'), stack: '', source: 'render' };
}

// Tam ekran hata görünümü: hata mesajı + stack + yeniden dene.
export function FatalErrorView({ error, onRetry }) {
  const { colors: C } = useTheme();
  const info = toViewError(error);
  return (
    <View style={[styles.overlay, { backgroundColor: C.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={[styles.title, { color: C.text }]}>Beklenmeyen bir hata oluştu</Text>
        <Text style={[styles.subtitle, { color: C.textMuted }]}>
          Uygulama kapandı ama bu ekran hatayı yakaladı. Aşağıdaki mesajı
          geliştiriciye ilet; sorun buradan görülebilir.
        </Text>
        <View style={[styles.msgBox, { backgroundColor: C.surface, borderColor: C.danger }]}>
          <Text style={[styles.source, { color: C.danger }]}>
            Kaynak: {info.source || 'bilinmiyor'}
          </Text>
          <Text selectable style={[styles.message, { color: C.text }]}>
            {info.message}
          </Text>
        </View>
        {info.stack ? (
          <View style={[styles.stackBox, { backgroundColor: C.surfaceLight, borderColor: C.border }]}>
            <Text selectable style={[styles.stack, { color: C.textMuted }]}>
              {info.stack}
            </Text>
          </View>
        ) : null}
        <Text selectable style={[styles.copyHint, { color: C.textMuted }]}>
          📋 Mesajı seçip kopyala: {info.message}
        </Text>
      </ScrollView>
      <View style={styles.footer}>
        <Text
          style={[styles.retryBtn, { backgroundColor: C.primary, color: C.onPrimary }]}
          onPress={onRetry}
        >
          Yeniden Dene
        </Text>
      </View>
    </View>
  );
}

class ErrorBoundaryClass extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Render hataları global ErrorUtils'e ulaşmaz; kaydı buraya yazarız.
    const record = {
      ...toViewError(error),
      componentStack: info && info.componentStack ? String(info.componentStack) : '',
      ts: Date.now(),
    };
    AsyncStorage.setItem(LAST_ERROR_KEY, JSON.stringify(record)).catch(() => {});
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return <FatalErrorView error={this.state.error} onRetry={this.retry} />;
    }
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }) {
  return <ErrorBoundaryClass>{children}</ErrorBoundaryClass>;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 24,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 64,
    paddingBottom: 24,
  },
  emoji: {
    fontSize: 44,
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  msgBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginTop: 20,
  },
  source: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
  },
  stackBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  stack: {
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 17,
  },
  copyHint: {
    fontSize: 12,
    marginTop: 14,
    lineHeight: 18,
  },
  footer: {
    padding: 24,
    paddingTop: 12,
  },
  retryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    overflow: 'hidden',
  },
});
