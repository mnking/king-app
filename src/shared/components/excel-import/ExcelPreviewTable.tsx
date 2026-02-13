import { useMemo } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { CellValidationError, ExcelColumnMapping, ParsedRow } from '@/shared/schemas/excel-import';

type RowModel<T> = {
  _rowNumber: number;
  _raw: unknown[];
  data: T;
};

export function ExcelPreviewTable<T extends Record<string, unknown>>(props: {
  columns: ExcelColumnMapping[];
  rows: Array<ParsedRow<T>>;
  errors: CellValidationError[];
}) {
  const { columns, rows, errors } = props;

  const errorByCell = useMemo(() => {
    const map = new Map<string, CellValidationError[]>();
    for (const e of errors) {
      const key = `${e.rowNumber}:${e.colIndex}`;
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [errors]);

  const columnHelper = createColumnHelper<RowModel<T>>();

  const tableColumns = useMemo(() => {
    return [
      columnHelper.display({
        id: 'rowNumber',
        header: '#',
        cell: (info) => info.row.original._rowNumber,
        size: 60,
      }),
      ...columns.map((c) =>
        columnHelper.display({
          id: c.key,
          header: c.label,
          cell: (info) => {
            const row = info.row.original;
            const value = row.data[c.key];
            const cellErrors = errorByCell.get(`${row._rowNumber}:${c.colIndex}`) ?? [];
            const hasError = cellErrors.length > 0;

            const display = value === undefined || value === null ? '' : String(value);
            const title = hasError ? cellErrors.map((e) => e.message).join(', ') : display;

            return (
              <span className={hasError ? 'text-red-600 font-medium' : ''} title={title}>
                {display}
              </span>
            );
          },
        }),
      ),
    ];
  }, [columnHelper, columns, errorByCell]);

  const data = useMemo(() => {
    return rows.map((r) => ({
      _rowNumber: r.rowNumber,
      _raw: r.raw,
      data: r.data,
    }));
  }, [rows]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-lg border border-slate-200 overflow-hidden dark:border-slate-700">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 sticky top-0 dark:bg-slate-800">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="px-3 py-2 text-left font-medium text-slate-700 border-b dark:text-slate-300 dark:border-slate-600"
                    style={{ width: h.getSize() }}
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {table.getRowModel().rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-2 text-slate-900 dark:text-slate-100">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="p-8 text-center text-slate-500 dark:text-slate-400">No data to display</div>
      )}
    </div>
  );
}

export default ExcelPreviewTable;
