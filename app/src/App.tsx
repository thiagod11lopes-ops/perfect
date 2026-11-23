import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CoinsDisplayProvider } from './components/CoinsDisplay'
import { Layout } from './components/Layout'
import { MobileLayout } from './components/MobileLayout'
import { PhoneShell } from './components/PhoneShell'
import { Admin } from './pages/Admin'
import { Diet } from './pages/Diet'
import { Features } from './pages/Features'
import { Home } from './pages/Home'
import { Mission } from './pages/Mission'
import { More } from './pages/More'
import { Onboarding } from './pages/Onboarding'
import { Progress } from './pages/Progress'
import { Workout } from './pages/Workout'
import { AppProvider, useApp } from './store/AppContext'
import { routerBasename } from './utils/publicUrl'

function useBase() {
  const { pathname } = useLocation()
  return pathname.startsWith('/celular') ? '/celular' : ''
}

function Guard({ children }: { children: React.ReactNode }) {
  const { state } = useApp()
  const base = useBase()
  if (!state.onboardingComplete) {
    return <Navigate to={`${base}/onboarding` || '/onboarding'} replace />
  }
  return children
}

function AppRoutes() {
  const { state } = useApp()
  const base = useBase()
  const home = base || '/'

  const appPages = (
    <>
      <Route index element={<Home />} />
      <Route path="dieta" element={<Diet />} />
      <Route path="treino" element={<Workout />} />
      <Route path="missao" element={<Mission />} />
      <Route path="progresso" element={<Progress />} />
      <Route path="mais" element={<More />} />
    </>
  )

  return (
    <Routes>
      {/* Painel admin — fora do onboarding / layout do app */}
      <Route path="/adm" element={<Admin />} />

      {/* Desktop */}
      <Route path="/funcionalidades" element={<Features />} />
      <Route
        path="/onboarding"
        element={state.onboardingComplete ? <Navigate to="/" replace /> : <Onboarding />}
      />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/dieta" element={<Diet />} />
        <Route path="/treino" element={<Workout />} />
        <Route path="/missao" element={<Mission />} />
        <Route path="/progresso" element={<Progress />} />
        <Route path="/mais" element={<More />} />
      </Route>

      {/* Celular (URL separada + moldura no desktop) */}
      <Route path="/celular" element={<PhoneShell />}>
        <Route path="funcionalidades" element={<Features />} />
        <Route
          path="onboarding"
          element={
            state.onboardingComplete ? <Navigate to="/celular" replace /> : <Onboarding />
          }
        />
        <Route
          element={
            <Guard>
              <MobileLayout />
            </Guard>
          }
        >
          {appPages}
        </Route>
      </Route>

      <Route
        path="*"
        element={<Navigate to={home === '/' ? '/' : home} replace />}
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename={routerBasename()}>
        <CoinsDisplayProvider>
          <AppRoutes />
        </CoinsDisplayProvider>
      </BrowserRouter>
    </AppProvider>
  )
}
