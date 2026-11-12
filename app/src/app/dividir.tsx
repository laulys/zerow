import { router } from 'expo-router';
import { type IconName } from '../components/Icon';
import { SheetBody, SheetList } from '../components/Sheet';
import { T } from '../components/ui';
import { afterSheet } from '../data/session';
import type { GroupKind } from '../data/trip';
import { useTheme } from '../theme/useTheme';

const options: { icon: IconName; title: string; hint: string; go: () => void }[] = [
  { icon: 'receipt', title: 'Una cuenta ahora', hint: 'Una cena, una compra, un taxi', go: () => afterSheet(() => router.push('/cuenta')) },
  { icon: 'plane', title: 'Un viaje', hint: 'Varios días, muchos gastos', go: () => newGroup('viaje') },
  { icon: 'house', title: 'Piso o casa', hint: 'Alquiler, súper, facturas', go: () => newGroup('piso') },
  { icon: 'gift', title: 'Un evento o un regalo', hint: 'Cumpleaños, despedidas, bodas', go: () => newGroup('evento') },
];

function newGroup(tipo: GroupKind) {
  afterSheet(() => router.push({ pathname: '/grupo-nuevo', params: { tipo } }));
}

// 2.4 ¿Qué quieres dividir?: the "+" on Inicio. Splitting isn't only for trips:
// a one-off bill needs no group at all.
export default function WhatToSplit() {
  const { t } = useTheme();
  // Figma 2.4: the title in Título M and the four kinds in one list card.
  return (
    <SheetBody>
      <T v="titleM" color={t.ink} accessibilityRole="header">
        ¿Qué quieres dividir?
      </T>
      <SheetList rows={options.map((o) => ({ key: o.title, title: o.title, sub: o.hint, icon: o.icon, onPress: o.go }))} />
    </SheetBody>
  );
}
