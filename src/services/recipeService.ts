import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

export interface RecipeIngredient {
  amount: string;
  name: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  servings: number;
  prepMins: number;
  cookMins: number;
  tags: string[];
  ingredients: RecipeIngredient[];
  steps: string[];
  photoURL: string;
  photoStoragePath: string;
  addedBy: string;
  addedByName: string;
  createdAt: number;
}

function recipesRef(familyId: string) {
  return firestore()
    .collection('families')
    .doc(familyId)
    .collection('recipes');
}

export function subscribeToRecipes(
  familyId: string,
  onUpdate: (recipes: Recipe[]) => void,
) {
  return recipesRef(familyId)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snap => {
      onUpdate(
        (snap?.docs ?? []).map(d => ({
          id: d.id,
          ...(d.data() as Omit<Recipe, 'id'>),
        })),
      );
    });
}

export async function addRecipe(
  familyId: string,
  recipe: Omit<Recipe, 'id' | 'createdAt'>,
) {
  await recipesRef(familyId).add({...recipe, createdAt: Date.now()});
}

export async function updateRecipe(
  familyId: string,
  recipeId: string,
  updates: Partial<Omit<Recipe, 'id'>>,
) {
  await recipesRef(familyId).doc(recipeId).update(updates);
}

export async function deleteRecipe(
  familyId: string,
  recipeId: string,
  photoStoragePath?: string,
) {
  if (photoStoragePath) {
    try {
      await storage().ref(photoStoragePath).delete();
    } catch {
      // Photo may already be deleted
    }
  }
  await recipesRef(familyId).doc(recipeId).delete();
}

export async function uploadRecipePhoto(
  familyId: string,
  recipeId: string,
  imageUri: string,
  onProgress?: (pct: number) => void,
): Promise<{downloadURL: string; storagePath: string}> {
  const ext = imageUri.split('.').pop()?.split('?')[0] ?? 'jpg';
  const storagePath = `families/${familyId}/recipes/${recipeId}_${Date.now()}.${ext}`;
  const ref = storage().ref(storagePath);
  const task = ref.putFile(imageUri);

  if (onProgress) {
    task.on('state_changed', snap => {
      onProgress(snap.bytesTransferred / snap.totalBytes);
    });
  }

  await task;
  const downloadURL = await ref.getDownloadURL();
  return {downloadURL, storagePath};
}
