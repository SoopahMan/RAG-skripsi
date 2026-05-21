import { Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Homepage from './pages/homepages';
import ChatbotPage from './pages/ChatbotPage';
import ExercisesPage from './pages/ExercisesPage';
import RequireAuth from './components/auth/RequireAuth';

const AppRoutes = () => (
  <Routes>
    {/* default */}
    <Route path="/" element={<Navigate to="/login" replace />} />    

    {/* public */}
    <Route path="/login" element={<LoginPage />} />

    {/* ADMIN (GURU) */}
    <Route element={<RequireAuth allowedRoles={['admin']} />}> 
      <Route path="/home-admin" element={<Homepage />} />
    </Route>

    {/* USER (SISWA) */}
    <Route element={<RequireAuth allowedRoles={['user']} />}>
      <Route path="/home-user" element={<Homepage />} />
    </Route>

    {/* Shared Features after Login */}
    <Route element={<RequireAuth allowedRoles={['admin', 'user']} />}>
      <Route path="/chatbot" element={<ChatbotPage />} />
      <Route path="/latihan" element={<ExercisesPage />} />
    </Route>
  </Routes>
);

export default AppRoutes;
