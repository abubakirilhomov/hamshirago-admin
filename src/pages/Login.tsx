import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/LanguageContext";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoading(true);
    setError("");

    try {
      await adminLogin(username.trim(), password);
      navigate("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg === "TOO_MANY_REQUESTS" ? t("login.tooManyAttempts") : msg || t("login.errorServer"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-start bg-background">
      {/* Gradient header */}
      <div
        className="w-full flex flex-col items-center pt-16 pb-12 px-4"
        style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }}
      >
        <img
          src="/logo.png"
          alt="HamshiraGo"
          className="mb-3"
          style={{ width: 72, height: 72, borderRadius: 18, objectFit: "cover" }}
        />
        <h1 className="text-[26px] font-bold text-white">HamshiraGo</h1>
        <p className="text-[15px] mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
          {t("login.title")}
        </p>

        {/* Language switcher */}
        <div className="flex gap-2 mt-4">
          {(["ru", "uz"] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              style={{
                padding: "4px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.4)",
                background: language === lang ? "rgba(255,255,255,0.25)" : "transparent",
                color: "#fff",
                fontSize: 13,
                fontWeight: language === lang ? 700 : 500,
                cursor: "pointer",
              }}
            >
              {lang === "ru" ? "RU" : "UZ"}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8 px-4 -mt-6 bg-background rounded-t-2xl pt-8 flex-1"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">{t("login.username")}</Label>
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
            <Label htmlFor="password">{t("login.password")}</Label>
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
                {t("login.loggingIn") ?? "..."}
              </>
            ) : (
              t("login.submit")
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
