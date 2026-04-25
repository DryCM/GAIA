import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BannerAd, BannerAdSize, TestIds } from "react-native-google-mobile-ads";

type Props = {
  enabled: boolean;
};

const androidBannerId = process.env.EXPO_PUBLIC_ADMOB_ANDROID_BANNER_ID;
const iosBannerId = process.env.EXPO_PUBLIC_ADMOB_IOS_BANNER_ID;

export function AdBanner({ enabled }: Props) {
  const adUnitId = useMemo(() => {
    const configured = (androidBannerId || iosBannerId || "").trim();
    return configured || TestIds.BANNER;
  }, []);

  if (!enabled) {
    return (
      <View style={styles.slot}>
        <Text style={styles.label}>Publicidad desactivada</Text>
        <Text style={styles.text}>Activa el consentimiento parental para mostrar anuncios.</Text>
      </View>
    );
  }

  return (
    <View style={styles.slot}>
      <Text style={styles.label}>Publicidad</Text>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
      />
      {adUnitId === TestIds.BANNER && (
        <Text style={styles.text}>Modo test de AdMob activo. Configura IDs reales para produccion.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(140, 134, 219, 0.4)",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.62)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontWeight: "700",
    color: "#46518a",
    alignSelf: "flex-start",
  },
  text: {
    color: "#516091",
    fontSize: 12,
    alignSelf: "flex-start",
  },
});
