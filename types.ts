
export enum AlchemyMode {
  SURVIVAL = 'SURVIVAL',
  GOURMET = 'GOURMET',
  DARK_ARTS = 'DARK_ARTS'
}

export interface Ingredient {
  name: string;
  quantity: string;
  freshness: string;
  note?: string;
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  chefTip: string;
  alchemyComment: string;
}

export interface AppState {
  step: 'UPLOAD' | 'IDENTIFYING' | 'CONFIRMING' | 'TRANSMUTING' | 'RESULT';
  image: string | null;
  detectedIngredients: Ingredient[];
  selectedMode: AlchemyMode;
  recipe: Recipe | null;
  recipeImage: string | null;
  error: string | null;
}
