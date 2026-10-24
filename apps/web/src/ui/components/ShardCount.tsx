export function ShardCount({ shards }: { shards: number }) {
  return (
    <p className="text-2xl text-scrap" aria-label={`${shards} Core Shards`}>
      ◆ {shards} <span className="text-base text-steel-400">CORE SHARDS</span>
    </p>
  );
}
