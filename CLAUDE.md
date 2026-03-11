# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HouseholdHero is a bare React Native app (not Expo) built with TypeScript. It is at the initial bootstrap stage — no screens, navigation, or backend integration have been implemented yet.

- React Native 0.84.1, React 19.2.3
- Node >= 22.11.0 required
- iOS: CocoaPods for dependency management
- Android: Gradle

## Common Commands

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Lint
npm run lint

# Run all tests
npm test

# Run a single test file
npx jest __tests__/App.test.tsx
```

## iOS Setup

After installing new packages with native modules:
```bash
cd ios && pod install && cd ..
```

## Architecture

- **Entry point**: `index.js` → registers `App` component via `AppRegistry`
- **Root component**: `App.tsx` at project root (no `src/` directory yet)
- **Tests**: `__tests__/` directory, Jest preset `react-native`
- **No navigation library installed** — add React Navigation or similar when building screens
- **No state management installed** — add as needed
- **No backend/API client installed** — add as needed

## Code Style

- Prettier: single quotes, avoid arrow parens, trailing commas
- ESLint: `@react-native` config
- TypeScript: extends `@react-native/typescript-config`
