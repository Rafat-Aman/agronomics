import { useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Scan,
  AlertCircle,
  Info,
  ChevronRight,
  Leaf,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from '../components/Layout';
import { cn } from '../lib/utils';

const LABELS = [
  "Apple Scab", "Apple Black Rot", "Cedar Apple Rust", "Apple Healthy",
  "Blueberry Healthy", "Cherry Powdery Mildew", "Cherry Healthy",
  "Corn Cercospora Leaf Spot", "Corn Common Rust", "Corn Northern Leaf Blight", "Corn Healthy",
  "Grape Black Rot", "Grape Esca (Black Measles)", "Grape Leaf Blight", "Grape Healthy",
  "Orange Haunglongbing (Citrus Greening)", "Peach Bacterial Spot", "Peach Healthy",
  "Pepper Bell Bacterial Spot", "Pepper Bell Healthy", "Potato Early Blight", "Potato Late Blight", "Potato Healthy",
  "Raspberry Healthy", "Soybean Healthy", "Squash Powdery Mildew", "Strawberry Leaf Scorch", "Strawberry Healthy",
  "Tomato Bacterial Spot", "Tomato Early Blight", "Tomato Late Blight", "Tomato Leaf Mold",
  "Tomato Septoria Leaf Spot", "Tomato Spider Mites", "Tomato Target Spot",
  "Tomato Yellow Leaf Curl Virus", "Tomato Mosaic Virus", "Tomato Healthy"
];

const RECOMMENDATIONS: Record<string, string> = {
  "Scab": "Apply fungicide early and prune fallen leaves.",
  "Rot": "Prune infected branches and use copper fungicides.",
  "Rust": "Remove nearby juniper bushes and apply sulfur sprays.",
  "Blight": "Increase air circulation and avoid overhead watering.",
  "Mildew": "Apply potassium bicarbonate or neem oil sprays.",
  "Spot": "Remove infected leaves and use copper fungicides.",
  "Virus": "Control whiteflies and remove infected plants.",
  "Mites": "Increase humidity and use insecticidal soap.",
  "Healthy": "No actions needed. Maintain regular nutrition."
};

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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const imageUrl = URL.createObjectURL(file);
    setImage(imageUrl);
    setPrediction(null);
    setError(null);
  };

  const handlePredict = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);

    try {
      const model = await tf.loadLayersModel('/model/model.json');
      const img = new Image();
      img.src = image;

      img.onload = async () => {
        try {
          const tensor = tf.browser
            .fromPixels(img)
            .resizeNearestNeighbor([224, 224])
            .toFloat()
            .div(255)
            .expandDims();

          const result = model.predict(tensor) as tf.Tensor;
          const values = await result.data();

          let maxVal = 0, maxIdx = 0;
          for (let i = 0; i < values.length; i++) {
            if (values[i] > maxVal) { maxVal = values[i]; maxIdx = i; }
          }

          const rawLabel = LABELS[maxIdx] || 'Unknown';
          const recKey = Object.keys(RECOMMENDATIONS).find(k => rawLabel.includes(k)) || "Healthy";

          setPrediction({
            disease: rawLabel,
            description: `Edge AI diagnosis (38 categories supported).`,
            confidence: `${(maxVal * 100).toFixed(1)}%`,
            recommendation: RECOMMENDATIONS[recKey],
            severity: maxVal > 0.8 ? (rawLabel.includes('Healthy') ? 'low' : 'medium') : 'high',
          });
        } catch (err) {
          setError('Analysis failed. Try a different photo.');
        } finally {
          setLoading(false);
        }
      };
      img.onerror = () => { setError('Image load error.'); setLoading(false); };
    } catch (err) {
      setError('Model initialization error. Verify file system.');
      setLoading(false);
    }
  };

  return (
    <Layout title="Local Disease Scanner" showBack>
      <div className="min-h-screen bg-surface px-6 py-4 pb-24 space-y-8">
        <section className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
              <Scan className="w-4 h-4" />
            </span>
            <span className="text-[9px] font-black text-primary uppercase tracking-widest">Offline AI</span>
          </div>
          <h1 className="text-3xl font-black text-on-surface leading-tight">
            Crop Health <span className="text-primary italic">Scanner</span>
          </h1>
        </section>

        <motion.div layout className="bg-white rounded-[2rem] p-5 shadow-xl border border-primary/5">
          {!image ? (
            <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-[1.5rem] border-2 border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-4 cursor-pointer">
              <div className="p-4 bg-white rounded-full shadow-sm"><Camera className="w-7 h-7 text-primary" /></div>
              <div className="text-center">
                <p className="font-bold text-sm text-on-surface">Select Leaf Photo</p>
                <p className="text-[10px] text-on-surface-variant">Analyze without internet</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-xl overflow-hidden border shadow-inner bg-slate-100">
                <img src={image} className="w-full h-full object-contain" />
                {loading && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Analyzing...</span>
                  </div>
                )}
              </div>
              {!loading && !prediction && (
                <div className="flex gap-2">
                  <button onClick={() => setImage(null)} className="flex-1 py-3.5 bg-surface-container text-on-surface font-bold rounded-xl flex items-center justify-center gap-2 text-sm">
                    <RefreshCw className="w-4 h-4" /> Retake
                  </button>
                  <button onClick={handlePredict} className="flex-[2] py-3.5 bg-primary text-on-primary font-bold rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg shadow-primary/20">
                    <CheckCircle2 className="w-4 h-4" /> Scan Now
                  </button>
                </div>
              )}
            </div>
          )}
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-start gap-3 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </motion.div>
          )}
          {prediction && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="bg-white rounded-[2rem] p-6 shadow-lg relative overflow-hidden">
                <div className="absolute top-6 right-6">
                  <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter", prediction.severity === 'high' ? "bg-red-100 text-red-700" : prediction.severity === 'medium' ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700")}>{prediction.severity} severity</div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-primary font-bold text-[9px] uppercase tracking-widest mb-0.5">Detection Result</p>
                    <h2 className="text-xl font-black text-on-surface uppercase tracking-tight">{prediction.disease}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: prediction.confidence }} /></div>
                      <span className="text-[9px] font-bold text-primary">{prediction.confidence} Confidence</span>
                    </div>
                  </div>
                  <div className="bg-primary/5 p-4 rounded-xl flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    <div>
                      <p className="text-[9px] font-bold uppercase text-primary mb-1">Recommendation</p>
                      <p className="text-xs text-on-surface font-semibold leading-relaxed">{prediction.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <Leaf className="w-4 h-4 text-green-600 mb-1" />
                  <p className="text-[8px] font-bold uppercase text-slate-400">Processing</p>
                  <p className="text-sm font-black tracking-tight">On-Device</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl text-right">
                  <Info className="w-4 h-4 text-blue-600 mb-1 ml-auto" />
                  <p className="text-[8px] font-bold uppercase text-slate-400 text-right">Dataset</p>
                  <p className="text-sm font-black tracking-tight">38 Classes</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}