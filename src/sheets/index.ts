import { registerSheet, SheetDefinition } from 'react-native-actions-sheet';

import AddEventModal from '../screens/Calendar/components/AddEventModal';
import AddChoreModal from '../screens/Chores/components/AddChoreModal';
import AddContactModal from '../screens/Contacts/components/AddContactModal';
import AddCategoryModal from '../screens/Budget/components/AddCategoryModal';
import AddTransactionModal from '../screens/Budget/components/AddTransactionModal';
import AddPlaceModal from '../screens/Location/components/AddPlaceModal';
import AddFolderModal from '../screens/Documents/components/AddFolderModal';
import ChangeRoleSheet from '../screens/MyFamily/ChangeRoleSheet';
import NewChatSheet from '../screens/Messages/NewChatSheet';
import ChatInfoSheet from '../screens/Messages/ChatInfoSheet';
import BudgetCurrencySheet from './BudgetCurrencySheet';
import DocumentOptionsSheet from './DocumentOptionsSheet';
import PhotoActionsSheet from './PhotoActionsSheet';
import ImportRecipeSheet from './ImportRecipeSheet';
import AddShoppingItemSheet from './AddShoppingItemSheet';
import AssignMealSheet from './AssignMealSheet';

registerSheet('add-event', AddEventModal);
registerSheet('add-chore', AddChoreModal);
registerSheet('add-contact', AddContactModal);
registerSheet('add-category', AddCategoryModal);
registerSheet('add-transaction', AddTransactionModal);
registerSheet('add-place', AddPlaceModal);
registerSheet('add-folder', AddFolderModal);
registerSheet('change-role', ChangeRoleSheet);
registerSheet('new-chat', NewChatSheet);
registerSheet('chat-info', ChatInfoSheet);
registerSheet('budget-currency', BudgetCurrencySheet);
registerSheet('doc-options', DocumentOptionsSheet);
registerSheet('photo-actions', PhotoActionsSheet);
registerSheet('import-recipe', ImportRecipeSheet);
registerSheet('add-shopping-item', AddShoppingItemSheet);
registerSheet('assign-meal', AssignMealSheet);

export {};

import type { Room } from '../services/choreService';
import type { FamilyMember, MemberRole } from '../services/familyService';
import type { EmergencyContact } from '../services/contactService';
import type { BudgetCategory } from '../services/budgetService';
import type { PlaceType, FamilyPlace } from '../types';
import type { DocumentFolder } from '../services/documentService';
import type { Chat } from '../services/chatService';
import type { GalleryPhoto } from '../services/galleryService';
import type { ImportedRecipeData } from '../services/recipeImportService';
import type { ShoppingCategory } from '../services/shoppingService';
import type { DayOfWeek, MealType, MealSlot } from '../services/mealPlanService';
import type { Recipe } from '../services/recipeService';

declare module 'react-native-actions-sheet' {
  interface Sheets {
    'add-event': SheetDefinition<{
      payload: {
        onAdd: (p: { title: string; description: string; startDate: number; allDay: boolean }) => Promise<void>;
      };
    }>;
    'add-chore': SheetDefinition<{
      payload: {
        rooms: Room[];
        members: FamilyMember[];
      };
    }>;
    'add-contact': SheetDefinition<{
      payload: {
        isAdmin: boolean;
        editContact?: EmergencyContact | null;
        onAdd: (p: { name: string; phone: string; relation: string; type: 'shared' | 'personal'; locked: boolean }) => Promise<void>;
        onEdit: (p: { name: string; phone: string; relation: string; locked: boolean }) => Promise<void>;
      };
    }>;
    'add-category': SheetDefinition<{
      payload: {
        currencyCode: string;
        onAdd: (cat: { name: string; emoji: string; limit: number }) => void;
      };
    }>;
    'add-transaction': SheetDefinition<{
      payload: {
        categories: BudgetCategory[];
        currencyCode: string;
        onAdd: (txn: { categoryId: string; categoryName: string; categoryEmoji: string; amount: number; note: string; date: number; month: string }) => void;
      };
    }>;
    'add-place': SheetDefinition<{
      payload: {
        familyId: string;
        uid: string;
        coord: { lat: number; lng: number } | null;
        preselectedType?: PlaceType;
        editingPlace?: FamilyPlace;
      };
    }>;
    'add-folder': SheetDefinition<{
      payload: {
        familyId: string;
        uid: string;
        editingFolder?: DocumentFolder;
        onSave: (data: Pick<DocumentFolder, 'name' | 'color' | 'emoji' | 'visibility' | 'visibleTo'>) => Promise<void>;
      };
    }>;
    'change-role': SheetDefinition<{
      payload: {
        memberName: string;
        currentRole: MemberRole;
        onSelect: (role: MemberRole) => Promise<void>;
        onRemove: () => void;
      };
    }>;
    'new-chat': SheetDefinition<{
      payload: {
        chats: Chat[];
        onChatCreated: (chatId: string, chatType: string) => void;
      };
    }>;
    'chat-info': SheetDefinition<{
      payload: {
        chat: Chat;
        currentUid: string;
        isAdmin: boolean;
        isFamilyAdmin: boolean;
      };
    }>;
    'budget-currency': SheetDefinition<{
      payload: {
        currencyCode: string;
        currencies: Array<{ code: string; name: string }>;
        onChange: (code: string) => void;
      };
    }>;
    'doc-options': SheetDefinition<{
      payload: {
        sortBy: string;
        viewMode: 'grid' | 'list';
        onSortChange: (s: string) => void;
        onViewChange: (v: 'grid' | 'list') => void;
      };
    }>;
    'photo-actions': SheetDefinition<{
      payload: {
        photo: GalleryPhoto;
        isAdmin: boolean;
        uid: string;
        onDownload: () => void;
        onShare: () => void;
        onDelete: (photo: GalleryPhoto) => void;
      };
    }>;
    'import-recipe': SheetDefinition<{
      payload: {
        onImport: (data: ImportedRecipeData) => void;
      };
    }>;
    'add-shopping-item': SheetDefinition<{
      payload: {
        familyId: string;
        listId: string;
        categories: ShoppingCategory[];
        uid: string;
        displayName: string;
      };
    }>;
    'assign-meal': SheetDefinition<{
      payload: {
        familyId: string;
        weekStart: string;
        day: DayOfWeek;
        mealType: MealType;
        current: MealSlot | null;
        recipes: Recipe[];
      };
    }>;
  }
}
