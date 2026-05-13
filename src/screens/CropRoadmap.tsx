import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Anthropic from '@anthropic-ai/sdk';
import { Loader2, AlertCircle, Clock, CheckCircle2, Leaf, Package, AlertTriangle, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../AuthContext';
import { addField, updateField } from '../lib/db';
import { useNavigate } from 'react-router-dom';

interface RoadmapPhase {
  phaseName: string;
  duration: string;
  tasks: string[];
  resourcesNeeded?: string[];
  potentialRisks?: string[];
  tips: string;
}

interface CropRoadmapData {
  phases: RoadmapPhase[];
  estimatedTotalDuration: string;
}

export default function CropRoadmap() {
  const [searchParams] = useSearchParams();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const cropName = searchParams.get('crop');
  const fieldId = searchParams.get('fieldId'); // passed from CropRecommendation
  const [data, setData] = useState<CropRoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);

  const handleActivate = async () => {
    if (!userProfile?.uid || !cropName) return;
    try {
      setSyncing(true);
      if (fieldId) {
        // Update the field that was selected in CropRecommendation
        await updateField(userProfile.uid, fieldId, {
          active_crop: cropName,
          health_status: 'healthy',
        });
      } else {
        // No field was selected — create a brand new one
        await addField(userProfile.uid, {
          field_name: `Field (${cropName.split('/')[0].trim()})`,
          area_size: 0,
          area_unit: 'acres',
          geo_hash: '',
          center_point: { lat: 0, lng: 0 },
          soil_summary: { type: 'Mixed', ph: 7 },
          input_mode: 'simple',
          active_crop: cropName,
          health_status: 'healthy',
        });
      }
      setSynced(true);
      setTimeout(() => navigate('/fields'), 1200);
    } catch (err) {
      console.error('Activate roadmap error:', err);
      setError('রোডম্যাপ সক্রিয় করতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const fetchRoadmap = async () => {
      if (!cropName) {
        setError("ফসলের নাম পাওয়া যায়নি।");
        setLoading(false);
        return;
      }

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
      if (!apiKey) {
        setError('এপিআই কী নেই।');
        setLoading(false);
        return;
      }

      try {
        const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
        const prompt = `আপনি বাংলাদেশের একজন বিশেষজ্ঞ কৃষিবিদ। "${cropName}" ফসলের জন্য শুরু থেকে ফসল কাটা পর্যন্ত অত্যন্ত বাস্তবসম্মত ও বিস্তারিত ধাপে ধাপে চাষাবাদ রোডম্যাপ প্রদান করুন।
        সমস্ত তথ্য বাংলা ভাষায় লিখুন। নিচের সঠিক JSON কাঠামোতে উত্তর দিন:
        {
          "phases": [
            {
              "phaseName": "যেমন: জমি প্রস্তুতি ও বীজ বপন",
              "duration": "যেমন: ১ম থেকে ১৫তম দিন",
              "tasks": ["নির্দিষ্ট কাজ ১", "নির্দিষ্ট কাজ ২"],
              "resourcesNeeded": ["যেমন: ট্র্যাক্টর", "যেমন: ৫০ কেজি ইউরিয়া", "যেমন: ২০ কেজি বীজ"],
              "potentialRisks": ["যেমন: ভারী বৃষ্টিতে বীজ ভেসে যেতে পারে", "যেমন: আগাছার বৃদ্ধি"],
              "tips": "এই পর্যায়ের জন্য বিশেষজ্ঞ কৃষি পরামর্শ"
            }
          ],
          "estimatedTotalDuration": "যেমন: ১২০ দিন"
        }
        মার্কডাউন ফরম্যাটিং ব্যবহার করবেন না, শুধু JSON স্ট্রিং দিন। কমপক্ষে ৪ থেকে ৫টি স্বতন্ত্র কালানুক্রমিক পর্যায় নিশ্চিত করুন। কাজ, সম্পদ এবং ঝুঁকিগুলো ফসল-নির্দিষ্ট ও একজন কৃষকের জন্য বাস্তবসম্মত করুন।`;

        const response = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 8192,
          messages: [{ role: 'user', content: prompt }],
        }).finalMessage();

        const text = response.content[0].type === 'text' ? response.content[0].text : '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const parsedData = JSON.parse(jsonMatch[0]);
        setData(parsedData);
      } catch (err: any) {
        console.error('Roadmap Error:', err);
        const isBusy = err.message?.includes('503') || err.message?.toLowerCase().includes('demand') || err.message?.toLowerCase().includes('busy');
        setError(isBusy
          ? 'এআই সিস্টেম সাময়িকভাবে অতিরিক্ত চাপে রয়েছে। কয়েক সেকেন্ড পরে আবার চেষ্টা করুন।'
          : `রোডম্যাপ তৈরি করতে ব্যর্থ হয়েছে: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [cropName]);

  return (
    <Layout title="চাষাবাদ রোডম্যাপ" showBack>
      <div className="px-6 pb-24 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm font-bold text-on-surface-variant animate-pulse text-center leading-relaxed">
              আমাদের এআই কৃষিবিদ তথ্য বিশ্লেষণ করছেন<br />এবং {cropName} এর জন্য<br />ধাপে ধাপে রোডম্যাপ তৈরি করছেন...
            </p>
          </div>
        )}

        {error && (
          <div className="bg-error-container text-on-error-container p-5 rounded-[2rem] flex gap-3 border border-error/10">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {data && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-[2rem] editorial-shadow text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
              <Leaf className="w-10 h-10 text-primary mx-auto mb-4" />
              <h1 className="text-3xl font-black mb-2">{cropName}</h1>
              <div className="flex items-center justify-center gap-2 text-on-surface-variant font-bold">
                <Clock className="w-4 h-4" />
                <span>আনুমানিক সময়: {data.estimatedTotalDuration}</span>
              </div>

              <button
                onClick={handleActivate}
                disabled={syncing || synced}
                className="mt-6 mx-auto bg-primary text-on-primary px-8 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-70"
              >
                {synced ? (
                  <><CheckCircle2 className="w-5 h-5" /> সক্রিয় হয়েছে!</>
                ) : syncing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> সক্রিয় হচ্ছে…</>
                ) : (
                  <><Plus className="w-5 h-5" /> {fieldId ? 'নির্বাচিত মাঠের জন্য সক্রিয় করুন' : 'আমার মাঠে যোগ করুন'}</>
                )}
              </button>
            </div>

            <div className="relative border-l-2 border-primary/20 ml-4 space-y-10 py-4">
              {data.phases.map((phase, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className="relative pl-6"
                >
                  {/* Timeline Node */}
                  <div className="absolute -left-[11px] top-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-4 ring-background">
                    <div className="w-2 h-2 bg-on-primary rounded-full" />
                  </div>

                  <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/10">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <h3 className="font-black text-lg text-on-surface leading-tight">{phase.phaseName}</h3>
                      <span className="shrink-0 bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap">
                        {phase.duration}
                      </span>
                    </div>

                    <div className="space-y-4 mb-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 mb-2">মূল কাজসমূহ</h4>
                        <ul className="space-y-2">
                          {phase.tasks.map((task, tIdx) => (
                            <li key={tIdx} className="flex gap-2 text-sm text-on-surface-variant">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                              <span>{task}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {phase.resourcesNeeded && phase.resourcesNeeded.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 mb-2 flex items-center gap-1">
                            <Package className="w-3.5 h-3.5" /> প্রয়োজনীয় সম্পদ
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {phase.resourcesNeeded.map((resource, rIdx) => (
                              <span key={rIdx} className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-md">
                                {resource}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {phase.potentialRisks && phase.potentialRisks.length > 0 && (
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-error/80 mb-2 flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> সম্ভাব্য ঝুঁকি
                          </h4>
                          <ul className="space-y-1">
                            {phase.potentialRisks.map((risk, rIdx) => (
                              <li key={rIdx} className="flex gap-2 text-xs text-error/90">
                                <span className="shrink-0 mt-0.5 text-error">•</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {phase.tips && (
                      <div className="bg-tertiary-container/30 border border-tertiary/20 p-3 rounded-xl flex gap-2">
                        <span className="text-tertiary shrink-0">💡</span>
                        <p className="text-xs font-bold text-on-surface-variant leading-relaxed">
                          <span className="text-tertiary uppercase tracking-wider mr-1">বিশেষজ্ঞ পরামর্শ:</span>
                          {phase.tips}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
