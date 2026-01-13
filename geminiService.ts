
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AlchemyMode, Ingredient, Recipe } from "./types";

const API_KEY = process.env.API_KEY || "";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

export const analyzeFridgeImage = async (base64Image: string): Promise<Ingredient[]> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    你是一位擁有「真實之眼」的冰箱煉金術師。請辨識這張照片中的所有食材。
    請以 JSON 格式回傳一個陣列，每個物件包含：
    - name: 食材名稱
    - quantity: 估計數量 (例如：x3, 半顆, 一大袋)
    - freshness: 狀態描述 (例如：新鮮、快過期了、看起來有點垂頭喪氣、充滿生命力)
    - note: 一句關於該食材的幽默觀察
    
    範例格式：[{"name": "雞蛋", "quantity": "x3", "freshness": "新鮮", "note": "它們在排隊等待被煉成料理。"}]
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/jpeg' } },
        { text: prompt }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            quantity: { type: Type.STRING },
            freshness: { type: Type.STRING },
            note: { type: Type.STRING }
          },
          required: ["name", "quantity", "freshness"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const transmuteRecipe = async (
  ingredients: Ingredient[], 
  mode: AlchemyMode
): Promise<Recipe> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3-flash-preview";

  const modeInstructions = {
    [AlchemyMode.SURVIVAL]: "🥗 生存模式：以『快速、能吃飽』為目標，只需最少調味料，步驟極簡，救人於飢餓之中。",
    [AlchemyMode.GOURMET]: "👨‍🍳 米其林模式：把這些剩菜擺盤成法式或高端料理。教使用者如何提升質感，並生成一段極其浮誇且華麗的菜色介紹。",
    [AlchemyMode.DARK_ARTS]: "☠️ 暗黑煉金：你現在是來自深淵的瘋狂煉金術士。請徹底拋棄人類對「美味」的世俗定義。目標是創造出外觀令人感到生理不適、食材組合極度反常（例如甜鹹亂湊、口感衝突）、看起來像「生化實驗失敗」或「克蘇魯儀式」的黑暗料理。描述要充滿中二病、絕望感與恐怖小說風格，強調黏稠、詭異顏色或不該存在的口感。"
  };

  const ingredientList = ingredients.map(i => `${i.name} ${i.quantity} (${i.freshness})`).join(", ");
  const prompt = `
    你是『冰箱煉金術師』。
    目前素材：${ingredientList}。
    模式：${modeInstructions[mode]}。
    
    請進行煉成並回傳 JSON：
    - title: 震撼人心(或令人恐懼)的菜名
    - description: 符合該模式風格的簡介
    - ingredients: 精確的材料配比
    - instructions: 詳細的煉成步驟
    - chefTip: 煉金師的私房補救或提味秘訣
    - alchemyComment: 一段符合煉金術風格的最終評論
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
          instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
          chefTip: { type: Type.STRING },
          alchemyComment: { type: Type.STRING }
        },
        required: ["title", "description", "ingredients", "instructions", "chefTip", "alchemyComment"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

// --- 使用 OpenAI DALL-E 3 產生圖片 ---
export const generateRecipeImage = async (
  recipeTitle: string, 
  description: string,
  mode: AlchemyMode = AlchemyMode.GOURMET
): Promise<string> => {
  
  // 為了保留暗黑煉金的特色，我們還是根據模式微調一下風格描述
  let styleDescription = "High-end culinary magazine, 8k resolution, delicious, dramatic lighting";
  if (mode === AlchemyMode.DARK_ARTS) {
    styleDescription = "Hyper-realistic biological horror food, visceral, slimy textures, neon toxic lighting, eldritch aesthetic, unsettling but high quality";
  } else if (mode === AlchemyMode.SURVIVAL) {
    styleDescription = "Documentary style, messy home cooking, warm lighting, realistic textures, comfort food";
  }

  const prompt = `A professional food photography of "${recipeTitle}". 
  Context: ${description}. 
  Style: ${styleDescription}.`;

  try {
    // 呼叫 OpenAI DALL-E 3
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
        quality: "hd",
        style: "vivid"
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("OpenAI Error:", data.error);
      return "";
    }

    if (data.data && data.data[0] && data.data[0].b64_json) {
      return `data:image/png;base64,${data.data[0].b64_json}`;
    }

    return "";

  } catch (error) {
    console.error("Image Gen Error:", error);
    return ""; 
  }
};

export const askChefQuestion = async (
  currentRecipe: Recipe, 
  userQuestion: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const model = "gemini-3-flash-preview";

  const prompt = `
    你是『冰箱煉金術師』。目前的煉成物是：${currentRecipe.title}。
    使用者遇到麻煩（缺食材或想替換）：『${userQuestion}』。
    
    請用「缺一味補救」的專業角度回答。如果是問替代食材，請說明替代後的風味變化（例如：米酒代白酒會偏中式，建議加糖平衡）。
    語氣要專業、熱情且帶有一點神秘的煉金風格。
  `;

  const response = await ai.models.generateContent({
    model,
    contents: prompt
  });

  return response.text || "煉金術的核心是等價交換，但我現在沒法回答你。";
};
