export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
  Onboarding: undefined;
};

export type MainTabParamList = {
  HomeTab: undefined;
  Settings: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Shopping: undefined;
  Todos: undefined;
  TodoList: {listId: string; title: string};
  Chores: undefined;
  Calendar: undefined;
  Messages: undefined;
  Contacts: undefined;
  Location: undefined;
  Documents: undefined;
  MyFamily: undefined;
};
