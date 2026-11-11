import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { BrandGradient } from '../../components/BrandGradient';
import { Icon } from '../../components/Icon';
import { Money } from '../../components/Money';
import { Button, T } from '../../components/ui';
import { font, light } from '../../theme/tokens';
import { invite, people, useTrip } from '../../data/trip';
import { useTheme } from '../../theme/useTheme';

const facts = ['Lo que pagaron antes no te toca', 'Verás los gastos y podrás añadir los tuyos', 'Nada cuenta hasta que alguien lo confirma'];

// 5.2 Te invitaron (option A): the invitation is a ticket on the brand gradient,
// like a boarding pass. Top: the trip and who's in. A perforated line. Bottom:
// the one thing a new member worries about — you start at 0,00 €.
export default function Invited() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const at = (ms: number) => FadeInDown.delay(ms).duration(300);

  const { groups, createGroup } = useTrip();
  const from = people[invite.from].name;
  const join = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Joining makes the trip one of your groups (once); then you land in it.
    const g = groups.find((x) => x.name === invite.name) ?? createGroup({ name: invite.name, kind: 'viaje', dates: invite.dates, currency: 'EUR', members: ['tu', ...invite.inside] });
    router.replace({ pathname: '/trip/[id]', params: { id: g.id } });
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 24 }}>
        <Animated.View entering={at(0)} style={styles.from}>
          <Avatar id={invite.from} size={36} bg={t.surface} />
          <T v="bodyStrong" color={t.ink}>
            {from} te invita a un viaje
          </T>
        </Animated.View>

        <Animated.View entering={ZoomIn.springify().damping(16).delay(120)} style={{ marginTop: 20 }}>
          <View accessible accessibilityLabel={`${invite.name}, ${invite.dates}, en euros. ${invite.inside.map((p) => people[p].name).join(', ')} ya están dentro. Tú entras con 0,00 euros: lo que pagaron antes no te toca.`}>
            <BrandGradient style={styles.ticket} seed={8}>
              <View style={styles.top}>
                <T v="display" color={light.inkFixed} style={styles.trip}>
                  {invite.name}
                </T>
                <T v="body" color={light.inkMutedFixed}>
                  {invite.dates} · {invite.place} · en euros
                </T>
                <View style={styles.people}>
                  <AvatarStack ids={invite.inside} size={44} outline="#D3F27F" on="lime" />
                  <T v="label" color={light.inkFixed} style={{ fontFamily: font.medium }}>
                    {invite.inside.length} personas ya dentro
                  </T>
                </View>
              </View>

              <View style={styles.perf}>
                <View style={[styles.notch, { left: -16, backgroundColor: t.page }]} />
                <View style={styles.dashes}>
                  {Array.from({ length: 24 }).map((_, i) => (
                    <View key={i} style={styles.dash} />
                  ))}
                </View>
                <View style={[styles.notch, { right: -16, backgroundColor: t.page }]} />
              </View>

              <View style={styles.bottom}>
                <T v="label" color={light.inkMutedFixed} style={{ marginBottom: 6 }}>
                  Tú entras con
                </T>
                <Money value={0} size={88} color={light.inkFixed} centsColor={light.inkMutedFixed} />
                <View style={{ gap: 10, marginTop: 14 }}>
                  {facts.map((f) => (
                    <View key={f} style={styles.fact}>
                      <View style={[styles.ok, { backgroundColor: light.inkFixed }]}>
                        <Icon name="check" size={12} color={t.lime} />
                      </View>
                      <T v="label" color={light.inkFixed} style={{ fontFamily: font.medium, flex: 1 }}>
                        {f}
                      </T>
                    </View>
                  ))}
                </View>
              </View>
            </BrandGradient>
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={at(400)} style={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 8 }}>
        <Button label="Unirme al viaje" icon="check" onPress={join} />
        <Button label="Ahora no" kind="text" height={48} style={{ marginTop: 6 }} onPress={() => (router.canGoBack() ? router.back() : router.replace('/grupos'))} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  from: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ticket: { borderRadius: 32 },
  top: { padding: 24, paddingBottom: 20 },
  trip: { marginBottom: 6 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20 },
  perf: { height: 32, justifyContent: 'center' },
  notch: { position: 'absolute', top: 0, width: 32, height: 32, borderRadius: 16 },
  dashes: { marginHorizontal: 28, flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden' },
  dash: { width: 6, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(18,18,18,0.35)' },
  bottom: { padding: 24, paddingTop: 16 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ok: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
