import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FocusStatusBar } from "../../components/FocusStatusBar";
import { Avatar, AvatarStack } from "../../components/Avatar";
import { Icon, type IconName } from "../../components/Icon";
import { BrandGradient } from "../../components/BrandGradient";
import { Money, RollingMoney } from "../../components/Money";
import { Orb } from "../../components/Orb";
import { WalletStack, type WalletCard } from "../../components/WalletStack";
import { Glass } from "../../components/Glass";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Card, Hairline, T, Tap } from "../../components/ui";
import {
  balancesFor,
  eurText,
  pastGroups,
  people,
  usePeopleBalances,
  usePisoBalance,
  useTrip,
  type GroupKind,
  type PersonId,
} from "../../data/trip";
import { font, light } from "../../theme/tokens";

import { useTheme } from "../../theme/useTheme";

const HEADER_H = 48;

const kindIcon: Record<GroupKind, IconName> = {
  viaje: "plane",
  piso: "house",
  evento: "gift",
  otro: "shapes",
};

// 2.1 Inicio: your groups. Lisboa is the open trip; its balance rolls when it changes.
export default function Home() {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const { expenses, draft, groups, groupExpenses, pisoPaid, pastEmoji } =
    useTrip();
  const mine = balancesFor(expenses).tu;
  const between = usePeopleBalances();
  const piso = usePisoBalance();
  const pisoWord =
    Math.abs(piso) < 0.005 ? "A mano" : piso > 0 ? "Te deben" : "Debes";

  // Open groups, front to back: the trip in progress first, on the brand gradient.
  const cards: WalletCard[] = [
    {
      key: "lisboa",
      title: `Lisboa 2026. ${mine >= 0 ? "Te deben" : "Debes"} ${eurText(Math.abs(mine))}${draft ? ". 1 borrador por confirmar" : ""}`,
      onPress: () => router.push("/trip/lisboa"),
      content: (
        <BrandGradient style={styles.cardBody} seed={3}>
          <CardTop
            title="Lisboa 2026"
            meta="12–18 nov · en curso"
            color={light.inkFixed}
            muted={light.inkMutedFixed}
            people={["tu", "ana", "luis", "marta"]}
            outline="#D3F27F"
          />
          <T
            v="label"
            color={light.inkMutedFixed}
            style={{ marginTop: "auto", marginBottom: 6 }}
          >
            {mine >= 0 ? "Te deben" : "Debes"}
          </T>
          <RollingMoney
            value={Math.abs(mine)}
            size={60}
            color={light.inkFixed}
            centsColor={light.inkMutedFixed}
          />
          <View style={styles.cardFoot}>
            {draft ? (
              <>
                <Orb size={16} onGradient />
                <T
                  v="caption"
                  color={light.inkFixed}
                  style={{ fontFamily: font.medium }}
                >
                  1 borrador por confirmar
                </T>
              </>
            ) : (
              <T v="caption" color={light.inkMutedFixed}>
                {eurText(expenses.reduce((a, e) => a + e.amountEur, 0))} en{" "}
                {expenses.length} gastos
              </T>
            )}
          </View>
        </BrandGradient>
      ),
    },
    {
      key: "piso",
      title: pisoPaid
        ? `Piso Calle Mayor. ${pisoWord}${piso ? " " + eurText(Math.abs(piso)) : ""}`
        : "Piso Calle Mayor. Debes 18,40 €. Toca para pagar a Ana",
      // Unpaid, the card is the quick way to pay Ana; once paid it opens the flat.
      onPress: () => router.push(pisoPaid ? "/trip/piso" : "/pagar"),
      content: (
        <BrandGradient style={styles.cardBody} seed={7} lively>
          <CardTop
            title="Piso Calle Mayor"
            meta="3 personas · 2 gastos este mes"
            color={light.inkFixed}
            muted={light.inkMutedFixed}
            people={["tu", "ana", "luis"]}
            outline="#D3F27F"
          />
          <T
            v="label"
            color={light.inkMutedFixed}
            style={{ marginTop: "auto", marginBottom: 6 }}
          >
            {pisoWord}
          </T>
          <RollingMoney
            value={Math.abs(piso)}
            size={60}
            color={light.inkFixed}
            centsColor={light.inkMutedFixed}
          />
          <View style={styles.cardFoot}>
            <Icon
              name={pisoPaid ? "check" : "house"}
              size={16}
              color={light.inkFixed}
            />
            <T
              v="caption"
              color={light.inkFixed}
              style={{ fontFamily: font.medium }}
            >
              {pisoPaid ? "Pagaste 18,40 € a Ana" : "Toca para pagar a Ana"}
            </T>
          </View>
        </BrandGradient>
      ),
    },
    ...groups.map((g) => {
      const list = groupExpenses[g.id] ?? [];
      const bal = balancesFor(list).tu;
      return {
        key: g.id,
        title: `${g.name}. ${list.length ? `${bal >= 0 ? "Te deben" : "Debes"} ${eurText(Math.abs(bal), g.currency)}` : "Sin gastos todavía"}`,
        onPress: () =>
          router.push({ pathname: "/trip/[id]", params: { id: g.id } }),
        content: (
          <BrandGradient style={styles.cardBody} seed={11} lively>
            <CardTop
              title={g.name}
              meta={`${g.members.length} personas${g.dates ? " · " + g.dates : ""}`}
              color={light.inkFixed}
              muted={light.inkMutedFixed}
              people={g.members}
              outline="#D3F27F"
            />
            <T
              v="label"
              color={light.inkMutedFixed}
              style={{ marginTop: "auto", marginBottom: 6 }}
            >
              {list.length ? (bal >= 0 ? "Te deben" : "Debes") : "Saldo"}
            </T>
            <Money
              value={Math.abs(bal)}
              size={60}
              color={light.inkFixed}
              centsColor={light.inkMutedFixed}
              currency={g.currency}
            />
            <View style={styles.cardFoot}>
              <Icon
                name={kindIcon[g.kind]}
                size={16}
                color={light.inkMutedFixed}
              />
              <T v="caption" color={light.inkMutedFixed}>
                {list.length
                  ? `${list.length} gasto${list.length === 1 ? "" : "s"}`
                  : "Sin gastos todavía"}
              </T>
            </View>
          </BrandGradient>
        ),
      };
    }),
  ];

  const headerTop = insets.top + 8;

  return (
    <View style={{ flex: 1, backgroundColor: t.page }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: headerTop + HEADER_H + 28,
          paddingHorizontal: 20,
          paddingBottom: 140,
        }}
        scrollIndicatorInsets={{ top: HEADER_H }}
      >
        <FocusStatusBar style="light" />
        <WalletStack cards={cards} />

        <T
          v="titleM"
          color={t.ink}
          style={{ marginTop: 24, marginBottom: 12 }}
          accessibilityRole="header"
        >
          Personas
        </T>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -20 }}
          contentContainerStyle={styles.people}
        >
          <Tap
            onPress={() =>
              router.push({ pathname: "/invitar", params: { elegir: "1" } })
            }
            accessibilityRole="button"
            accessibilityLabel="Invitar a alguien"
            style={styles.person}
          >
            <View style={[styles.addFace, styles.glassTile]}>
              <Icon name="plus" size={22} color={t.ink} />
            </View>
            <T v="caption" color={t.inkMuted} style={styles.personName}>
              Invitar
            </T>
          </Tap>
          {between.map((p) => {
            const name = people[p.id].name;
            const state =
              p.net > 0
                ? `te debe ${eurText(p.net)}`
                : p.net < 0
                  ? `le debes ${eurText(-p.net)}`
                  : "estáis a mano";
            return (
              <Tap
                key={p.id}
                onPress={() =>
                  router.push({ pathname: "/persona", params: { id: p.id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`${name}, ${state}`}
                style={styles.person}
              >
                <Avatar id={p.id} size={56} />
                <T
                  v="caption"
                  color={t.ink}
                  style={[styles.personName, { fontFamily: font.medium }]}
                  numberOfLines={1}
                >
                  {name}
                </T>
                {p.net !== 0 ? (
                  <T
                    v="caption"
                    color={p.net > 0 ? t.lime : t.inkMuted}
                    numberOfLines={1}
                  >
                    {p.net > 0 ? "+" : "−"}
                    {eurText(Math.abs(p.net))}
                  </T>
                ) : null}
              </Tap>
            );
          })}
        </ScrollView>

        <T
          v="titleM"
          color={t.ink}
          style={{ marginTop: 24, marginBottom: 12 }}
          accessibilityRole="header"
        >
          Anteriores
        </T>
        <Card bg={t.surface} style={{ paddingVertical: 4 }}>
          {pastGroups.map((p, i) => (
            <View key={p.id}>
              <Tap
                onPress={() =>
                  router.push({ pathname: "/emoji", params: { id: p.id } })
                }
                accessibilityRole="button"
                accessibilityLabel={`${p.kind}: ${p.name}. ${p.meta}. ${eurText(p.total)}, saldado. Cambiar emoji`}
                style={[styles.rowBetween, { paddingVertical: 12 }]}
              >
                <View style={[styles.tile, styles.glassTile]}>
                  {pastEmoji[p.id] ? (
                    <Text style={styles.emoji}>{pastEmoji[p.id]}</Text>
                  ) : (
                    <Icon
                      name={
                        kindIcon[
                          p.kind === "Piso"
                            ? "piso"
                            : p.kind === "Viaje"
                              ? "viaje"
                              : p.kind === "Regalo"
                                ? "evento"
                                : "otro"
                        ]
                      }
                      size={20}
                      color={t.ink}
                    />
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <T v="bodyStrong" color={t.ink}>
                    {p.name}
                  </T>
                  <T v="caption" color={t.inkMuted}>
                    {p.meta}
                  </T>
                </View>
                <T v="bodyStrong" color={t.ink}>
                  {eurText(p.total)}
                </T>
              </Tap>
              {i < pastGroups.length - 1 ? (
                <Hairline color={t.line} inset={52} />
              ) : null}
            </View>
          ))}
        </Card>
      </ScrollView>

      {/* Floating header, like Revolut's: the page scrolls under it, so the search
          and + sit on Liquid Glass (the navigation layer, per Apple). A soft fade
          keeps the status bar readable over the lime cards. */}
      <Svg
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { height: headerTop + HEADER_H + 24 }]}
        width="100%"
        height={headerTop + HEADER_H + 24}
      >
        <Defs>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={t.page} stopOpacity={0.9} />
            <Stop offset="0.55" stopColor={t.page} stopOpacity={0.6} />
            <Stop offset="1" stopColor={t.page} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#fade)" />
      </Svg>
      <View
        style={[
          styles.header,
          { position: "absolute", top: headerTop, left: 20, right: 20 },
        ]}
      >
        <Tap
          onPress={() => router.navigate("/perfil")}
          accessibilityRole="button"
          accessibilityLabel="Tu perfil"
          style={[styles.ring, { borderColor: "rgba(203, 242, 107, 0.45)" }]}
        >
          <Avatar id="tu" size={40} />
        </Tap>
        <Tap
          onPress={() => router.push("/buscar")}
          accessibilityRole="search"
          accessibilityLabel="Buscar grupos, personas o gastos"
          style={{ flex: 1 }}
        >
          <Glass fallback={t.surface} style={styles.search}>
            <Icon name="search" size={18} color={t.ink} />
            <T v="body" color={t.ink}>
              Buscar
            </T>
          </Glass>
        </Tap>
        <Tap
          onPress={() => router.push("/dividir")}
          accessibilityRole="button"
          accessibilityLabel="Dividir algo nuevo"
        >
          <Glass fallback={t.surface} style={styles.round}>
            <Icon name="plus" size={20} color={t.ink} />
          </Glass>
        </Tap>
      </View>
    </View>
  );
}

function CardTop({
  title,
  meta,
  color,
  muted,
  people,
  outline,
}: {
  title: string;
  meta: string;
  color: string;
  muted: string;
  people: PersonId[];
  outline: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <View style={{ flex: 1 }}>
        <T v="titleM" color={color}>
          {title}
        </T>
        <T v="caption" color={muted} style={{ marginTop: 2 }}>
          {meta}
        </T>
      </View>
      <AvatarStack ids={people} size={32} outline={outline} />
    </View>
  );
}

const styles = StyleSheet.create({
  emoji: { fontSize: 22, lineHeight: 28 },
  glassTile: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  cardBody: { flex: 1, padding: 20, paddingBottom: 18 },
  people: { paddingHorizontal: 20, gap: 14 },
  person: { width: 64, alignItems: "center" },
  personName: { marginTop: 6 },
  addFace: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  search: {
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    overflow: "hidden",
  },
  round: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chip: {
    alignSelf: "flex-start",
    marginTop: 18,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
