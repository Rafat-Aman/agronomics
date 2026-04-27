import { useState, useRef, ChangeEvent } from 'react';
import { GoogleGenAI } from '@google/genai';
import {
  Camera,
  Upload,
  Leaf,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Scan,
  RefreshCw,
  Info,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../components/Layout';
import { cn } from '../lib/utils';

export default function DiseaseDetection() {
  const [image, setImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<{
    disease: string;
    description: string;
    confidence: string;
    recommendation: string;
    severity: 'low' | 'medium' | 'high';
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
    setPrediction(null);
    setError(null);
  };

  const analyzeImage = async () => {
    if (!image) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      setError('System Error: Key is empty in code.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey });

      const response = await fetch(image);
      const blob = await response.blob();
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const prompt = `Analyze this crop/plant leaf image for diseases. 
      Return response in STRICT JSON format:
      {
        "disease": "Disease Name (Eng & Bengali)",
        "description": "Short explanation",
        "confidence": "90%+",
        "recommendation": "Step-by-step action",
        "severity": "low/medium/high"
      }
      If not a leaf, return {"error": "Invalid Image"}.`;

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          { text: prompt },
          {
            inlineData: {
              data: base64Data,
              mimeType: blob.type
            }
          }
        ]
      });

      const text = result.text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Invalid AI response');

      const data = JSON.parse(jsonMatch[0]);
      if (data.error) throw new Error(data.error);

      setPrediction(data);
    } catch (err: any) {
      console.error('AI Error:', err);
      setError(`AI Error: ${err.message || 'Check your internet connection and API key.'}`);
    } finally {
      setLoading(false);
    }
  };

  const keyStatus = import.meta.env.VITE_GEMINI_API_KEY ? 'Loaded' : 'Missing';

  return (
    <Layout title="Vision AI Scanner" showBack>
      <div className="min-h-screen bg-surface px-6 py-4 pb-24 space-y-8">
        <section className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-primary/10 rounded-xl text-primary"><Scan className="w-5 h-5" /></span>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest">Next-Gen Vision AI</span>
          </div>
          <h1 className="text-4xl font-black text-on-surface leading-tight">
            Protect Your <span className="text-primary italic">Harvest</span>
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">Scan any leaf for instant disease diagnosis and expert advice.</p>
        </section>

        <motion.div layout className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-white/50 relative overflow-hidden group">
          <div className="relative z-10 space-y-6">
            {!image ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-[2rem] border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-primary/10 transition-all active:scale-95"
              >
                <div className="p-6 bg-white rounded-full shadow-lg"><Camera className="w-8 h-8 text-primary" /></div>
                <div className="text-center">
                  <p className="font-bold text-on-surface">Upload Leaf Photo</p>
                  <p className="text-xs text-on-surface-variant">Focus on the affected area</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                  <img src={image} className="w-full h-full object-cover" />
                  {loading && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                      <Loader2 className="w-12 h-12 animate-spin mb-3" />
                      <span className="font-black text-xs uppercase tracking-widest">AI Brain working...</span>
                    </div>
                  )}
                </div>
                {!loading && !prediction && (
                  <div className="flex gap-3">
                    <button onClick={() => setImage(null)} className="flex-1 py-4 bg-surface-container text-on-surface font-bold rounded-2xl flex justify-center gap-2">
                      <RefreshCw className="w-4 h-4" /> Retake
                    </button>
                    <button onClick={analyzeImage} className="flex-[2] py-4 bg-primary text-on-primary font-bold rounded-2xl flex justify-center gap-2 shadow-lg shadow-primary/30">
                      <CheckCircle2 className="w-4 h-4" /> Scan with AI
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-error-container text-on-error-container p-5 rounded-[2rem] flex gap-3 border border-error/10 overflow-hidden">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-bold break-words">{error}</p>
            </motion.div>
          )}

          {prediction && (
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pb-10">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden">
                <div className="absolute top-8 right-8">
                  <div className={cn(
                    "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    prediction.severity === 'high' ? "bg-red-100 text-red-700" :
                      prediction.severity === 'medium' ? "bg-orange-100 text-orange-700" :
                        "bg-green-100 text-green-700"
                  )}>
                    {prediction.severity} severity
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-primary font-bold text-xs uppercase tracking-widest mb-1">Diagnosis</h3>
                    <h2 className="text-3xl font-black text-on-surface leading-tight">{prediction.disease}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-2 flex-1 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: prediction.confidence }} />
                      </div>
                      <span className="text-xs font-bold text-primary">{prediction.confidence} Confidence</span>
                    </div>
                  </div>

                  <p className="text-on-surface-variant font-medium leading-relaxed">{prediction.description}</p>

                  <div className="bg-primary/5 p-6 rounded-[2rem] space-y-3">
                    <h4 className="font-bold flex items-center gap-2 text-primary">
                      <ShieldCheck className="w-5 h-5" /> Recommended Action
                    </h4>
                    <p className="text-on-surface font-semibold text-sm leading-snug">{prediction.recommendation}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-white">
                  <Leaf className="w-6 h-6 text-green-600 mb-2" />
                  <p className="text-[10px] font-black uppercase text-on-surface-variant">Model</p>
                  <p className="text-lg font-black italic">Gemini 2.5</p>
                </div>
                <div className="bg-white/50 backdrop-blur-sm p-6 rounded-[2rem] border border-white">
                  <Info className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-[10px] font-black uppercase text-on-surface-variant">Accuracy</p>
                  <p className="text-lg font-black italic">High-Res</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center">
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-tight px-3 py-1 rounded-full",
            keyStatus === 'Loaded' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            AI Status: Key {keyStatus}
          </span>
        </div>
      </div>
    </Layout>
  );
}
