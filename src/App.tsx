import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './AppContext';
import Splash from './screens/Splash';
import Login from './screens/Login';
import Signup from './screens/Signup';
import Dashboard from './screens/Dashboard';
import FieldMapper from './screens/FieldMapper';
import CropRecommendation from './screens/CropRecommendation';
import DiseaseDetection from './screens/DiseaseDetection';
import KnowledgeCenter from './screens/KnowledgeCenter';
import Profile from './screens/Profile';
import { AnimatePresence } from 'motion/react';

export default function App() {
  return (
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
            <Route path="/tools/scan" element={<DiseaseDetection />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </AppProvider>
  );
}
