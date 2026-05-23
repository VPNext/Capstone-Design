import React from 'react';

interface LoadingModalProps {
  isOpen: boolean;
  progress: number;
  status: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, progress, status }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md">
      <div className="w-full max-w-md p-8 bg-white/90 rounded-3xl shadow-2xl border border-white/20 transform transition-all">
        <div className="flex flex-col items-center">
          {/* Animated Icon or Spinner */}
          <div className="mb-6 relative">
            <div className="w-20 h-20 border-4 border-slate-100 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-blue-500 font-bold">
              {Math.round(progress)}%
            </div>
          </div>

          <h3 className="text-xl font-bold text-slate-800 mb-2">만화 생성 중</h3>
          <p className="text-slate-500 text-center mb-8 h-6">{status}</p>

          {/* Progress Bar Container */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="w-full flex justify-between text-xs text-slate-400 font-medium">
            <span>시작</span>
            <span>완료</span>
          </div>

          <div className="mt-8 text-xs text-slate-400 text-center leading-relaxed">
            AI가 뉴스를 분석하고 이미지를 생성하는 데 <br />
            보통 30초에서 1분 정도 소요됩니다.
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingModal;
