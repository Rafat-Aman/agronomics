import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Info, 
  Sprout, 
  Lightbulb,
  Share2,
  Bookmark
} from 'lucide-react';
import { motion } from 'motion/react';
import Layout from '../components/Layout';
import { useApp } from '../AppContext';

export default function GuideDetail() {
  const { t } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const tip = location.state?.tip;

  if (!tip) {
    return (
      <Layout showBack title="Guide Detail">
        <div className="flex flex-col items-center justify-center pt-20 px-6 text-center space-y-4">
          <Info className="w-12 h-12 text-on-surface-variant/30" />
          <p className="text-on-surface-variant/60 font-medium">No guide selected.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="bg-primary text-on-primary px-6 py-3 rounded-2xl font-bold"
          >
            Return to Dashboard
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBack title={tip.category}>
      <div className="px-4 sm:px-6 pb-12 space-y-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-2xl"
        >
          <img 
            src={tip.image} 
            alt={tip.title} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          <div className="absolute bottom-6 left-6 right-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                {tip.category}
              </span>
              <div className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
                <Clock className="w-3 h-3" />
                <span>5 min read</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-headline font-black text-white leading-tight">
              {tip.title}
            </h1>
          </div>
        </motion.div>

        {/* Introduction / Quick Info */}
        <section className="bg-surface-container-low rounded-[2rem] p-6 border border-outline-variant/10 space-y-4 shadow-sm">
          <div className="flex items-center gap-3 text-primary mb-2">
            <Lightbulb className="w-6 h-6" />
            <h2 className="text-lg font-bold">Today's Essential Goal</h2>
          </div>
          <p className="text-on-surface-variant leading-relaxed font-medium">
            {tip.desc}
          </p>
          
          <div className="pt-4 grid grid-cols-2 gap-4 border-t border-outline-variant/10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-emerald-700" />
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Season</p>
                <p className="text-sm font-bold text-on-surface">Kharif-1</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Sprout className="w-4 h-4 text-blue-700" />
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider">Focus</p>
                <p className="text-sm font-bold text-on-surface">Optimization</p>
              </div>
            </div>
          </div>
        </section>

        {/* Detailed Guidelines */}
        <div className="space-y-6">
          <h2 className="text-xl font-headline font-bold text-on-surface px-1">Detailed Steps for Success</h2>
          
          <div className="space-y-4">
            {(tip.steps || [
              { 
                title: "Prepare the Field", 
                detail: "Ensure the soil is properly tilled and free from previous crop residues. Add 5kg of organic compost per decimal area.",
              },
              { 
                title: "Timing is Key", 
                detail: "Start your operations before 9:00 AM to avoid the peak heat of the Bangladeshi afternoon.",
              },
              { 
                title: "Monitoring", 
                detail: "Check the underside of leaves for any signs of early-stage pests. Early detection saves 40% in pesticide costs.",
              }
            ]).map((item: any, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                className="flex gap-4 group"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-2xl bg-surface-container-high border border-outline-variant/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    <Sprout className="w-5 h-5" />
                  </div>
                  {idx !== 2 && <div className="w-[1px] flex-grow bg-outline-variant/30 my-2" />}
                </div>
                <div className="pb-6">
                  <h3 className="font-bold text-on-surface mb-1">{item.title || item.step}</h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed font-medium">
                    {item.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pro Tip Highlight */}
        <section className="bg-primary/5 rounded-[2rem] p-6 border border-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-[4rem]" />
          <div className="relative flex items-start gap-4">
            <div className="bg-primary text-white p-2.5 rounded-xl shadow-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-primary text-lg">Agronomist's Pro Tip</h3>
              <p className="text-sm text-on-surface-variant font-medium leading-relaxed">
                "In Bangladeshi conditions, keeping a constant water level of 2-3 inches in Boro rice fields during the panicle initiation stage is crucial for maximum yield."
              </p>
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button className="flex-1 bg-surface-container-high text-on-surface font-bold py-4 rounded-2xl border border-outline-variant/20 flex items-center justify-center gap-2 hover:bg-surface-container transition-all">
            <Bookmark className="w-5 h-5" />
            Save Guide
          </button>
          <button className="flex-1 bg-surface-container-high text-on-surface font-bold py-4 rounded-2xl border border-outline-variant/20 flex items-center justify-center gap-2 hover:bg-surface-container transition-all">
            <Share2 className="w-5 h-5" />
            Share
          </button>
        </div>

        {/* Community Section Snippet */}
        <section className="pt-4 border-t border-outline-variant/10">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-on-surface">Related Questions</h3>
            <span className="text-xs text-primary font-bold">View Discussion</span>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-3 italic text-on-surface-variant/60 text-xs">
            <BookOpen className="w-4 h-4" />
            "How much urea should I use for BR-28 rice in this season?"
          </div>
        </section>
      </div>
    </Layout>
  );
}
