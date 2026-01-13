
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Zap, 
  ChefHat, 
  Skull, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles,
  MessageCircle,
  ArrowRight,
  Info,
  X,
  Scan,
  ClipboardList,
  CookingPot
} from 'lucide-react';
import { AlchemyMode, Ingredient, Recipe, AppState } from './types';
import { analyzeFridgeImage, transmuteRecipe, generateRecipeImage, askChefQuestion } from './geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState & { showCamera: boolean }>({
    step: 'UPLOAD',
    image: null,
    detectedIngredients: [],
    selectedMode: AlchemyMode.SURVIVAL,
    recipe: null,
    recipeImage: null,
    error: null,
    showCamera: false,
  });

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setState(prev => ({ ...prev, showCamera: false }));
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setCameraStream(stream);
      setState(prev => ({ ...prev, showCamera: true, error: null }));
    } catch (err) {
      setState(prev => ({ ...prev, error: "無法開啟相機，請手動上傳照片。" }));
      fileInputRef.current?.click();
    }
  };

  useEffect(() => {
    if (state.showCamera && videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [state.showCamera, cameraStream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      const video = videoRef.current;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      const base64 = canvasRef.current.toDataURL('image/jpeg');
      stopCamera();
      processImage(base64);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        processImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setState(prev => ({ ...prev, image: base64, step: 'IDENTIFYING', error: null }));
    try {
      const ingredients = await analyzeFridgeImage(base64);
      setState(prev => ({ ...prev, detectedIngredients: ingredients, step: 'CONFIRMING' }));
    } catch (err) {
      setState(prev => ({ ...prev, step: 'UPLOAD', error: '解析失敗，請換張清楚一點的照片。' }));
    }
  };

  const handleTransmute = async () => {
    setState(prev => ({ ...prev, step: 'TRANSMUTING' }));
    try {
      const recipe = await transmuteRecipe(state.detectedIngredients, state.selectedMode);
      const recipeImage = await generateRecipeImage(recipe.title, recipe.description);
      setState(prev => ({ ...prev, recipe, recipeImage, step: 'RESULT' }));
    } catch (err) {
      setState(prev => ({ ...prev, step: 'CONFIRMING', error: '煉成陣崩潰！請重試。' }));
    }
  };

  const handleAskQuestion = async () => {
    if (!chatInput.trim() || !state.recipe) return;
    const q = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: q }]);
    setIsAsking(true);
    try {
      const answer = await askChefQuestion(state.recipe, q);
      setChatHistory(prev => [...prev, { role: 'ai', text: answer }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'ai', text: '能量不足，暫時無法回答。' }]);
    } finally {
      setIsAsking(false);
    }
  };

  const reset = () => {
    stopCamera();
    setState({
      step: 'UPLOAD',
      image: null,
      detectedIngredients: [],
      selectedMode: AlchemyMode.SURVIVAL,
      recipe: null,
      recipeImage: null,
      error: null,
      showCamera: false,
    });
    setChatHistory([]);
  };

  const modeConfig = {
    [AlchemyMode.SURVIVAL]: { 
      label: '🥗 生存模式', 
      desc: '極速、飽足、極簡', 
      theme: 'from-blue-600 to-cyan-500', 
      glow: 'shadow-blue-500/40', 
      icon: Zap 
    },
    [AlchemyMode.GOURMET]: { 
      label: '👨‍🍳 米其林模式', 
      desc: '浮誇、質感、華麗', 
      theme: 'from-purple-600 to-pink-500', 
      glow: 'shadow-purple-500/40', 
      icon: ChefHat 
    },
    [AlchemyMode.DARK_ARTS]: { 
      label: '☠️ 暗黑煉金', 
      desc: '驚世、禁忌、狂想', 
      theme: 'from-red-600 to-orange-500', 
      glow: 'shadow-red-500/40', 
      icon: Skull 
    }
  };

  const activeTheme = modeConfig[state.selectedMode];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-8 max-w-4xl mx-auto selection:bg-purple-500/30">
      {/* Header */}
      <header className="flex flex-col items-center mb-8 text-center animate-in fade-in duration-700">
        <div 
          onClick={reset}
          className={`w-16 h-16 bg-gradient-to-tr ${activeTheme.theme} rounded-2xl flex items-center justify-center mb-4 shadow-lg ${activeTheme.glow} cursor-pointer hover:scale-110 transition-all duration-500`}
        >
          <Sparkles className="text-white w-9 h-9" />
        </div>
        <h1 className="text-4xl md:text-5xl font-magic font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
          冰箱煉金術師
        </h1>
        <p className="mt-2 text-slate-400 font-medium">Fridge Alchemist: Turning leftovers into pure gold.</p>
      </header>

      <main className="flex-1 w-full relative">
        {state.error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-500/30 rounded-2xl text-red-200 flex items-center gap-3 animate-in slide-in-from-top-2">
            <Info className="w-5 h-5 flex-shrink-0" />
            <p>{state.error}</p>
          </div>
        )}

        {state.step === 'UPLOAD' && !state.showCamera && (
          <div className="space-y-10 animate-in fade-in zoom-in-95 duration-500">
            {/* Mode Selection Grid on Home */}
            <div className="space-y-4">
              <h3 className="text-center font-magic font-bold text-slate-500 tracking-widest text-sm uppercase">選擇今日的煉金意志</h3>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(modeConfig) as AlchemyMode[]).map((mode) => {
                  const config = modeConfig[mode];
                  const isActive = state.selectedMode === mode;
                  const Icon = config.icon;
                  return (
                    <button
                      key={mode}
                      onClick={() => setState(prev => ({ ...prev, selectedMode: mode }))}
                      className={`flex flex-col items-center gap-2 p-4 rounded-3xl border-2 transition-all duration-500 ${
                        isActive 
                          ? `bg-slate-900 border-white/20 shadow-xl ${config.glow}` 
                          : 'bg-slate-950 border-slate-900 opacity-40 grayscale hover:opacity-100 hover:grayscale-0'
                      }`}
                    >
                      <Icon className={`w-8 h-8 transition-transform duration-500 ${isActive ? 'scale-110' : ''}`} style={{ color: isActive ? 'inherit' : undefined }} />
                      <div className="text-center">
                        <span className={`text-xs font-bold block ${isActive ? 'text-white' : 'text-slate-500'}`}>{config.label}</span>
                        {isActive && <span className="text-[10px] text-slate-500 animate-in fade-in slide-in-from-top-1">{config.desc}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div 
              onClick={startCamera}
              className={`group relative flex flex-col items-center justify-center h-64 md:h-72 border-2 border-dashed rounded-[3rem] glass-card transition-all duration-700 cursor-pointer overflow-hidden ${
                state.selectedMode === AlchemyMode.SURVIVAL ? 'border-blue-500/30 hover:border-blue-400' :
                state.selectedMode === AlchemyMode.GOURMET ? 'border-purple-500/30 hover:border-purple-400' :
                'border-red-500/30 hover:border-red-400'
              }`}
            >
              <div className={`p-7 rounded-full bg-slate-800/50 group-hover:scale-110 transition-all duration-700 z-10 ${
                state.selectedMode === AlchemyMode.SURVIVAL ? 'group-hover:bg-blue-900/40' :
                state.selectedMode === AlchemyMode.GOURMET ? 'group-hover:bg-purple-900/40' :
                'group-hover:bg-red-900/40'
              }`}>
                <Camera className={`w-14 h-14 transition-colors duration-700 ${
                  state.selectedMode === AlchemyMode.SURVIVAL ? 'text-blue-400' :
                  state.selectedMode === AlchemyMode.GOURMET ? 'text-purple-400' :
                  'text-red-400'
                }`} />
              </div>
              <p className="mt-5 text-2xl font-magic font-bold z-10">開啟煉金之眼</p>
              <p className="text-slate-500 text-sm z-10 mt-1 uppercase tracking-tighter">Snap to Inventory</p>
              
              {/* Dynamic background glow */}
              <div className={`absolute inset-0 bg-gradient-to-b ${activeTheme.theme} opacity-0 group-hover:opacity-10 transition-opacity duration-700`}></div>
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-3 p-5 bg-slate-900/40 border border-slate-800 rounded-3xl hover:bg-slate-800/60 transition-colors cursor-pointer"
            >
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-slate-400 font-medium">或提取舊的照片記憶 (相簿)</span>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            </div>
          </div>
        )}

        {state.showCamera && (
          <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4">
            <div className={`w-full max-w-lg aspect-[3/4] relative rounded-[3rem] overflow-hidden shadow-2xl border bg-black transition-colors duration-700 ${
              state.selectedMode === AlchemyMode.SURVIVAL ? 'border-blue-500/30 shadow-blue-500/20' :
              state.selectedMode === AlchemyMode.GOURMET ? 'border-purple-500/30 shadow-purple-500/20' :
              'border-red-500/30 shadow-red-500/20'
            }`}>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
              
              {/* HUD Elements */}
              <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-950/80 m-0"></div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-48 border rounded-full animate-[ping_4s_linear_infinite] transition-colors duration-700 ${
                  state.selectedMode === AlchemyMode.SURVIVAL ? 'border-blue-400/20' :
                  state.selectedMode === AlchemyMode.GOURMET ? 'border-purple-400/20' :
                  'border-red-400/20'
                }`}></div>
              </div>
              <div className={`absolute top-1/2 left-0 right-0 h-[2px] animate-[scan_2.5s_linear_infinite] shadow-lg transition-colors duration-700 ${
                state.selectedMode === AlchemyMode.SURVIVAL ? 'bg-blue-500/40 shadow-blue-500/80' :
                state.selectedMode === AlchemyMode.GOURMET ? 'bg-purple-500/40 shadow-purple-500/80' :
                'bg-red-500/40 shadow-red-500/80'
              }`}></div>
              
              <div className="absolute bottom-10 left-0 right-0 flex justify-center items-center gap-10">
                <button onClick={stopCamera} className="p-5 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-red-500/40 transition-colors">
                  <X className="w-7 h-7" />
                </button>
                <button onClick={capturePhoto} className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all p-1">
                   <div className="w-full h-full border-[3px] border-slate-950 rounded-full flex items-center justify-center">
                     <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center">
                        <Scan className="w-8 h-8 text-white" />
                     </div>
                   </div>
                </button>
                <div className="w-16 h-16"></div> 
              </div>
            </div>
            <p className={`mt-8 font-magic tracking-widest animate-pulse transition-colors duration-700 ${
              state.selectedMode === AlchemyMode.SURVIVAL ? 'text-blue-400' :
              state.selectedMode === AlchemyMode.GOURMET ? 'text-purple-400' :
              'text-red-400'
            }`}>
              正在鎖定食材頻率 ({activeTheme.label})...
            </p>
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        {state.step === 'IDENTIFYING' && (
          <div className="flex flex-col items-center justify-center h-80 glass-card rounded-[3rem]">
            <div className="relative">
              <div className={`w-28 h-28 border-4 border-white/10 rounded-full animate-spin ${
                state.selectedMode === AlchemyMode.SURVIVAL ? 'border-t-blue-500' :
                state.selectedMode === AlchemyMode.GOURMET ? 'border-t-purple-500' :
                'border-t-red-500'
              }`}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className={`w-10 h-10 animate-pulse ${
                   state.selectedMode === AlchemyMode.SURVIVAL ? 'text-blue-400' :
                   state.selectedMode === AlchemyMode.GOURMET ? 'text-purple-400' :
                   'text-red-400'
                }`} />
              </div>
            </div>
            <h2 className="mt-10 text-2xl font-magic font-bold text-slate-100">
              識物中 (The Eye)...
            </h2>
            <p className="mt-2 text-slate-500 tracking-wide uppercase text-xs">Extraction using {activeTheme.label}</p>
          </div>
        )}

        {state.step === 'CONFIRMING' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <ClipboardList className="text-green-400 w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold font-magic">一鍵盤點 (Inventory)</h2>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold tracking-tight bg-white/5 ${
                state.selectedMode === AlchemyMode.SURVIVAL ? 'border-blue-500/30 text-blue-400' :
                state.selectedMode === AlchemyMode.GOURMET ? 'border-purple-500/30 text-purple-400' :
                'border-red-500/30 text-red-400'
              }`}>
                {activeTheme.label}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.detectedIngredients.map((ing, idx) => (
                <div key={idx} className={`glass-card p-5 rounded-3xl flex justify-between items-start group hover:bg-slate-800/40 transition-all border-l-4 shadow-lg ${
                  state.selectedMode === AlchemyMode.SURVIVAL ? 'border-l-blue-500' :
                  state.selectedMode === AlchemyMode.GOURMET ? 'border-l-purple-500' :
                  'border-l-red-500'
                }`}>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-bold text-xl text-white">{ing.name}</h3>
                      <span className={`text-sm font-magic ${
                        state.selectedMode === AlchemyMode.SURVIVAL ? 'text-blue-400' :
                        state.selectedMode === AlchemyMode.GOURMET ? 'text-purple-400' :
                        'text-red-400'
                      }`}>{ing.quantity}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-500/50" />
                      狀態：{ing.freshness}
                    </p>
                    <p className="text-sm italic text-slate-400 mt-3 leading-relaxed border-l border-slate-800 pl-3">
                      "{ing.note}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <button 
                onClick={handleTransmute}
                className={`w-full py-6 magic-gradient rounded-[2rem] font-magic font-bold text-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-4 ${activeTheme.glow} ${
                  state.selectedMode === AlchemyMode.SURVIVAL ? 'from-blue-600 to-cyan-500' :
                  state.selectedMode === AlchemyMode.GOURMET ? 'from-purple-600 to-pink-500' :
                  'from-red-600 to-orange-500'
                }`}
              >
                <Sparkles className="w-7 h-7 animate-pulse" />
                具現化煉成 (TRANSMUTE)
              </button>
              <button 
                onClick={() => setState(prev => ({ ...prev, step: 'UPLOAD' }))}
                className="w-full py-4 mt-3 text-slate-500 text-sm font-magic hover:text-slate-300 transition-colors"
              >
                ← 返回修改煉金意志
              </button>
            </div>
          </div>
        )}

        {state.step === 'TRANSMUTING' && (
          <div className="flex flex-col items-center justify-center h-[50vh] glass-card rounded-[3rem] overflow-hidden relative">
            <div className={`absolute inset-0 animate-pulse ${
               state.selectedMode === AlchemyMode.SURVIVAL ? 'bg-blue-600/5' :
               state.selectedMode === AlchemyMode.GOURMET ? 'bg-purple-600/5' :
               'bg-red-600/5'
            }`}></div>
            <div className="z-10 flex flex-col items-center">
              <div className="w-40 h-40 relative mb-8">
                <div className={`absolute inset-0 border-[6px] border-white/5 rounded-full animate-[spin_1.5s_linear_infinite] ${
                   state.selectedMode === AlchemyMode.SURVIVAL ? 'border-t-blue-500' :
                   state.selectedMode === AlchemyMode.GOURMET ? 'border-t-purple-500' :
                   'border-t-red-500'
                }`}></div>
                <div className="absolute inset-4 border-[6px] border-white/5 rounded-full animate-[spin_2s_linear_infinite_reverse] border-b-white/20"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <activeTheme.icon className="w-14 h-14 text-white animate-bounce" />
                </div>
              </div>
              <h2 className={`text-3xl font-magic font-bold bg-clip-text text-transparent bg-gradient-to-r ${activeTheme.theme}`}>
                煉成中 (The Brain)...
              </h2>
              <p className="mt-3 text-slate-500 font-medium tracking-widest animate-pulse">RESTRUCTURING MOLECULES</p>
            </div>
          </div>
        )}

        {state.step === 'RESULT' && state.recipe && (
          <div className="space-y-10 pb-24 animate-in fade-in zoom-in-95 duration-1000">
            {/* Visual Part */}
            <div className={`relative rounded-[3rem] overflow-hidden shadow-2xl border transition-colors duration-1000 ${
              state.selectedMode === AlchemyMode.SURVIVAL ? 'border-blue-500/20' :
              state.selectedMode === AlchemyMode.GOURMET ? 'border-purple-500/20' :
              'border-red-500/20'
            }`}>
              {state.recipeImage ? (
                <img src={state.recipeImage} alt={state.recipe.title} className="w-full aspect-video object-cover transition-transform duration-1000 hover:scale-105" />
              ) : (
                <div className="w-full aspect-video bg-slate-900 flex items-center justify-center">
                  <RefreshCw className="w-10 h-10 text-purple-500 animate-spin" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10">
                <div className="flex items-center gap-3 mb-4">
                   <span className={`px-3 py-1 rounded-lg backdrop-blur-md border text-[10px] font-bold tracking-widest uppercase ${
                     state.selectedMode === AlchemyMode.SURVIVAL ? 'bg-blue-600/10 border-blue-500/30 text-blue-300' :
                     state.selectedMode === AlchemyMode.GOURMET ? 'bg-purple-600/10 border-purple-500/30 text-purple-300' :
                     'bg-red-600/10 border-red-500/30 text-red-300'
                   }`}>
                     {activeTheme.label} SUCCESS
                   </span>
                </div>
                <h2 className="text-4xl md:text-5xl font-magic font-bold text-white mb-4 drop-shadow-2xl">{state.recipe.title}</h2>
                <p className="text-slate-300 text-lg leading-relaxed max-w-2xl italic font-medium">"{state.recipe.description}"</p>
              </div>
            </div>

            {/* Recipe Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-8">
                <div className={`glass-card p-8 rounded-[2.5rem] border-t-4 shadow-2xl ${
                  state.selectedMode === AlchemyMode.SURVIVAL ? 'border-t-blue-500/50' :
                  state.selectedMode === AlchemyMode.GOURMET ? 'border-t-purple-500/50' :
                  'border-t-red-500/50'
                }`}>
                  <h3 className="font-magic font-bold text-xl mb-6 flex items-center gap-3">
                    <ClipboardList className="w-6 h-6 text-slate-400" />
                    所需煉金清單
                  </h3>
                  <ul className="space-y-4">
                    {state.recipe.ingredients.map((item, idx) => (
                      <li key={idx} className="text-slate-300 flex items-start gap-4 p-3 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                          state.selectedMode === AlchemyMode.SURVIVAL ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                          state.selectedMode === AlchemyMode.GOURMET ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                          'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className={`p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl border ${
                   state.selectedMode === AlchemyMode.SURVIVAL ? 'bg-blue-900/10 border-blue-500/20' :
                   state.selectedMode === AlchemyMode.GOURMET ? 'bg-purple-900/10 border-purple-500/20' :
                   'bg-red-900/10 border-red-500/20'
                }`}>
                  <Sparkles className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 group-hover:scale-125 transition-transform duration-1000" />
                  <h3 className="font-magic font-bold text-xl mb-4 flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-yellow-500/50" />
                    煉金師結語
                  </h3>
                  <p className="text-slate-300 leading-relaxed italic font-medium">
                    {state.recipe.alchemyComment}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className={`glass-card p-10 rounded-[3rem] border-t-4 shadow-2xl ${
                  state.selectedMode === AlchemyMode.SURVIVAL ? 'border-t-blue-500/50' :
                  state.selectedMode === AlchemyMode.GOURMET ? 'border-t-purple-500/50' :
                  'border-t-red-500/50'
                }`}>
                  <h3 className="font-magic font-bold text-2xl mb-8 flex items-center gap-3">
                    <ArrowRight className="w-7 h-7 text-slate-400" />
                    煉成程序 (Steps)
                  </h3>
                  <div className="space-y-8">
                    {state.recipe.instructions.map((step, idx) => (
                      <div key={idx} className="flex gap-6 group">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-magic font-bold text-xl transition-all shadow-lg ${
                           state.selectedMode === AlchemyMode.SURVIVAL ? 'text-blue-400 group-hover:border-blue-500' :
                           state.selectedMode === AlchemyMode.GOURMET ? 'text-purple-400 group-hover:border-purple-500' :
                           'text-red-400 group-hover:border-red-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <p className="text-slate-300 pt-1.5 leading-loose text-lg font-medium">{step}</p>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-12 p-6 bg-yellow-900/5 border border-yellow-500/10 rounded-3xl flex items-start gap-4">
                    <Zap className="w-6 h-6 text-yellow-500/60 flex-shrink-0 mt-1" />
                    <p className="text-slate-300 font-bold leading-relaxed">
                      煉金秘訣：<span className="font-medium text-slate-400 italic">{state.recipe.chefTip}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Function C: Chat Helper */}
            <div className={`glass-card p-10 rounded-[3rem] border-t-8 shadow-2xl ${
               state.selectedMode === AlchemyMode.SURVIVAL ? 'border-t-blue-600' :
               state.selectedMode === AlchemyMode.GOURMET ? 'border-t-purple-600' :
               'border-t-red-600'
            }`}>
              <h3 className="text-2xl font-magic font-bold mb-6 flex items-center gap-4">
                <MessageCircle className={`w-8 h-8 ${
                   state.selectedMode === AlchemyMode.SURVIVAL ? 'text-blue-400' :
                   state.selectedMode === AlchemyMode.GOURMET ? 'text-purple-400' :
                   'text-red-400'
                }`} />
                缺一味補救 (Missing Ingredient Fix)
              </h3>
              
              <div className="space-y-6 mb-8 max-h-80 overflow-y-auto pr-4 custom-scrollbar">
                {chatHistory.length === 0 && (
                  <div className="p-8 bg-slate-900/50 border border-slate-800 rounded-[2rem] text-center">
                    <p className="text-slate-500 text-lg italic">「沒有白酒怎麼辦？」、「這道菜可以做成素的嗎？」</p>
                    <p className="text-slate-600 text-sm mt-2">煉金師已準備好為您解決材料難題</p>
                  </div>
                )}
                {chatHistory.map((chat, idx) => (
                  <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4`}>
                    <div className={`max-w-[85%] p-5 rounded-3xl text-lg ${
                      chat.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-tr-none shadow-lg shadow-purple-900/20' 
                        : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800 leading-relaxed font-medium'
                    }`}>
                      {chat.text}
                    </div>
                  </div>
                ))}
                {isAsking && (
                  <div className="flex justify-start">
                    <div className="bg-slate-900 p-5 rounded-3xl rounded-tl-none border border-slate-800">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-slate-700 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-slate-700 rounded-full animate-bounce delay-100"></div>
                        <div className="w-3 h-3 bg-slate-700 rounded-full animate-bounce delay-200"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 p-2 bg-slate-950/50 rounded-[2.5rem] border border-slate-800">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
                  placeholder="輸入材料困擾，例如：『沒白酒能用米酒嗎？』"
                  className="flex-1 bg-transparent px-6 py-4 text-lg focus:outline-none placeholder:text-slate-600"
                />
                <button 
                  onClick={handleAskQuestion}
                  disabled={isAsking || !chatInput.trim()}
                  className={`p-5 rounded-full transition-all disabled:opacity-50 shadow-xl ${activeTheme.theme} text-white`}
                >
                  <ArrowRight className="w-7 h-7" />
                </button>
              </div>
            </div>

            <div className="flex justify-center pb-20">
              <button 
                onClick={reset}
                className="px-10 py-5 bg-slate-900 text-slate-500 rounded-full border border-slate-800 hover:bg-slate-800 hover:text-slate-200 transition-all flex items-center gap-3 group font-magic font-bold tracking-widest text-sm"
              >
                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                RESTART ALCHEMY
              </button>
            </div>
          </div>
        )}
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(-150px); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(450px); opacity: 0; }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }
      `}} />
    </div>
  );
};

export default App;
