import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from './components/AppLayout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { modules } from './modules/registry.js';
import { AccountPage } from './pages/AccountPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/connexion" element={<LoginPage />} />

          {/* Tout ce qui suit exige une session valide. */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/compte" element={<AccountPage />} />

              {/* Les routes des modules sont générées depuis le registre :
                  déposer un dossier dans src/modules/ suffit à l'ajouter. */}
              {modules.map(({ id, path, Component }) => (
                <Route key={id} path={path} element={<Component />} />
              ))}
            </Route>
          </Route>

          {/* URL inconnue : retour à l'accueil plutôt qu'une page blanche. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
