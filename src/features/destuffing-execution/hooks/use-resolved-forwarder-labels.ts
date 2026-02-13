import { useEffect, useState, useRef, useCallback } from 'react';
import { getPlanForwarderLabel } from '@/features/destuffing-planning/utils/plan-transformers';
import type { DestuffingPlan } from '../types';
import { getCachedBookingOrderById } from '../utils/booking-order-cache';

type ForwarderLabels = Record<string, string | null>;

/**
 * Resolves forwarder labels for plans by:
 * 1. Checking plan-level forwarder fields
 * 2. Falling back to fetching booking order from first container
 */
export function useResolvedForwarderLabels(plans: DestuffingPlan[]) {
  const [labels, setLabels] = useState<ForwarderLabels>({});
  const pendingRequests = useRef<Record<string, Promise<string | null>>>({});

  const resolvePlanForwarder = useCallback(
    async (plan: DestuffingPlan): Promise<string | null> => {
      // Check if already resolved
      if (labels[plan.id] !== undefined) {
        return labels[plan.id];
      }

      // Check if request is in flight
      if (pendingRequests.current[plan.id]) {
        return pendingRequests.current[plan.id];
      }

      // Try plan-level forwarder first
      const planLabel = getPlanForwarderLabel(plan);
      if (planLabel) {
        setLabels((prev) => ({ ...prev, [plan.id]: planLabel }));
        return planLabel;
      }

      // Fallback: fetch from booking order
      const firstContainer = plan.containers?.[0];
      const containerBookingOrder = firstContainer?.orderContainer?.bookingOrder;
      if (containerBookingOrder?.agentCode || containerBookingOrder?.agentId) {
        const label = containerBookingOrder.agentCode ?? containerBookingOrder.agentId ?? null;
        setLabels((prev) => ({ ...prev, [plan.id]: label }));
        return label;
      }
      const orderId = firstContainer?.orderContainer?.orderId;

      if (!orderId) {
        setLabels((prev) => ({ ...prev, [plan.id]: null }));
        return null;
      }

      const fetchPromise = (async (): Promise<string | null> => {
        try {
          const bookingOrder = await getCachedBookingOrderById(orderId);
          const label = bookingOrder?.agentCode ?? bookingOrder?.agentId ?? null;
          return label;
        } catch (error) {
          console.error('[useResolvedForwarderLabels] Failed to fetch booking order:', error);
          return null;
        }
      })();

      pendingRequests.current[plan.id] = fetchPromise;

      const result = await fetchPromise;
      setLabels((prev) => ({ ...prev, [plan.id]: result }));
      delete pendingRequests.current[plan.id];

      return result;
    },
    [labels],
  );

  // Resolve forwarders for all plans
  useEffect(() => {
    plans.forEach((plan) => {
      if (labels[plan.id] === undefined) {
        void resolvePlanForwarder(plan);
      }
    });
  }, [plans, labels, resolvePlanForwarder]);

  const getForwarderLabel = useCallback(
    (planId: string): string | null => labels[planId] ?? null,
    [labels],
  );

  return { labels, getForwarderLabel };
}
