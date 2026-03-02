import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Stethoscope } from "lucide-react";
import { motion } from "framer-motion";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      await adminLogin(username.trim(), password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background">
      {/* Gradient header — same as web/web-medic */}
      <div
        className="w-full flex flex-col items-center pt-16 pb-12 px-4"
        style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
      >
        <div
          className="flex h-[72px] w-[72px] items-center justify-center rounded-full mb-3"
          style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
        >
          <Stethoscope className="h-9 w-9 text-white" />
        </div>
        <h1 className="text-[26px] font-bold text-white">HamshiraGo</h1>
        <p className="text-[15px] mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
          Панель администратора
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 px-4 -mt-6 bg-background rounded-t-2xl pt-8 flex-1"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Логин</Label>
            <Input
              id="username"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              className="h-11"
              disabled={loading}
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              className={`h-11 ${error ? "border-destructive focus-visible:ring-destructive" : ""}`}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <Button
            type="submit"
            className="w-full h-11"
            disabled={!username.trim() || !password.trim() || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Вход...
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
