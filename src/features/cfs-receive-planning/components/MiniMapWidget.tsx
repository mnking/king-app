import { TrendingUp } from 'lucide-react';
import React from 'react';
import { useInProgressPlan } from '@/shared/features/plan/hooks/use-in-progress-plan-query';

interface MiniMapWidgetProps {
  onOpenModal: () => void;
  containerRef?: React.RefObject<HTMLElement>;
}

/**
 * MiniMapWidget - Display-only progress widget for IN_PROGRESS plan
 *
 * - Always visible (shows empty state when no IN_PROGRESS plan)
 * - Default position: bottom-left corner of workspace
 * - Draggable within the workspace container
 * - Click to open ActivePlanModal showing full plan details (only when plan exists)
 * - Polls every 10 minutes to check if plan still exists
 *
 * Reference: /home/hungvd/Pictures/Screenshots/Screenshot From 2025-10-17 16-20-19.png
 */
export function MiniMapWidget({ onOpenModal, containerRef }: MiniMapWidgetProps) {
  const { data: inProgressPlan, isLoading } = useInProgressPlan();
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

    // Initialize position on first interaction so subsequent drags use top/left
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

    // Clear dragging flag after click event completes
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  };

  const renderPosition = position ?? currentPositionRef.current;
  const positionalClasses = renderPosition ? 'absolute' : 'absolute bottom-5 left-5';
  const positionalStyle = renderPosition ? { left: `${renderPosition.x}px`, top: `${renderPosition.y}px` } : undefined;

  const handleCardClick = () => {
    if (isDraggingRef.current || !inProgressPlan) return;
    onOpenModal();
  };

  // Show loading placeholder while fetching
  if (isLoading) {
    return (
      <div
        ref={cardRef}
        className={`${positionalClasses} z-40 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg animate-pulse`}
        style={positionalStyle}
        onPointerDown={startDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  // Calculate progress metrics
  const totalContainers = inProgressPlan?.containers.length ?? 0;
  const processedCount =
    inProgressPlan?.containers.filter(c => c.status === 'RECEIVED' || c.status === 'REJECTED').length ?? 0;
  const progressPercentage = totalContainers > 0 ? (processedCount / totalContainers) * 100 : 0;

  // Empty state when no IN_PROGRESS plan exists
  if (!inProgressPlan) {
    return (
      <div
        ref={cardRef}
        className={`${positionalClasses} z-40 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300`}
        style={positionalStyle}
        onPointerDown={startDrag}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        aria-label="Active plan overview (no in-progress plan)"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 -mx-4 -mt-4 px-4 pt-4 pb-3 bg-gray-50 dark:bg-gray-700 rounded-t-lg cursor-grab active:cursor-grabbing select-none">
          <TrendingUp className="h-5 w-5 text-gray-400 dark:text-gray-300" />
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-200">Active Plan Overview</h3>
        </div>

        {/* Empty State */}
        <div className="mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Current Execution: </span>
          <span className="text-sm font-medium text-gray-400 dark:text-gray-300">Empty</span>
        </div>

        {/* Progress Counter (0/0) */}
        <div className="mb-3">
          <span className="text-sm text-gray-500 dark:text-gray-300">
            Progress: <span className="font-semibold">0 / 0</span> containers
          </span>
        </div>

        {/* Progress Bar (grayed out) */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
          <div className="h-full bg-gray-300 dark:bg-gray-600 transition-all duration-300" style={{ width: '0%' }} />
        </div>
      </div>
    );
  }

  // Active state when IN_PROGRESS plan exists
  return (
    <div
      ref={cardRef}
      className={`${positionalClasses} z-40 w-80 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300`}
      style={positionalStyle}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 mb-3 -mx-4 -mt-4 px-4 pt-4 pb-3 bg-gray-100 dark:bg-gray-700 rounded-t-lg cursor-grab active:cursor-grabbing select-none"
        onPointerDown={startDrag}
      >
        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Current Execution Overview</h3>
      </div>

      <button
        type="button"
        onClick={handleCardClick}
        className="w-full rounded-lg border border-transparent px-3 py-2 text-left transition hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/20 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        title={`Current Execution: ${inProgressPlan.code} • ${processedCount}/${totalContainers} containers`}
      >
        <div className="mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Current Execution: </span>
          <span className="text-lg font-bold text-green-600 dark:text-green-400">{inProgressPlan.code}</span>
        </div>

        <div className="mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Progress: <span className="font-semibold">{processedCount} / {totalContainers}</span> Containers
          </span>
        </div>

        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </button>
    </div>
  );
}
