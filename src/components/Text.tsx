import React from 'react';
import { Text as RNText, TextProps } from 'react-native';
import { fonts } from '../theme/fonts';

export default function Text({ style, ...props }: TextProps) {
  return <RNText style={[{ fontFamily: fonts.family }, style]} {...props} />;
}
