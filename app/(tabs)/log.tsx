import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AddMetricForm } from '../../src/components/forms/AddMetricForm';
import { ResponsiveContainer } from '../../src/components/ui/ResponsiveContainer';

export default function LogScreen() {
  return (
    <View style={styles.container}>
      <ResponsiveContainer maxWidth={520}>
        <AddMetricForm />
      </ResponsiveContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
});
