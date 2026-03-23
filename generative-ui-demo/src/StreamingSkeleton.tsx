export function StreamingSkeleton() {
  return (
    <div className="streaming-skeleton">
      <div className="sk-block" style={{ height: 18, width: "42%" }} />
      <div className="sk-block" style={{ height: 80 }} />
      <div className="sk-block" style={{ height: 12, width: "72%" }} />
    </div>
  );
}
