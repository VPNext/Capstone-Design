import { useParams } from "react-router-dom";
import { useState } from "react";

// 분석 상태를 관리하기 위한 임시 타입
type AnalysisStatus = "pending" | "analyzing" | "complete";

export default function DetailPage() {
  const { id } = useParams();

  // 분석 상태 관리 (나중에 API 연결 시 활용)
  const [status, setStatus] = useState<AnalysisStatus>("pending");

  const startAnalysis = () => {
    setStatus("analyzing");
    // 나중에 여기에 POST /api/analyze 호출 코드가 들어갑니다.
    // 임시로 1.5초 뒤에 완료된 것처럼 변경
    setTimeout(() => setStatus("complete"), 1500);
  };

  // 분석 결과 컴포넌트 (반복되는 카드 디자인을 함수로 분리)
  const AnalysisCard = ({
    icon,
    title,
    bg,
    border,
    textColor,
    children,
  }: any) => (
    <div
      className={`${bg} ${border} p-6 rounded-2xl border flex flex-col gap-3 shadow-sm`}
    >
      <h3
        className={`font-bold ${textColor} text-sm flex items-center gap-2 tracking-tight`}
      >
        {icon}
        {title}
      </h3>
      {status === "complete" ? (
        children
      ) : (
        <p className={`text-sm ${textColor} opacity-60`}>분석 대기 중...</p>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-10">
      {/* 왼쪽: 기사 원본 영역 - 가독성을 최대로 높임 */}
      <div className="flex-1 bg-white p-10 rounded-3xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-950 mb-4 tracking-tighter leading-tight">
          [경제 브리핑] {id}번 뉴스의 기사 제목입니다 (나중에 백엔드 데이터로
          교체됨)
        </h1>
        <div className="text-sm text-slate-500 mb-10 border-b border-slate-100 pb-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span>발행일: 2026. 04. 14 10:30</span>
            <span className="text-slate-300">|</span>
            <span>매일 경제</span>
          </div>
          <a
            href="#"
            className="text-sky-600 font-semibold hover:underline text-sm flex items-center gap-1.5"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2zm0 6a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2zm-6-6a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2zm0 6a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2zM3 18.75V8.25A2.25 2.25 0 0 1 5.25 6h13.5A2.25 2.25 0 0 1 21 8.25v10.5A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75z"
              />
            </svg>
            원문 링크
          </a>
        </div>
        <div className="text-slate-800 leading-relaxed text-[16px] space-y-5 mb-12 font-medium">
          <p>
            여기에 뉴스 기사의 전체 본문이 출력됩니다. 백엔드의 BeautifulSoup
            패키지로 스크래핑한 기사 전문 텍스트가 들어갈 자리입니다.
          </p>
          <p>
            예를 들어, 자율주행 택시 서비스가 시범 운행을 시작했다는 내용의
            기사라면, 기사의 세부 내용, 운행 지역, 요금, 시민들의 반응 등이
            상세히 서술될 것입니다.
          </p>
          <p>
            프론트엔드에서는 이 텍스트를 읽기 편하게 배치하는 것이 핵심입니다.
            줄 간격을 넉넉히 하고 문단을 나누어 가독성을 확보했습니다.
          </p>
        </div>

        {/* 분석 버튼 - 더 강력한 그라데이션과 로딩 상태 추가 */}
        <button
          onClick={startAnalysis}
          disabled={status !== "pending"}
          className={`w-full bg-gradient-to-r ${status === "analyzing" ? "from-slate-400 to-slate-500" : "from-sky-500 to-purple-600 hover:from-sky-600 hover:to-purple-700"} text-white font-bold py-4.5 rounded-2xl transition shadow-lg flex items-center justify-center gap-3 disabled:opacity-70`}
        >
          {status === "analyzing" ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              AI 분석 실행 중...
            </>
          ) : status === "complete" ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m4.5 12.75 6 6 9-13.5"
                />
              </svg>
              분석 완료 (아래 결과를 확인하세요)
            </>
          ) : (
            <>✨ Gemini AI 전체 분석 실행하기</>
          )}
        </button>
      </div>

      {/* 오른쪽: AI 분석 결과 영역 - 더 깔끔한 카드 디자인과 그라데이션 배경 적용 */}
      <div className="w-full md:w-[360px] flex flex-col gap-5">
        {/* 허위뉴스 신뢰도 패널 - 빨간색 기반 */}
        <AnalysisCard
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          }
          title="허위뉴스 위험도 분석"
          bg="bg-red-50/50"
          border="border-red-100"
          textColor="text-red-900"
        >
          <div className="text-4xl font-extrabold text-red-600">85%</div>
          <p className="text-xs text-red-700 leading-normal mt-1">
            이슈 대응: 자극적인 제목과 본문의 불일치가 발견되었습니다. 정보 수용
            시 주의가 필요합니다.
          </p>
        </AnalysisCard>

        {/* 어려운 용어 풀이 패널 - 파란색 기반 */}
        <AnalysisCard
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
              />
            </svg>
          }
          title="어려운 용어 풀이 (국립국어원)"
          bg="bg-sky-50/50"
          border="border-sky-100"
          textColor="text-sky-900"
        >
          <ul className="text-[13px] text-sky-950 space-y-3.5 leading-relaxed">
            <li>
              <strong className="block text-sky-800">온디바이스 AI</strong> 기기
              자체에서 AI 모델을...
            </li>
            <li>
              <strong className="block text-sky-800">할루시네이션</strong>{" "}
              인공지능이 사실과 다른...
            </li>
          </ul>
        </AnalysisCard>

        {/* 핵심 인물 프로필 패널 - 에메랄드색 기반 */}
        <AnalysisCard
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          }
          title="핵심 인물 프로필"
          bg="bg-emerald-50/50"
          border="border-emerald-100"
          textColor="text-emerald-900"
        >
          <p className="text-[13px] text-emerald-950 leading-relaxed font-medium">
            <strong className="text-emerald-800">이순신:</strong> 구글 클라우드
            아시아 태평양 부사장...
          </p>
        </AnalysisCard>
      </div>
    </div>
  );
}
