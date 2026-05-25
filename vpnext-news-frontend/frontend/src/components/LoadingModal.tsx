import React, { useEffect, useState } from "react";

interface LoadingModalProps {
  isOpen: boolean;
  progress: number;
  status: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  progress,
  status,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
    } else {
      const t = setTimeout(() => setVisible(false), 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  if (!visible) return null;

  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const stageIcon =
    progress < 30 ? "🧠" : progress < 70 ? "🎨" : progress < 98 ? "✨" : "🎉";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: "rgba(22, 19, 17, 0.75)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        opacity: isOpen ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
    >
      <div
        className="relative w-full mx-4 overflow-hidden"
        style={{
          maxWidth: "420px",
          background: "#ffffff",
          borderRadius: "28px",
          boxShadow: "0 32px 80px rgba(22, 19, 17, 0.3)",
          transform: isOpen
            ? "translateY(0) scale(1)"
            : "translateY(20px) scale(0.96)",
          transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-[28px] overflow-hidden"
          style={{ background: "#f7f4ef" }}
        >
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
            <div className="absolute flex flex-col items-center gap-0.5">
              <span style={{ fontSize: "26px", lineHeight: 1 }}>
                {stageIcon}
              </span>
              <span
                className="font-black tabular-nums"
                style={{ fontSize: "13px", color: "#161311", lineHeight: 1 }}
              >
                {Math.round(progress)}%
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h3
              className="font-black mb-2"
              style={{
                fontFamily: "'Noto Serif KR', serif",
                fontSize: "20px",
                color: "#161311",
                letterSpacing: "-0.02em",
              }}
            >
              AI 만화 생성 중
            </h3>
            <p
              className="text-sm leading-relaxed min-h-[40px] flex items-center justify-center"
              style={{ color: "#9C9891" }}
            >
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
                <React.Fragment key={step.label}>
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
                </React.Fragment>
              );
            })}
          </div>

          {/* Footer note */}
          <p
            className="text-[11px] text-center leading-relaxed"
            style={{ color: "#cec7bc" }}
          >
            AI가 뉴스를 분석하고 이미지를 생성합니다
            <br />
            보통 30초 ~ 1분 정도 소요됩니다
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;
