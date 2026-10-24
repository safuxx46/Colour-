import { Routes, Route } from "react-router";
import { Toaster } from "sonner";
import PlayerApp from "./pages/PlayerApp";
import AdminApp from "./pages/AdminApp";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/" element={<PlayerApp />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster theme="dark" position="top-center" toastOptions={{ className: "arena-toast" }} />
    </>
  );
}
