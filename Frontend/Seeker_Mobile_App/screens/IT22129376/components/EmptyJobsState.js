import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ActionButton from './ActionButton';
import { COLORS } from '../theme';

export default function EmptyJobsState({ title, message, icon = 'work-outline', buttonLabel, onButtonPress, isDarkMode }) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, isDarkMode && styles.iconCircleDark]}>
        <MaterialIcons name={icon} size={42} color={COLORS.primary} />
      </View>
      <Text style={[styles.title, isDarkMode && styles.textDark]}>{title}</Text>
      <Text style={[styles.message, isDarkMode && styles.textMutedDark]}>{message}</Text>
      {buttonLabel ? (
        <View style={styles.buttonWrap}>
          <ActionButton label={buttonLabel} onPress={onButtonPress} icon="add" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 56,
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  iconCircleDark: {
    backgroundColor: '#ffffff10',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonWrap: {
    marginTop: 18,
    width: '100%',
  },
  textDark: {
    color: COLORS.darkText,
  },
  textMutedDark: {
    color: COLORS.darkMuted,
  },
});
