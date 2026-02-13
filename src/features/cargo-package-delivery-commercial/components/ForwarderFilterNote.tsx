import React from 'react';

type Props = { loading: boolean };

export const ForwarderFilterNote: React.FC<Props> = ({ loading }) => {
  if (!loading) return null;
  return (
    <div className="text-xs text-slate-500 dark:text-slate-400">
      Loading forwarders for filters...
    </div>
  );
};

export default ForwarderFilterNote;
