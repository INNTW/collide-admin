import React from "react";
import { BRAND } from "../constants/brand";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div
            style={{
              background: BRAND.glass,
              backdropFilter: BRAND.blur,
              WebkitBackdropFilter: BRAND.blur,
              border: `1px solid ${BRAND.glassBorder}`,
              borderRadius: 16,
              padding: "40px 32px",
              maxWidth: 480,
              margin: "0 auto",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>Something went wrong</div>
            <p
              style={{
                color: "rgba(224,230,255,0.6)",
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 24,
                wordBreak: "break-word",
              }}
            >
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: `1px solid ${BRAND.primary}`,
                  background: "transparent",
                  color: BRAND.primary,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: "10px 24px",
                  borderRadius: 8,
                  border: "none",
                  background: BRAND.primary,
                  color: BRAND.navy,
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
