import { memo } from "react";

function NewsPortalSkeleton() {
  return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
        <div className="flex flex-col md:flex-row md:h-[360px]">
          <div className="flex-1 min-h-[220px] shimmer bg-[#F0F0F0]" />
          <div className="md:w-[300px] border-t md:border-t-0 md:border-l border-[#EFEFEF] divide-y divide-[#EFEFEF]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 p-3">
                <div className="w-[72px] h-[52px] shimmer rounded" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 shimmer rounded w-full" />
                  <div className="h-3.5 shimmer rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-6 h-5 shimmer rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 shimmer rounded w-full" />
              <div className="h-3 shimmer rounded w-1/3" />
            </div>
            <div className="w-[88px] h-[60px] shimmer rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(NewsPortalSkeleton);
