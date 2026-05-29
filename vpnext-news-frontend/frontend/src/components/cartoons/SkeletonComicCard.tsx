export default function SkeletonComicCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-[#E4DDD3] shadow-[0_6px_32px_rgba(22,19,17,0.08)]">
      <div className="bg-[#141210] p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-6 w-16 rounded-full bg-white/8 animate-pulse" />
          <div className="h-4 w-24 rounded bg-white/6 animate-pulse" />
        </div>
        <div className="h-7 w-full rounded mb-2.5 bg-white/7 animate-pulse" />
        <div className="h-7 w-4/5 rounded mb-4 bg-white/5 animate-pulse" />
        <div className="h-4 w-full rounded mb-1.5 bg-white/4 animate-pulse" />
        <div className="h-4 w-2/3 rounded mb-5 bg-white/4 animate-pulse" />
        <div className="h-9 w-32 rounded-full bg-white/7 animate-pulse" />
      </div>
      <div className="h-[400px] bg-neutral-900 animate-pulse" />
      <div className="h-[46px] bg-[#F7F4EF]" />
    </div>
  );
}
