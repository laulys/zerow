import { Aurora } from '../../components/Aurora';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeInDown, useReducedMotion, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Line, LinearGradient, Rect, Stop } from 'react-native-svg';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { Spread } from '../../components/Duo';
import { BrandGradient } from '../../components/BrandGradient';
import { Money } from '../../components/Money';
import { Icon } from '../../components/Icon';
import { Button, T, Tap } from '../../components/ui';
import { light } from '../../theme/tokens';
import { invite, people, useTrip } from '../../data/trip';
import { useTheme } from '../../theme/useTheme';

// The ticket settles in: it rises a little from 94 % with a strong ease-out and
// no overshoot (the old spring started from nothing and bounced past full size).
const ticketIn = () => {
  'worklet';
  const ease = Easing.bezier(0.23, 1, 0.32, 1);
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 16 }, { scale: 0.94 }] },
    animations: {
      opacity: withDelay(120, withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) })),
      transform: [{ translateY: withDelay(120, withTiming(0, { duration: 480, easing: ease })) }, { scale: withDelay(120, withTiming(1, { duration: 480, easing: ease })) }],
    },
  };
};

const facts = ['Lo que pagaron antes no te toca', 'Verás los gastos y podrás añadir los tuyos', 'Nada cuenta hasta que alguien lo suma'];

// 5.2 Te invitaron (option A): the invitation is a ticket on the brand gradient,
// like a boarding pass. Top: the trip and who's in. A perforated line. Bottom:
// the one thing a new member worries about — you start at 0,00 €.
export default function Invited() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const at = (ms: number) => FadeInDown.delay(ms).duration(300);
  const reduce = useReducedMotion();
  // The perforation sits right under the top half; its notches are cut out of the gradient.
  const [topH, setTopH] = useState(0);

  const { groups, createGroup } = useTrip();
  const from = people[invite.from].name;
  const join = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Joining makes the trip one of your groups (once); then you land in it.
    const g = groups.find((x) => x.name === invite.name) ?? createGroup({ name: invite.name, kind: 'viaje', dates: invite.dates, currency: 'EUR', members: ['tu', ...invite.inside] });
    router.replace({ pathname: '/trip/[id]', params: { id: g.id } });
  };

  const fromRow = (
    <Animated.View entering={at(0)} style={styles.from}>
      {/* Translucent glass disc, like the header's own face (not the solid graphite one). */}
      <Avatar id={invite.from} size={36} bg={t.disc} inset />
      <T v="bodyStrong" color={t.ink}>
        {from} te invita a un viaje
      </T>
    </Animated.View>
  );
  const ticket = (
    <Animated.View entering={reduce ? undefined : ticketIn} style={{ marginTop: 16 }}>
      {/* Figma «Billete»: a wide lime glow (blur 56, 22 down) over a tight dark shadow (blur 18, 8 down). Both follow the cut-out shape. */}
      <View style={styles.glow}>
        <View
          style={styles.shade}
          accessible
          accessibilityLabel={`${invite.name}, ${invite.dates}, en euros. ${invite.inside.map((p) => people[p].name).join(', ')} ya están dentro. Tú entras con 0,00 euros: lo que pagaron antes no te toca.`}
        >
          <BrandGradient style={styles.ticket} seed={8} notch={topH ? { y: topH + 12, r: 12 } : undefined}>
            <View style={styles.top} onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
              <T v="display" color={light.inkFixed}>
                {invite.name}
              </T>
              <T v="label" color={light.inkMutedFixed} style={{ fontWeight: '500' }}>
                {invite.dates} · {invite.place} · en euros
              </T>
              <View style={styles.people}>
                <AvatarStack ids={invite.inside} size={36} gap={-11} on="lime" />
                <T v="labelStrong" color={light.inkFixed}>
                  {invite.inside.length} personas ya dentro
                </T>
              </View>
            </View>

            {/* Figma «Perforación»: a 1.5 pt dashed line (4 on, 6 off), 24 in from each side. */}
            <View style={styles.perf}>
              <Svg width="100%" height={2}>
                <Line x1={0} y1={1} x2="100%" y2={1} stroke="rgba(17,17,18,0.4)" strokeWidth={1.5} strokeDasharray="4 6" />
              </Svg>
            </View>

            <View style={styles.bottom}>
              <T v="label" color={light.inkMutedFixed} style={{ fontWeight: '500' }}>
                Tú entras con
              </T>
              <Money value={0} size={76} color={light.inkFixed} />
              <View style={{ gap: 4, marginTop: 6 }}>
                {facts.map((f) => (
                  <View key={f} style={styles.fact}>
                    <View style={[styles.ok, { backgroundColor: t.onLimeButton }]}>
                      <Icon name="check" size={16} color={t.lime} weight={2.5} />
                    </View>
                    <T v="labelStrong" color={light.inkFixed} style={{ flex: 1 }}>
                      {f}
                    </T>
                  </View>
                ))}
              </View>
            </View>
          </BrandGradient>
        </View>
      </View>
    </Animated.View>
  );
  const actions = (
    <>
      <Button label="Unirme al viaje" icon="check" onPress={join} />
      {/* Figma «Ahora no»: a 44 pt text button with 17 pt semibold (the shared one drops to 15 pt at 44). */}
      <Tap onPress={() => (router.canGoBack() ? router.back() : router.replace('/grupos'))} accessibilityRole="button" accessibilityLabel="Ahora no" style={styles.later}>
        <T v="bodyStrong" color={t.ink}>
          Ahora no
        </T>
      </Tap>
    </>
  );
  // Figma: the fade starts 4 above «Unirme al viaje»; 34 under «Ahora no» (the home indicator).
  const bottom = Math.max(insets.bottom, 16);
  const footer = 4 + 56 + 12 + 44 + bottom;

  const phone = (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <Aurora preset="tab" />
      <StatusBar style="light" />
      {/* The ticket sits centred in the space between «Ana te invita…» and the buttons, not stuck to the top. */}
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top + 10, paddingHorizontal: 20, paddingBottom: footer + 24 }}>
        {fromRow}
        <View style={styles.centre}>{ticket}</View>
      </ScrollView>
      <Animated.View entering={at(400)} pointerEvents="box-none" style={[styles.footer, { paddingBottom: bottom }]}>
        <Fundido />
        {actions}
      </Animated.View>
    </View>
  );

  // Open iPhone Duo (Figma «Duo abierto · 5.2»): the ticket on the left; what joining means and the buttons on the right.
  return (
    <Spread
      phone={phone}
      left={
        <>
          {fromRow}
          {ticket}
        </>
      }
      right={
        <Animated.View entering={at(200)} style={{ marginTop: 88 }}>
          <T v="titleM" color={t.ink}>
            Empiezas en cero
          </T>
          <T v="body" color={t.inkMuted} style={{ marginTop: 8 }}>
            Al unirte ves los gastos del viaje y puedes añadir los tuyos. Lo anterior no te cuenta.
          </T>
        </Animated.View>
      }
      footer={<Animated.View entering={at(400)}>{actions}</Animated.View>}
    />
  );
}

/** Figma «Fundido»: page colour from clear to solid at 60 %, behind the buttons. */
function Fundido() {
  const { t } = useTheme();
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
      <Defs>
        <LinearGradient id="inviteFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={t.page} stopOpacity={0} />
          <Stop offset="0.6" stopColor={t.page} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#inviteFade)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  from: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glow: { shadowColor: '#B6F03A', shadowOpacity: 0.3, shadowRadius: 28, shadowOffset: { width: 0, height: 22 } },
  shade: { shadowColor: '#000000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 0, height: 8 } },
  ticket: { borderRadius: 32 },
  top: { paddingTop: 24, paddingHorizontal: 24, paddingBottom: 16, gap: 4 },
  people: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  perf: { height: 24, justifyContent: 'center', paddingHorizontal: 24 },
  // 24 on the sides and under the last line, the same as above «Oporto», so the ticket breathes evenly.
  bottom: { paddingTop: 12, paddingHorizontal: 24, paddingBottom: 24, gap: 4 },
  centre: { flex: 1, justifyContent: 'center' },
  fact: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 4 },
  ok: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  later: { height: 44, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 4, paddingHorizontal: 20, gap: 12 },
});
