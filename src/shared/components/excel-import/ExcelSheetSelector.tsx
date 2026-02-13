export function ExcelSheetSelector(props: {
  sheetNames: string[];
  value: string;
  onChange: (sheetName: string) => void;
}) {
  const { sheetNames, value, onChange } = props;

  return (
    <div>
      <select
        id="excel-sheet"
        aria-label="Sheet"
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {sheetNames.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default ExcelSheetSelector;
