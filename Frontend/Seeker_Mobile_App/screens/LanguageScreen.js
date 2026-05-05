import React, { useContext } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import { LanguageContext } from "../context/LanguageContext";

export default function LanguageScreen({ navigation }) {
  const { t } = useTranslation();
  const { changeLanguage } = useContext(LanguageContext);

  const selectLang = async (lang) => {
    await setLanguage(lang);
    changeLanguage(lang);
    navigation.replace("Home");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("select_language")}</Text>

      <TouchableOpacity onPress={() => selectLang("en")}>
        <Text>{t("language_english")}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => selectLang("si")}>
        <Text>{t("language_sinhala")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 22, marginBottom: 20 }
});