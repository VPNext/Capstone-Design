import { memo } from "react";
import { SOURCE_NAME_MAP } from "../../constants/source";
import { replaceEnglishSourceNames } from "../../utils/source";

interface RedFlagsProps {
  flags: string[];
}

const RedFlags = memo(function RedFlags({ flags }: RedFlagsProps) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-[#5C5853] mb-1.5 flex items-center gap-1.5">
        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        주의 표현
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {flags.map((flag: string, i: number) => {
          let cleanFlag = flag.replace(/\[([^\]]+)\]\(https?:\/\/[^\s)]+\)/g, (_, linkText) => {
            return SOURCE_NAME_MAP[linkText.toLowerCase()] || linkText;
          });
          cleanFlag = replaceEnglishSourceNames(cleanFlag);

          return (
            <li
              key={`flag-${i}`}
              className="text-xs px-3 py-1 border bg-red-50 text-red-800 border-red-200 rounded-full font-medium"
            >
              {cleanFlag}
            </li>
          );
        })}
      </ul>
    </div>
  );
});

export default RedFlags;
