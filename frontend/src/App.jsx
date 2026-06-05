import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ToastProvider } from "./components/Toast";
import AppRoutes from "./routes/AppRoutes";
import "./styles/variables.css";
import "./styles/global.css";

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
