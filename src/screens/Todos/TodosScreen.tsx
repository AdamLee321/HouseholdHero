import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export default function TodosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>To-Do Lists</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff'},
  title: {fontSize: 24, fontWeight: '700', color: '#1a1a1a'},
  subtitle: {fontSize: 16, color: '#888', marginTop: 8},
});
