import { Route, Routes, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import Homepage from './pages/homepages'
import RequireAuth from './components/auth/RequireAuth'
// import UnauthorizedPage from './pages/Unauthorized'

const AppRoutes = () => (
  <Routes>
    
    {/* default */}
    <Route path="/" element={<Navigate to="/login" replace />} />    

    {/* public */}
    <Route path="/login" element={<LoginPage />} />

    {/* ADMIN */}
    <Route element={<RequireAuth allowedRoles={['admin']} />}> 
      <Route path="/home-admin" element={<Homepage />} />
    </Route>

    {/* USER */}
    <Route element={<RequireAuth allowedRoles={['user']} />}>
      <Route path="/home-user" element={<Homepage />} />
    </Route>


  </Routes>
)

export default AppRoutes