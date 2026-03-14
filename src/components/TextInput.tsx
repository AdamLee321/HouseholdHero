import React from 'react';
import { TextInput as RNTextInput, TextInputProps } from 'react-native';
import { fonts } from '../theme/fonts';

export default function TextInput({ style, secureTextEntry, ...props }: TextInputProps) {
  return (
    <RNTextInput
      style={[{ fontFamily: secureTextEntry ? 'System' : fonts.family }, style]}
      secureTextEntry={secureTextEntry}
      {...props}
    />
  );
}
