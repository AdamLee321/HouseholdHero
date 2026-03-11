import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTheme} from '../../theme/useTheme';

export default function ShoppingScreen() {
  const {colors} = useTheme();
  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text style={[styles.title, {color: colors.text}]}>Shopping List</Text>
      <Text style={[styles.subtitle, {color: colors.textSecondary}]}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  title: {fontSize: 24, fontWeight: '700'},
  subtitle: {fontSize: 16, marginTop: 8},
});
