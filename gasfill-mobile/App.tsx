import { StatusBar } from 'expo-status-bar';
import React from 'react';
import AuthNavigation from './src/components/AuthNavigation';

export default function App() {
  return (
    <>
      <AuthNavigation />
      <StatusBar style="auto" />
    </>
  );
}
