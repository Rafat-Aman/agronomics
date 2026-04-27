import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { GoogleGenAI } from '@google/genai';
import { Loader2, AlertCircle, Clock, CheckCircle2, Leaf, Package, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

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
  const cropName = searchParams.get('crop');
  const [data, setData] = useState<CropRoadmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoadmap = async () => {
      if (!cropName) {
        setError("Crop name is missing.");
        setLoading(false);
        return;
      }

      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setError('API Key is missing.');
        setLoading(false);
        return;
      }

      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Act as an expert agronomist in Bangladesh. Provide a highly realistic and detailed, step-by-step cultivation roadmap from start to harvest for: "${cropName}".
        Return the response in STRICT JSON format matching this exact structure:
        {
          "phases": [
            {
              "phaseName": "e.g., Land Preparation & Sowing",
              "duration": "e.g., Days 1-15",
              "tasks": ["Specific Task 1", "Specific Task 2"],
              "resourcesNeeded": ["e.g., Tractor", "e.g., 50kg Urea", "e.g., 20kg Seeds"],
              "potentialRisks": ["e.g., Heavy rain can wash away seeds", "e.g., Weed growth"],
              "tips": "Expert agronomy tip for this phase"
            }
          ],
          "estimatedTotalDuration": "e.g., 120 days"
        }
        Do not include markdown formatting, just the JSON string. Ensure there are at least 4 to 5 distinct chronological phases. Make the tasks, resources, and risks highly specific to the crop and realistic for a farmer.`;

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });

        const text = result.text;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Invalid AI response format');

        const parsedData = JSON.parse(jsonMatch[0]);
        setData(parsedData);
      } catch (err: any) {
        console.error('Roadmap Error:', err);
        setError(`Failed to generate roadmap: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRoadmap();
  }, [cropName]);

  return (
    <Layout title="Cultivation Roadmap" showBack>
      <div className="px-6 pb-24 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-sm font-bold text-on-surface-variant animate-pulse text-center leading-relaxed">
              Our AI Agronomist is analyzing data<br />and generating a step-by-step<br />roadmap for {cropName}...
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
                <span>Est. Time: {data.estimatedTotalDuration}</span>
              </div>
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
                        <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/70 mb-2">Key Tasks</h4>
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
                            <Package className="w-3.5 h-3.5" /> Required Resources
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
                            <AlertTriangle className="w-3.5 h-3.5" /> Potential Risks
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
                          <span className="text-tertiary uppercase tracking-wider mr-1">Pro Tip:</span>
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
