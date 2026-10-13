import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/Button';

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
      <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft className="h-4 w-4" /> Prev
      </Button>
      <span className="meta">
        {page} / {pages}
      </span>
      <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
