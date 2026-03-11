import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MoreStackParamList} from '../../types';

type MoreNavProp = NativeStackNavigationProp<MoreStackParamList, 'MoreHome'>;

const items: {label: string; screen: keyof MoreStackParamList}[] = [
  {label: 'Emergency Contacts', screen: 'Contacts'},
  {label: 'Live Location', screen: 'Location'},
  {label: 'Documents', screen: 'Documents'},
];

export default function MoreScreen() {
  const navigation = useNavigation<MoreNavProp>();

  return (
    <View style={styles.container}>
      {items.map(item => (
        <TouchableOpacity
          key={item.screen}
          style={styles.row}
          onPress={() => navigation.navigate(item.screen)}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5', paddingTop: 16},
  row: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {fontSize: 17, color: '#1a1a1a'},
  chevron: {fontSize: 22, color: '#ccc'},
});
