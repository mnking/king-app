import type { PropsWithChildren } from 'react';

import { ToastContainer } from './ToastContainer';

export function ToastProvider({ children }: PropsWithChildren) {
  return (
    <>
      {children}
      <ToastContainer />
    </>
  );
}

export default ToastProvider;
