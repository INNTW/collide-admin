import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Input, Btn } from "../components";
import { BRAND } from "../constants/brand";

const LoginPage = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex items-center justify-center p-4"
      style={{ background: BRAND.gradient, height: "100dvh", minHeight: "-webkit-fill-available" }}
    >
      <div
        className="w-full max-w-md p-8 rounded-2xl"
        style={{
          background: BRAND.glass,
          border: `1px solid ${BRAND.glassBorder}`,
          backdropFilter: BRAND.blur,
        }}
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: BRAND.primary }}>
            Collide
          </h1>
          <p className="text-sm" style={{ color: "rgba(224,230,255,0.7)" }}>
            Staff Manager v5.0
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            error={error ? "Invalid credentials" : ""}
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && (
            <div className="p-3 rounded-lg text-sm" style={{ background: "rgba(244,67,54,0.2)", color: BRAND.danger }}>
              {error}
            </div>
          )}

          <Btn
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Logging in..." : "Login"}
          </Btn>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
