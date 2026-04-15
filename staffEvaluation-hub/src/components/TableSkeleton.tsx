import { Skeleton } from '@/components/ui/skeleton';
import { TableCell, TableRow } from '@/components/ui/table';

type Props = {
    rows?: number;
    columns: number;
    /** Optional per-column className (width/align) — falls back to full-width bar. */
    columnWidths?: (string | undefined)[];
};

// FE-7: shared shimmer rows for list pages. Mirrors the final row shape
// so the page layout doesn't shift when data arrives.
export function TableSkeleton({ rows = 6, columns, columnWidths }: Props) {
    return (
        <>
            {Array.from({ length: rows }).map((_, r) => (
                <TableRow key={r} aria-hidden="true">
                    {Array.from({ length: columns }).map((__, c) => (
                        <TableCell key={c}>
                            <Skeleton className={`h-4 ${columnWidths?.[c] ?? 'w-full'}`} />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}
