export type PlaceType =
  | 'home'
  | 'work'
  | 'school'
  | 'park'
  | 'music'
  | 'doctor'
  | 'hospital'
  | 'other';

export interface FamilyPlace {
  id: string;
  type: PlaceType;
  name: string;
  lat: number;
  lng: number;
  createdBy: string;
  createdAt: number;
}

export interface TilePref {
  order: string[];
  hidden: string[];
}

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
  Chat: { chatId: string; chatType: string };
  Contacts: undefined;
  Location: undefined;
  Documents: undefined;
  FolderScreen: {
    folderId: string;
    folderName: string;
    folderColor: string;
    folderEmoji: string;
    folderVisibility: string;
    folderCreatedBy: string;
  };
  MyFamily: undefined;
  Budget: undefined;
  Gallery: undefined;
  Recipes: undefined;
};
