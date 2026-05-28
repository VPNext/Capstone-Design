import { useEffect, useState, Fragment, memo } from "react";

interface LoadingModalProps {
  isOpen: boolean;
  progress: number;
  status: string;
}

const getStageIcon = (progress: number) => {
  if (progress < 30) {
    // 분석 (뇌 대신 회전 톱니바퀴 SVG)
    return (
      <svg className="w-6 h-6 text-purple-600 animate-spin" style={{ animationDuration: '3s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  if (progress < 70) {
    // 시나리오 (팔레트 대신 문서 펜 SVG)
    return (
      <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    );
  }
  if (progress < 98) {
    // 이미지 생성 (반짝이 대신 이미지 갤러리 SVG)
    return (
      <svg className="w-6 h-6 text-sky-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  // 완료 (축하 이모티콘 대신 보상 뱃지 체크 SVG)
  return (
    <svg className="w-6 h-6 text-emerald-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z" />
    </svg>
  );
};

const LoadingModal = memo(function LoadingModal({
  isOpen,
  progress,
  status,
}: LoadingModalProps) {
  const [visible, setVisible] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    }
  }, [isOpen]);

  if (!visible) return null;

  const handleTransitionEnd = () => {
    if (!isOpen) {
      setVisible(false);
    }
  };

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#161311]/75 backdrop-blur-[16px] transition-opacity duration-[350ms] ease-out"
      style={{
        opacity: isOpen ? 1 : 0,
      }}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        className="relative w-full mx-4 overflow-hidden max-w-[420px] bg-white rounded-[28px] shadow-[0_32px_80px_rgba(22,19,17,0.3)]"
        style={{
          transform: isOpen
            ? "translateY(0) scale(1)"
            : "translateY(20px) scale(0.96)",
          transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px] overflow-hidden bg-[#f7f4ef]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, #7C3AED, #38BDF8)",
              transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
              boxShadow: "0 0 12px rgba(124,58,237,0.4)",
            }}
          />
        </div>

        <div className="flex flex-col items-center px-8 pt-10 pb-8 gap-6">
          {/* Circular progress */}
          <div className="relative flex items-center justify-center">
            <svg
              width="100"
              height="100"
              viewBox="0 0 100 100"
              style={{ transform: "rotate(-90deg)" }}
            >
              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="#f0ece4"
                strokeWidth="6"
              />
              {/* Progress */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#progressGradient)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  transition:
                    "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <defs>
                <linearGradient
                  id="progressGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#7C3AED" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center content */}
            <div className="absolute flex flex-col items-center gap-1">
              <div className="flex items-center justify-center shrink-0 w-6 h-6">
                {getStageIcon(progress)}
              </div>
              <span
                className="font-black tabular-nums text-[13px] text-[#161311]"
                style={{ lineHeight: 1 }}
              >
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h3
              className="font-black mb-2 text-[20px] text-[#161311]"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                letterSpacing: "-0.02em",
              }}
            >
              AI 만화 생성 중
            </h3>
            <p className="text-sm leading-relaxed min-h-[40px] flex items-center justify-center text-[#9C9891]">
              {status}
            </p>
          </div>

          {/* Stage steps */}
          <div className="w-full flex items-center justify-between gap-1">
            {[
              { label: "분석", threshold: 0 },
              { label: "시나리오", threshold: 30 },
              { label: "이미지 생성", threshold: 70 },
              { label: "완료", threshold: 98 },
            ].map((step, i) => {
              const done = progress > step.threshold;
              const active =
                i ===
                [0, 30, 70, 98].findIndex((t, idx) => {
                  const next = [30, 70, 98, 100][idx];
                  return progress >= t && progress < next;
                });
              return (
                <Fragment key={step.label}>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500"
                      style={{
                        background: done
                          ? "linear-gradient(135deg, #7C3AED, #38BDF8)"
                          : "#f0ece4",
                        boxShadow: done
                          ? "0 2px 8px rgba(124,58,237,0.3)"
                          : "none",
                      }}
                    >
                      {done ? (
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="#fff"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : (
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: active ? "#9C9891" : "#cec7bc",
                          }}
                        />
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold text-center whitespace-nowrap"
                      style={{ color: done ? "#7C3AED" : "#9C9891" }}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < 3 && (
                    <div
                      className="flex-1 h-px transition-all duration-500"
                      style={{
                        background:
                          progress > step.threshold
                            ? "linear-gradient(90deg, #7C3AED, #38BDF8)"
                            : "#e4ddd3",
                        marginBottom: "18px",
                      }}
                    />
                  )}
                </Fragment>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="text-[11px] text-center leading-relaxed text-[#cec7bc]">
            AI가 뉴스를 분석하고 이미지를 생성합니다
            <br />
            보통 30초 ~ 1분 정도 소요됩니다
          </p>
        </div>
      </div>
    </div>
  );
});

export default LoadingModal;
