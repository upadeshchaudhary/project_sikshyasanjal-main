// frontend/src/pages/GoogleCallbackPage.jsx
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import toast from "react-hot-toast";

export default function GoogleCallbackPage() {
  const [params]  = useSearchParams();
  const { login } = useApp();
  const navigate  = useNavigate();

  useEffect(() => {
    const payload = params.get("payload");
    const error   = params.get("error");

    if (error) {
      const messages = {
        google_denied:    "Google sign-in was cancelled.",
        user_not_found:   "Your Google account is not registered at this school.",
        school_not_found: "School not found. Try logging in again.",
        account_disabled: "Your account has been disabled. Contact the administrator.",
        google_failed:    "Google sign-in failed. Please try again.",
      };
      toast.error(messages[error] || "Sign-in failed.");
      navigate("/");
      return;
    }

    if (!payload) {
      toast.error("Invalid callback. Please try again.");
      navigate("/");
      return;
    }

    try {
      const { token, user, school } = JSON.parse(atob(payload));
      login(token, user, school);
      toast.success(`Welcome, ${user.name}!`);
      navigate("/dashboard");
    } catch {
      toast.error("Failed to complete sign-in. Please try again.");
      navigate("/");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="auth-loading-screen">
      <div className="auth-spinner" />
      <p style={{ marginTop: 16, fontSize: 13, color: "var(--text-2)" }}>
        Completing sign-in…
      </p>
    </div>
  );
}