import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1600);
    const t2 = setTimeout(() => setHidden(true), 2100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (hidden) return null;

  return (
    <>
      <style>{`
        @keyframes adm-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes adm-fadein {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .adm-logo  { animation: adm-pulse 1.4s ease-in-out infinite; }
        .adm-text  { animation: adm-fadein 0.6s ease 0.3s both; }
        .adm-sub   { animation: adm-fadein 0.6s ease 0.5s both; }
        .adm-by    { animation: adm-fadein 0.6s ease 0.65s both; }
        .adm-dots span {
          display: inline-block;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: rgba(255,255,255,0.6);
          margin: 0 3px;
          animation: adm-pulse 1.2s ease-in-out infinite;
        }
        .adm-dots span:nth-child(2) { animation-delay: 0.2s; }
        .adm-dots span:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "linear-gradient(145deg, #0d9488 0%, #0f766e 60%, #065f46 100%)",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: "opacity 0.5s ease",
        pointerEvents: fading ? "none" : "all",
      }}>
        <img className="adm-logo" src="/logo.png" alt="HamshiraGo" style={{
          width: 100, height: 100, borderRadius: 26,
          objectFit: "cover", marginBottom: 20,
        }} />
        <p className="adm-text" style={{
          fontSize: 28, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.5px", marginBottom: 6,
        }}>
          HamshiraGo
        </p>
        <p className="adm-sub" style={{
          fontSize: 15, color: "rgba(255,255,255,0.75)",
          fontWeight: 500, marginBottom: 4,
        }}>
          Панель администратора
        </p>
        <p className="adm-by" style={{
          fontSize: 12, color: "rgba(255,255,255,0.45)",
          fontWeight: 500, marginBottom: 36, letterSpacing: "0.02em",
        }}>
          by tezcode.ai
        </p>
        <div className="adm-dots">
          <span /><span /><span />
        </div>
      </div>
    </>
  );
}
