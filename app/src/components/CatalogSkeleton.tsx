export function CatalogSkeleton() {
  return (
    <div role="status" aria-label="กำลังโหลดสินค้า" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      <span className="sr-only">กำลังโหลดสินค้า…</span>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} aria-hidden="true" className="overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="skeleton aspect-square" />
          <div className="space-y-3 p-4">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-6 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
