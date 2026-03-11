export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  Onboarding: undefined;
  // Only one is shown at a time based on auth + family state
};

export type MainTabParamList = {
  Shopping: undefined;
  Todos: undefined;
  Chores: undefined;
  Calendar: undefined;
  Messages: undefined;
  More: undefined;
};

export type MoreStackParamList = {
  MoreHome: undefined;
  Contacts: undefined;
  Location: undefined;
  Documents: undefined;
};
