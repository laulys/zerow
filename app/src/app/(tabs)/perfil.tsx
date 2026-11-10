import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Icon, type IconName } from '../../components/Icon';
import { Button, Card, Hairline, T } from '../../components/ui';
import { useTheme } from '../../theme/useTheme';

export default function Profile() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [notify, setNotify] = useState(true);
  const Row = ({ icon, label, value, right }: { icon: IconName; label: string; value?: string; right?: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: t.page }]}>
        <Icon name={icon} size={20} color={t.ink} />
      </View>
      <T v="bodyStrong" color={t.ink} style={{ flex: 1, marginLeft: 12 }}>
        {label}
      </T>
      {value ? (
        <T v="body" color={t.inkMuted}>
          {value}
        </T>
      ) : null}
      {right}
    </View>
  );
  return (
    <ScrollView style={{ backgroundColor: t.page }} contentContainerStyle={{ paddingTop: insets.top + 60, paddingHorizontal: 20, paddingBottom: 140 }}>
      <T v="titleL" color={t.ink} style={{ marginBottom: 20 }}>
        Perfil
      </T>
      <Card bg={t.surface} style={styles.head}>
        <Avatar id="tu" size={72} decorative={false} />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <T v="titleM" color={t.ink}>
            Laura
          </T>
          <T v="caption" color={t.inkMuted}>
            3 viajes · 1 abierto
          </T>
        </View>
        <Button label="Editar" kind="secondary" height={40} />
      </Card>
      <T v="labelStrong" color={t.inkMuted} style={{ marginTop: 24, marginBottom: 8 }}>
        Preferencias
      </T>
      <Card bg={t.surface} style={{ paddingVertical: 4 }}>
        <Row icon="pen" label="Foto de perfil" value="Memoji" />
        <Hairline color={t.line} inset={52} />
        <Row icon="arrow-left-right" label="Moneda por defecto" value="EUR" />
        <Hairline color={t.line} inset={52} />
        <Row icon="activity" label="Avisos de gastos y pagos" right={<Switch value={notify} onValueChange={setNotify} trackColor={{ true: t.action, false: t.line }} />} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, minHeight: 56 },
  tile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
