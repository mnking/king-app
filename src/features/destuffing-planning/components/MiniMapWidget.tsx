import React from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import type { DestuffingPlan } from '../types';

interface MiniMapWidgetProps {
  plans: DestuffingPlan[];
  isLoading?: boolean;
  onSelectPlan?: (planId: string) => void;
  className?: string;
  containerRef?: React.RefObject<HTMLElement>;
}

const getProgressCounts = (plan: DestuffingPlan) => {
  const total = plan.containers?.length ?? 0;
  const processed = plan.containers
    ? plan.containers.filter((container) => container.status !== 'WAITING').length
    : 0;
  return { total, processed };
};

export const MiniMapWidget: React.FC<MiniMapWidgetProps> = ({
  plans,
  isLoading = false,
  onSelectPlan,
  className,
  containerRef,
}) => {
  const hasPlans = plans.length > 0;
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [position, setPosition] = React.useState<{ x: number; y: number } | null>(null);
  const currentPositionRef = React.useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = React.useRef(false);
  const dragInfo = React.useRef<{
    pointerId: number;
    startPointer: { x: number; y: number };
    startPos: { x: number; y: number };
    containerRect: DOMRect;
    cardRect: DOMRect;
    moved: boolean;
  } | null>(null);

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const applyPosition = (pos: { x: number; y: number }) => {
    if (!cardRef.current) return;
    cardRef.current.style.left = `${pos.x}px`;
    cardRef.current.style.top = `${pos.y}px`;
    cardRef.current.style.right = 'auto';
    cardRef.current.style.bottom = 'auto';
  };

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef?.current || !cardRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const cardRect = cardRef.current.getBoundingClientRect();

    const currentPos =
      position ??
      {
        x: cardRect.left - containerRect.left,
        y: cardRect.top - containerRect.top,
      };

    currentPositionRef.current = currentPos;
    applyPosition(currentPos);

    dragInfo.current = {
      pointerId: e.pointerId,
      startPointer: { x: e.clientX, y: e.clientY },
      startPos: currentPos,
      containerRect,
      cardRect,
      moved: false,
    };

    cardRef.current.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragInfo.current) return;
    const {
      startPointer,
      startPos,
      containerRect,
      cardRect,
    } = dragInfo.current;

    const deltaX = e.clientX - startPointer.x;
    const deltaY = e.clientY - startPointer.y;

    if (!dragInfo.current.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      dragInfo.current.moved = true;
      isDraggingRef.current = true;
    }

    const maxX = Math.max(containerRect.width - cardRect.width, 0);
    const maxY = Math.max(containerRect.height - cardRect.height, 0);

    const nextX = clamp(startPos.x + deltaX, 0, maxX);
    const nextY = clamp(startPos.y + deltaY, 0, maxY);

    const nextPos = { x: nextX, y: nextY };
    currentPositionRef.current = nextPos;
    applyPosition(nextPos);
  };

  const handlePointerUp = () => {
    if (!dragInfo.current || !cardRef.current) return;
    cardRef.current.releasePointerCapture(dragInfo.current.pointerId);
    dragInfo.current = null;

    if (currentPositionRef.current) {
      setPosition(currentPositionRef.current);
    }

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  };

  const renderPosition = position ?? currentPositionRef.current;
  const positionalClasses = renderPosition
    ? `absolute ${className ?? ''}`
    : className ?? 'absolute bottom-5 left-5';
  const positionalStyle = renderPosition ? { left: `${renderPosition.x}px`, top: `${renderPosition.y}px` } : undefined;

  return (
    <div
      ref={cardRef}
      className={`z-40 w-80 text-sm ${positionalClasses}`}
      role="complementary"
      aria-label="Active destuffing plans"
      style={positionalStyle}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-lg transition-all duration-200">
        <div
          className={`flex items-center gap-2 mb-3 -mx-4 -mt-4 px-4 pt-4 pb-3 ${hasPlans ? 'bg-gray-100 dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'} rounded-t-lg cursor-grab active:cursor-grabbing select-none`}
          onPointerDown={startDrag}
        >
          <TrendingUp className={`h-5 w-5 ${hasPlans ? 'text-green-600 dark:text-green-300' : 'text-gray-400 dark:text-gray-500'}`} />
          <h3 className={`text-sm font-semibold ${hasPlans ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{hasPlans ? 'Current Execution Overview' : 'Active Plan Overview'}</h3>
          {isLoading ? <Loader2 className="ml-auto h-4 w-4 animate-spin text-gray-400 dark:text-gray-500" /> : null}
        </div>

        {!hasPlans ? (
          <>
            <div className="mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Current Execution: </span>
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500">Empty</span>
            </div>

            <div className="mb-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Progress: <span className="font-semibold">0 / 0</span> containers
              </span>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full bg-gray-300 dark:bg-gray-600 transition-all duration-300" style={{ width: '0%' }} />
            </div>
          </>
        ) : (
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
            {plans.map((plan) => {
              const { total, processed } = getProgressCounts(plan);
              const percent = total === 0 ? 0 : Math.round((processed / total) * 100);
              const isClickable = Boolean(onSelectPlan);
              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => onSelectPlan?.(plan.id)}
                  className={`w-full rounded-lg border border-transparent px-3 py-2 text-left transition ${
                    isClickable
                      ? 'hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900'
                      : ''
                  }`}
                >
                  <div className="mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Current Execution: </span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-300">{plan.code}</span>
                  </div>

                  <div className="mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Progress: <span className="font-semibold">{processed} / {total}</span> Containers
                    </span>
                  </div>

                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniMapWidget;
