import React from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  enabled: boolean;
};

export function AdBanner({ enabled }: Props) {
  return (
    <View style={styles.slot}>
      <Text style={styles.label}>Publicidad</Text>
      <Text style={styles.text}>
        {enabled
          ? "En web se muestra placeholder. En Android/iOS se carga AdMob real en el instalador."
          : "Publicidad desactivada por consentimiento."}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(140, 134, 219, 0.4)",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.62)",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  label: {
    fontWeight: "700",
    color: "#46518a",
    marginBottom: 2,
  },
  text: {
    color: "#516091",
    fontSize: 12,
  },
});
