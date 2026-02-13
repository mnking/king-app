// import { authHandlers } from './auth';
import { teamHandlers } from './teams';
import { userHandlers } from './users';
import { roleHandlers } from './roles';
import { zonesLocationsHandlers } from './zones-locations';
import { containersHandlers } from './containers';
import { isRealAPI, env } from '@/config/api';

// Hardcoded handler configuration - KISS principle
export const handlers = [
  // Auth: exclude login if using real auth, but keep other endpoints
  // ...authHandlers.filter((handler) => {
  //   if (isRealAPI('auth')) {
  //     // Extract URL from handler to check if it's the login endpoint
  //     const handlerInfo = handler.info || {};
  //     const path = handlerInfo.path || '';

  //     // Skip login endpoint handler when using real auth
  //     if (path.includes('/auth/login') || path.includes('/api/auth/login')) {
  //       return false;
  //     }
  //   }
  //   return true;
  // }),

  // CFS: exclude all handlers (using real API)
  ...(isRealAPI('cfs') ? [] : zonesLocationsHandlers),
  ...(isRealAPI('container') ? [] : containersHandlers),

  // MSW mock features (hardcoded)
  ...teamHandlers,
  ...userHandlers,
  ...roleHandlers,
];

// Log which handlers are active for debugging
if (env.enableLogging) {
  console.log('🔧 MSW Handler Configuration:');
  // console.log(
  //   `  - Auth (real API: ${isRealAPI('auth')}): ${
  //     authHandlers.filter((h) => {
  //       const path = h.info?.path || '';
  //       return (
  //         !isRealAPI('auth') ||
  //         (!path.includes('/auth/login') && !path.includes('/api/auth/login'))
  //       );
  //     }).length
  //   }/${authHandlers.length} handlers`,
  // );
  console.log(
    `  - CFS (real API: ${isRealAPI('cfs')}): ${isRealAPI('cfs') ? 0 : zonesLocationsHandlers.length} handlers`,
  );
  console.log(
    `  - Containers (real API: ${isRealAPI('container')}): ${
      isRealAPI('container') ? 0 : containersHandlers.length
    } handlers`,
  );
  console.log(
    `  - Other features (mock): ${teamHandlers.length + userHandlers.length + roleHandlers.length} handlers`,
  );
}
