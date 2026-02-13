import React, { useState } from 'react';
import { LifecycleData, LifecycleStage } from '@/features/containers/utils/lifecycleUtils';
import { formatDateTimeForDisplay } from '@/features/containers/utils/format-date';

interface ContainerStatusDiagramProps {
  lifecycleData: LifecycleData;
  isLoading?: boolean;
}

const getCardStyles = (stage: LifecycleStage) => {
  if (stage.isCurrent) {
    return {
      border: 'border-emerald-500',
      background: 'bg-emerald-50',
      text: 'text-emerald-900',
      darkBorder: 'dark:border-emerald-400',
      darkBackground: 'dark:bg-emerald-900/30',
      darkText: 'dark:text-emerald-50',
      badge: {
        background: 'bg-emerald-500',
        label: 'Current',
      },
    };
  }

  // Completed / Passed stages
  return {
    border: 'border-gray-200',
    background: 'bg-gray-50',
    text: 'text-gray-500',
    darkBorder: 'dark:border-gray-700',
    darkBackground: 'dark:bg-gray-800',
    darkText: 'dark:text-gray-400',
    badge: {
      background: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      label: 'Passed',
    },
  };
};

const ContainerStatusDiagram: React.FC<ContainerStatusDiagramProps> = ({
  lifecycleData,
  isLoading,
}) => {
  const [collapsedStages, setCollapsedStages] = useState<Set<string>>(new Set());

  if (isLoading) {
    return <div className="text-sm text-gray-500 animate-pulse">Loading lifecycle diagram...</div>;
  }

  if (!lifecycleData || lifecycleData.stages.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No lifecycle stages to display
      </div>
    );
  }

  const toggleCollapse = (status: string) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
        <span>Lifecycle Flow</span>
        {lifecycleData.transitions.some(t => t.isBackward) && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            ⚠ Return Flow
          </span>
        )}
      </div>

      <div className="flex items-start gap-4 overflow-x-auto pb-4">
        {lifecycleData.stages.map((stage, index) => {
          const nextStage = lifecycleData.stages[index + 1];
          const styles = getCardStyles(stage);
          const cardClasses = `${styles.border} ${styles.background} ${styles.text} ${styles.darkBorder} ${styles.darkBackground} ${styles.darkText}`;

          // Find transitions
          const forwardTransition = nextStage
            ? lifecycleData.transitions.find(t => t.fromStatus === stage.status && t.toStatus === nextStage.status && !t.isBackward)
            : null;

          const backwardTransition = nextStage
            ? lifecycleData.transitions.find(t => t.fromStatus === nextStage.status && t.toStatus === stage.status && t.isBackward)
            : null;

          const isCollapsed = collapsedStages.has(stage.status);

          return (
            <React.Fragment key={stage.status}>
              <div className="flex flex-col gap-2">
                <div className={`flex w-[280px] shrink-0 flex-col gap-2 rounded-2xl border-2 px-5 py-4 shadow-lg transition-all ${cardClasses}`}>

                  {/* Header */}
                  <div className="flex flex-col gap-1 border-b pb-2 border-gray-300 dark:border-gray-600">
                    <div className="text-base font-bold text-center">{stage.label}</div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {stage.isCurrent ? (
                        <div className={`rounded-full ${styles.badge.background} px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white`}>
                          {styles.badge.label}
                        </div>
                      ) : (
                        <div className={`rounded-full ${styles.badge.background} px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide`}>
                          {styles.badge.label}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {stage.transactions.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => toggleCollapse(stage.status)}
                        className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide opacity-70 hover:opacity-100 cursor-pointer transition-opacity"
                      >
                        <span>Actions ({stage.transactions.length})</span>
                        <svg
                          className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {!isCollapsed && (
                        <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
                          {stage.transactions.map((txn, tIdx) => (
                            <div key={txn.id || tIdx} className="flex flex-col gap-1 rounded-lg px-3 py-2 text-left border bg-white/50 border-gray-300 dark:bg-gray-800/50 dark:border-gray-600">
                              <div className="flex items-start justify-between gap-2">
                                <div className="text-[11px] font-semibold break-words">
                                  {txn.eventType || 'Unknown Event'}
                                </div>
                                <div className="text-[10px] opacity-70 text-right leading-tight min-w-[80px]">
                                  {formatDateTimeForDisplay(txn.timestamp || txn.createdAt)}
                                </div>
                              </div>

                              <div className="mt-1 flex flex-col gap-1 overflow-hidden">
                                {txn.cargoLoading && (
                                  <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={`Cargo: ${txn.cargoLoading}`}>
                                    <span className="font-medium text-gray-500 dark:text-gray-500">Cargo:</span> {txn.cargoLoading}
                                  </div>
                                )}
                                {txn.condition && (
                                  <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={`Cond: ${txn.condition}`}>
                                    <span className="font-medium text-gray-500 dark:text-gray-500">Cond:</span> {txn.condition}
                                  </div>
                                )}
                                {txn.customsStatus && (
                                  <div className="text-[10px] text-gray-600 dark:text-gray-400 truncate" title={`Customs: ${txn.customsStatus}`}>
                                    <span className="font-medium text-gray-500 dark:text-gray-500">Customs:</span> {txn.customsStatus}
                                  </div>
                                )}
                                {txn.sealNumber && (
                                  <div className="text-[10px] text-gray-600 dark:text-gray-400 break-all" title={`Seal: ${txn.sealNumber}`}>
                                    <span className="font-medium text-gray-500 dark:text-gray-500">Seal:</span> <span className="font-mono">{txn.sealNumber}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-center opacity-50 py-2">No actions</div>
                  )}

                </div>
              </div>

              {/* Arrows */}
              {nextStage && (forwardTransition || backwardTransition) && (
                <div className="flex flex-col items-center justify-center gap-2 pt-8">
                  {forwardTransition && (
                    <div className="flex flex-col items-center gap-1 text-blue-500 dark:text-blue-400">
                      <svg width="40" height="20">
                        <defs>
                          {/* Standard Right-Pointing Arrow */}
                          <marker id={`arrow-fwd-${index}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                          </marker>
                        </defs>
                        <line x1="0" y1="10" x2="35" y2="10" stroke="currentColor" strokeWidth="2" markerEnd={`url(#arrow-fwd-${index})`} />
                      </svg>
                      {!['CONTAINER_SEALED', 'CONTAINER_UNSEALED'].includes(forwardTransition.eventType) && (
                        <div className="text-[9px] font-medium">{forwardTransition.eventType}</div>
                      )}
                    </div>
                  )}
                  {backwardTransition && (
                    <div className="flex flex-col items-center gap-1 text-red-500 dark:text-red-400">
                      <svg width="40" height="20">
                        <defs>
                          {/* Standard Right-Pointing Arrow (Line direction will rotate it 180deg to point Left) */}
                          <marker id={`arrow-back-${index}`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                          </marker>
                        </defs>
                        {/* Line drawn from Right (35) to Left (5) */}
                        <line x1="35" y1="10" x2="5" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 2" markerEnd={`url(#arrow-back-${index})`} />
                      </svg>
                      {!['CONTAINER_SEALED', 'CONTAINER_UNSEALED'].includes(backwardTransition.eventType) && (
                        <div className="text-[9px] font-medium">{backwardTransition.eventType}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default ContainerStatusDiagram;
