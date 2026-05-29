import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0E0C0A] text-white font-sans">
          <div className="max-w-md p-8 rounded-[28px] bg-white/5 border border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.5)]">
            <span className="text-5xl block mb-5">⚠️</span>
            <h2 className="text-xl font-bold mb-3 font-serif text-[#FBBF24]">
              페이지 로드 중 오류가 발생했습니다
            </h2>
            <p className="text-sm text-white/40 mb-6 leading-relaxed font-sans">
              일시적인 네트워크 지연이나 예상치 못한 오류일 수 있습니다. 아래 버튼을 눌러 다시 시도해 주세요.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-full bg-[#FBBF24] text-[#141210] font-black text-sm transition-all hover:bg-[#F59E0B] hover:-translate-y-[1px]"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
