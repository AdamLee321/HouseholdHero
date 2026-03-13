import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { fonts } from '../theme/fonts';

export default function TextInput({ style, ...props }: TextInputProps) {
  return <RNTextInput style={[{ fontFamily: fonts.family }, style]} {...props} />;
}
