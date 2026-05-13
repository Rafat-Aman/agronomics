import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './AppContext';
import { AuthProvider } from './AuthContext';
import Splash from './screens/Splash';
import Login from './screens/Login';
import Signup from './screens/Signup';
import Dashboard from './screens/Dashboard';
import FieldMapper from './screens/FieldMapper';
import CropRecommendation from './screens/CropRecommendation';
import DiseaseDetection from './screens/DiseaseDetection';
import CropRoadmap from './screens/CropRoadmap';
import KnowledgeCenter from './screens/KnowledgeCenter';
import Profile from './screens/Profile';
import MyCrops from './screens/MyCrops';
import CropDetail from './screens/CropDetail';
import VoiceAssistant from './screens/VoiceAssistant';
import WeatherForecast from './screens/WeatherForecast';
import GuideDetail from './screens/GuideDetail';
import IrrigationAdvisor from './screens/IrrigationAdvisor';
import { AnimatePresence } from 'motion/react';

export default function App() {
  return (
    <AuthProvider>
    <AppProvider>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/fields" element={<FieldMapper />} />
            <Route path="/tools" element={<KnowledgeCenter />} />
            <Route path="/tools/crops" element={<CropRecommendation />} />
            <Route path="/tools/crops/roadmap" element={<CropRoadmap />} />
            <Route path="/tools/scan" element={<DiseaseDetection />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-crops" element={<MyCrops />} />
            <Route path="/my-crops/:cropId" element={<CropDetail />} />
            <Route path="/voice" element={<VoiceAssistant />} />
            <Route path="/weather" element={<WeatherForecast />} />
            <Route path="/irrigation" element={<IrrigationAdvisor />} />
            <Route path="/guide" element={<GuideDetail />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </AppProvider>
    </AuthProvider>
  );
}
