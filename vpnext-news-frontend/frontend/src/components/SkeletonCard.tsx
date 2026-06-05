

interface SkeletonCardProps {
  featured?: boolean;
  isAnalyzed?: boolean;
}

export default function SkeletonCard({ featured = false, isAnalyzed = false }: SkeletonCardProps) {
  return (
    <div
      className="bg-white overflow-hidden"
      style={{
        border: "1px solid #E4DDD3",
        borderRadius: "20px",
        boxShadow: "0 1px 8px rgba(22,19,17,0.05)",
      }}
    >
      {featured ? (
        <>
          <div className="shimmer h-72 w-full" />
          <div className="p-6 flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="shimmer h-5 w-14 rounded-full" />
              <div className="shimmer h-5 w-20 rounded-full" />
              {isAnalyzed && <div className="shimmer h-5 w-16 rounded-full" />}
            </div>
            <div className="shimmer h-7 w-full rounded-lg" />
            <div className={isAnalyzed ? "shimmer h-7 w-4/5 rounded-lg" : "shimmer h-7 w-5/6 rounded-lg"} />
            <div className="shimmer h-4 w-full rounded" />
            <div className="shimmer h-4 w-3/4 rounded" />
          </div>
        </>
      ) : (
        <div className="flex">
          {isAnalyzed && <div className="w-1 shrink-0 shimmer" />}
          <div className="flex-1 p-5 flex flex-col gap-2.5">
            <div className="flex gap-2">
              <div className="shimmer h-5 w-12 rounded-full" />
              <div className="shimmer h-5 w-16 rounded-full" />
              {isAnalyzed && <div className="shimmer h-5 w-14 rounded-full" />}
            </div>
            <div className="shimmer h-5 w-full rounded-lg" />
            <div className="shimmer h-5 w-4/5 rounded-lg" />
            <div className="shimmer h-3.5 w-full rounded mt-1" />
            <div className="shimmer h-3.5 w-2/3 rounded" />
          </div>
          <div className="shimmer shrink-0 w-28 sm:w-36 aspect-[4/3]" />
        </div>
      )}
    </div>
  );
}
