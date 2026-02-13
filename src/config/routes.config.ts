import { lazy, LazyExoticComponent, ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/config/rbac/permissions';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Shield,
  Settings,
  MapPin,
  Ship,
  Calendar,
  Warehouse,
  Package2,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  FileText,
  FileUp,
  LogIn,
  LogOut,
  LayoutGrid,
  Grid,
  Container,
  Package,
  ClipboardList,
  Printer,
  Receipt,
} from 'lucide-react';

// Lazy load components for better performance
// const Dashboard = lazy(() => import('@/pages/Dashboard')); // TODO: restore when dashboard is ready
const UserManagement = lazy(
  () => import('@/features/users/components/UserManagement'),
);
const TeamManagement = lazy(
  () => import('@/features/teams/components/TeamManagement'),
);
const RoleManagement = lazy(
  () => import('@/features/auth/components/RoleManagement'),
);
const AdminPanel = lazy(() => import('@/pages/AdminPanel'));
const ZoneLocationManagement = lazy(
  () => import('@/features/zones-locations/components/ZoneLocationManagement'),
);
const ComingSoon = lazy(() => import('@/shared/components/ComingSoon'));
// const _CargoPackageCheckPage = lazy(
//   () => import('@/pages/development/CargoPackageCheckPage'),
// );
// const _CargoPackageSelectionPage = lazy(
//   () => import('@/pages/development/CargoPackageSelectionPage'),
// );
// const _ExportCargoReceivingStepPage = lazy(
//   () => import('@/pages/development/ExportCargoReceivingStepPage'),
// );
// const _CargoPackageHandoverStepPage = lazy(
//   () => import('@/pages/development/CargoPackageHandoverPage'),
// );
const HBLManagement = lazy(
  () => import('@/features/hbl-management/components/HBLManagement'),
);
const HBLImportPage = lazy(
  () => import('@/pages/hbl-management/HblImportPage'),
);
const HblCustomsDeclarationsPage = lazy(
  () => import('@/pages/hbl-management/HblCustomsDeclarationsPage'),
);
const ForwarderManagementPage = lazy(
  () =>
    import(
      '@/features/forwarder/components/ForwarderManagementPage'
    ),
);
const ForwarderPrepaymentOrdersPage = lazy(
  () =>
    import(
      '@/features/forwarder-prepayments/components/ForwarderPrepaymentOrdersPage'
    ),
);
const ForwarderPrepaymentContainersPage = lazy(
  () =>
    import(
      '@/features/forwarder-prepayments/components/ForwarderPrepaymentContainersPage'
    ),
);
const ShippingLineManagementPage = lazy(
  () =>
    import(
      '@/features/shipping-lines/components/ShippingLineManagementPage'
    ),
);
const BookingOrderManagement = lazy(
  () => import('@/features/booking-orders/components/BookingOrderManagement'),
);
const ExportServiceOrderManagement = lazy(
  () =>
    import(
      '@/features/export-service-order/components/ExportServiceOrderManagement'
    ).then((module) => ({ default: module.ExportServiceOrderManagement })),
);
const ExportCargoReceivingManagement = lazy(
  () =>
    import(
      '@/features/export-cargo-receiving/components/ExportCargoReceivingManagement'
    ),
);
const StuffingPlanWorkspace = lazy(
  () =>
    import('@/features/stuffing-planning/components/StuffingPlanWorkspace').then(
      (module) => ({ default: module.StuffingPlanWorkspace }),
    ),
);
const StuffingExecutionWorkspace = lazy(
  () =>
    import('@/features/stuffing-execution/components/StuffingExecutionWorkspace').then(
      (module) => ({ default: module.StuffingExecutionWorkspace }),
    ),
);
const PackingListManagement = lazy(
  () =>
    import('@/features/packing-list/components/PackingListManagement').then(
      (module) => ({ default: module.PackingListManagement }),
    ),
);
const ReceivePlanWorkspace = lazy(
  () =>
    import('@/features/cfs-receive-planning/components/ReceivePlanWorkspace').then(
      (module) => ({ default: module.ReceivePlanWorkspace }),
    ),
);
const ReceiveContainerExecutionWorkspace = lazy(
  () =>
    import(
      '@/features/cfs-receive-execution/components/ReceiveContainerExecutionWorkspace'
    ).then((module) => ({
      default: module.ReceiveContainerExecutionWorkspace,
    })),
);
const ContainerReceivingPage = lazy(
  () =>
    import('@/features/cfs-container-receiving/components/ContainerReceivingPage'),
);
const DestuffingPlanWorkspace = lazy(
  () =>
    import(
      '@/features/destuffing-planning/components/DestuffingPlanWorkspace'
    ).then((module) => ({ default: module.DestuffingPlanWorkspace })),
);
const DestuffingExecutionWorkspace = lazy(
  () =>
    import(
      '@/features/destuffing-execution/components/DestuffingExecutionWorkspace'
    ).then((module) => ({ default: module.DestuffingExecutionWorkspace })),
);
const CargoPackageStoragePage = lazy(
  () =>
    import(
      '@/features/cargo-package-storage/components/CargoPackageStoragePage'
    ).then((module) => ({ default: module.CargoPackageStoragePage })),
);
const CargoPackageDeliveryCommercialPage = lazy(
  () =>
    import('@/features/cargo-package-delivery-commercial').then((module) => ({
      default: module.CargoPackageDeliveryCommercialPage,
    })),
);
const ReturnEmptyContainerPage = lazy(
  () =>
    import('@/features/return-empty-container/components').then((module) => ({
      default: module.ReturnEmptyContainerPage,
    })),
);
const MoveLoadedContainerPage = lazy(
  () =>
    import('@/features/move-loaded-container/components').then((module) => ({
      default: module.MoveLoadedContainerPage,
    })),
);
const ReceiveEmptyContainerPage = lazy(
  () =>
    import('@/features/receive-empty-container/components').then((module) => ({
      default: module.ReceiveEmptyContainerPage,
    })),
);
const WarehouseManagementPage = lazy(
  () =>
    import(
      '@/features/warehouse-management/components/WarehouseManagementPage'
    ),
);
const InventoryCheckManagementPage = lazy(
  () =>
    import(
      '@/features/inventory-check-management/components/InventoryCheckManagementPage'
    ),
);
const CfsCargoPackageDeliveryPage = lazy(
  () =>
    import(
      '@/features/cfs-cargo-package-delivery/components/CfsCargoPackageDeliveryPage'
    ),
);

// const ContainerPositionStatusPage = lazy(
//   () => import('@/features/container-position-status/components/ContainerPositionStatusPage'),
// );
const ContainerListPage = lazy(
  () => import('@/features/containers/components/container-list/ContainerListPage'),
);
const ContainerDetailPage = lazy(
  () => import('@/features/containers/components/container-detail/ContainerDetailPage'),
);
const ContainerTypesPage = lazy(
  () => import('@/features/containers/components/container-types/ContainerTypesPage'),
);
const ContainerCyclesPage = lazy(
  () => import('@/features/containers/components/container-cycles/ContainerCyclesPage'),
);

// const DocumentServiceDemoPage = lazy(
//  () => import('@/features/document-service/components/DocumentServiceWorkspace'),
// );

const FormPrintWorkspace = lazy(
  () => import('@/features/form-printing-demo/components/FormPrintWorkspace'),
);

// const ContainerPickerExample = lazy(
//   () => import('@/pages/development/ContainerPickerExamplePage'),
// );
// const HblImportTestPage = lazy(
//   () => import('@/pages/development/HblImportTestPage'),
// );

/**
 * Route configuration interface
 */
export interface RouteConfig {
  id: string;
  path: string | null; // null for menu groups without routes
  label: string;
  icon: LucideIcon;
  component?: LazyExoticComponent<ComponentType<any>>;
  description?: string;
  requiredRole?: 'admin' | 'manager' | 'operator' | 'viewer';
  children?: RouteConfig[];
  showInMenu?: boolean; // default true
  permission?: boolean; // For conditional display
  requiredPermissions?: Permission[];
  menuPermissions?: Permission[];
}

/**
 * ViewType - Valid route paths for type safety
 */
export type ViewType =
  | 'dashboard'
  | 'users'
  | 'teams'
  | 'roles'
  | 'admin'
  | 'zones-locations'
  // TOS Operations
  | 'vessel-schedule'
  | 'berth-crane-allocation'
  | 'inbound-yard'
  | 'outbound-yard'
  | 'internal-shifting'
  | 'transport-dispatch'
  | 'work-plan'
  | 'progress-monitoring'
  // CFS Warehouse
  | 'forwarder-management'
  | 'booking-orders'
  | 'export-service-order'
  | 'export-cargo-receiving'
  | 'packing-lists'
  | 'stuffing-planning'
  | 'lcl-receiving'
  | 'receive-plan-workspace'
  | 'destuffing-planning'
  | 'destuffing-execution'
  | 'receive-plan-execution'
  | 'cargo-package-storage'
  | 'cfs-cargo-package-delivery'
  | 'inspection-scanning'
  | 'stuffing'
  | 'delivery-payment-confirmation'
  | 'forwarder-prepayments'
  | 'stock-by-customer'
  | 'damaged-return'
  | 'return-empty-container'
  | 'move-loaded-container'
  | 'receive-empty-container'
  | 'warehouse-management'
  | 'inventory-check-management'
  | 'dangerous-goods'
  // Customs & Documentation
  | 'custom-clearance'
  | 'import-declaration'
  | 'export-declaration'
  | 'bill-of-lading'
  | 'hbl-management'
  | 'hbl-management/import'
  | 'invoice-packing'
  // Yard Management
  | 'yard-layout'
  | 'container-position'
  | 'slot-capacity'
  // Development/Examples
  | 'container-picker-example'
  | 'dynamic-filter-example'
  | 'document-service-demo'
  | 'form-components-example'
  | 'form-printout'
  | 'cargo-package-check'
  | 'cargo-package-handover-step'
  | 'container-position-status'
  | 'containers'
  | 'container-types'
  | 'container-cycles'
  | 'container-transactions'

/**
 * Page metadata configuration
 */
export interface PageMetadata {
  title: string;
  icon: LucideIcon;
  description?: string;
}

/**
 * Centralized route configuration
 * Single source of truth for routes, menu, and page metadata
 */
export const routesConfig: RouteConfig[] = [
  // Core Management
  {
    id: 'dashboard',
    path: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    component: ComingSoon,
    description: 'Project state and milestones',
    permission: true,
  },
  {
    id: 'users',
    path: 'users',
    label: 'Users',
    icon: Users,
    component: UserManagement,
    description: 'Manage user accounts and permissions',
    requiredRole: 'admin',
    permission: true,
    showInMenu: false, // Hidden in menu as per current Sidebar.tsx
  },
  {
    id: 'teams',
    path: 'teams',
    label: 'Teams',
    icon: UserCog,
    component: TeamManagement,
    description: 'Organize and manage operational teams',
    permission: true,
    showInMenu: false, // Hidden in menu as per current Sidebar.tsx
  },
  {
    id: 'roles',
    path: 'roles',
    label: 'Roles',
    icon: Shield,
    component: RoleManagement,
    description: 'Configure roles and permissions',
    requiredRole: 'admin',
    permission: true,
    showInMenu: false, // Hidden in menu as per current Sidebar.tsx
  },
  {
    id: 'admin',
    path: 'admin',
    label: 'Admin',
    icon: Settings,
    component: AdminPanel,
    description: 'System administration and configuration',
    requiredRole: 'admin',
    permission: true,
    showInMenu: false, // Hidden in menu as per current Sidebar.tsx
  },

  // // TOS Operations
  // {
  //   id: 'tos-operations',
  //   path: null,
  //   label: 'TOS Operations',
  //   icon: Ship,
  //   description: 'Terminal Operating System management',
  //   permission: true,
  //   children: [
  //     {
  //       id: 'vessel-schedule',
  //       path: 'vessel-schedule',
  //       label: 'Vessel Schedule',
  //       icon: Calendar,
  //       component: ComingSoon,
  //       description: 'Plan and track vessel arrivals and departures',
  //       permission: true,
  //     },


  //   ],
  // },

  // Customs & Documentation
  {
    id: 'customs-docs',
    path: null,
    label: 'Customs & Documentation',
    icon: FileText,
    description: 'Customs declarations and documentation',
    permission: true,
    children: [
      // {
      //   id: 'import-declaration',
      //   path: 'import-declaration',
      //   label: 'Import Declaration',
      //   icon: LogIn,
      //   component: ComingSoon,
      //   description: 'Process import customs declarations',
      //   permission: true,
      // },
      // {
      //   id: 'export-declaration',
      //   path: 'export-declaration',
      //   label: 'Export Declaration',
      //   icon: LogOut,
      //   component: ComingSoon,
      //   description: 'Process export customs declarations',
      //   permission: true,
      // },
      {
        id: 'hbl-management',
        path: 'hbl-management',
        label: 'HBL Management',
        icon: FileText,
        component: HBLManagement,
        description: 'Manage House Bill of Lading documents',
        permission: true,
        requiredPermissions: ['hbl_management:read'],
      },
      {
        id: 'hbl-management-import',
        path: 'hbl-management/import',
        label: 'HBL Import',
        icon: FileUp,
        component: HBLImportPage,
        description: 'Import HBLs via Excel',
        permission: true,
        requiredPermissions: ['hbl_management:write'],
        showInMenu: false,
      },
      {
        id: 'hbl-customs-declarations',
        path: 'hbl-management/:hblId/customs-declarations',
        label: 'HBL Customs Declarations',
        icon: FileText,
        component: HblCustomsDeclarationsPage,
        description: 'Manage Customs Declarations for a HBL',
        permission: true,
        requiredPermissions: ['hbl_management:read'],
        showInMenu: false,
      },
      {
        id: 'packing-lists',
        path: 'packing-lists',
        label: 'Cargo Lists',
        icon: PackageSearch,
        component: PackingListManagement,
        description: 'Manage packing list lifecycle',
        permission: true,
        requiredPermissions: ['packing_list_management:read'],
      },
    ],
  },

  // CFS Warehouse
  {
    id: 'warehouse',
    path: null,
    label: 'CFS Warehouse',
    icon: Warehouse,
    description: 'Container Freight Station operations',
    permission: true,
    children: [
      {
        id: 'cfs-import',
        path: null,
        label: 'Import',
        icon: LogIn,
        description: 'Import operations and workflows',
        permission: true,
        menuPermissions: [],
        children: [
          {
            id: 'booking-orders',
            path: 'booking-orders',
            label: 'Import - Service Order',
            icon: Package2,
            component: BookingOrderManagement,
            description: 'Manage CFS warehouse booking orders',
            permission: true,
            requiredPermissions: ['destuff_order_management:read'],
          },
          {
            id: 'container-receiving',
            path: 'container-receiving',
            label: 'Container Receiving',
            icon: Container,
            component: ContainerReceivingPage,
            description: 'Receive containers and update receiving statuses',
            permission: true,
            requiredPermissions: ['actual_container_receive:read'],
          },
          {
            id: 'receive-plan-workspace',
            path: 'receive-plan-workspace',
            label: 'Container Receive Plan',
            icon: Calendar,
            component: ReceivePlanWorkspace,
            description: 'Plan and schedule container receiving operations',
            permission: true,
            requiredPermissions: ['container_receive_plan:read'],
            showInMenu: false,
          },
          // {
          //   id: 'container-position-status',
          //   path: 'container-position-status',
          //   label: 'Container Position Status',
          //   icon: MapPin,
          //   component: ContainerPositionStatusPage,
          //   description: 'Development demo for edit Container position status',
          //   permission: true,
          //   requiredPermissions: ['container_position_status:read']
          // },
          {
            id: 'receive-plan-execution',
            path: 'receive-plan-execution',
            label: 'Container Receiving',
            icon: Container,
            component: ReceiveContainerExecutionWorkspace,
            description: 'Execute active receive plans and process containers',
            permission: true,
            requiredPermissions: ['actual_container_receive:read'],
            showInMenu: false,
          },
          {
            id: 'destuffing-plan-workspace',
            path: 'destuffing-planning',
            label: 'Container Destuffing Plan',
            icon: PackageOpen,
            component: DestuffingPlanWorkspace,
            description: 'Plan and monitor container destuffing operations',
            permission: true,
            requiredPermissions: ['destuff_plan:read'],
          },
          {
            id: 'destuffing-execution-workspace',
            path: 'destuffing-execution',
            label: 'Container Destuffing',
            icon: PackageOpen,
            component: DestuffingExecutionWorkspace,
            description: 'Execute in-progress destuff plans and record results',
            permission: true,
            requiredPermissions: ['actual_destuff:read'],
          },
          {
            id: 'cargo-package-storage',
            path: 'cargo-package-storage',
            label: 'Cargo Package Storage',
            icon: Package,
            component: CargoPackageStoragePage,
            description: 'Store cargo packages from in-progress destuffing',
            permission: true,
            requiredPermissions: ['cargo_package_store:read'],
          },
          {
            id: 'delivery-payment-confirmation',
            path: 'delivery-payment-confirmation',
            label: 'Request Delivery',
            icon: PackageOpen,
            component: CargoPackageDeliveryCommercialPage,
            description: 'Confirm payment and delivery readiness for HBLs',
            permission: true,
            requiredPermissions: ['payment:read'],
          },
          {
            id: 'cfs-cargo-package-delivery',
            path: 'cfs-cargo-package-delivery',
            label: 'Cargo Package Delivery',
            icon: PackageOpen,
            component: CfsCargoPackageDeliveryPage,
            description: 'Deliver cargo packages from CFS warehouse',
            permission: true,
            requiredPermissions: ['cargo_delivery:read'],
          },
          {
            id: 'return-empty-container',
            path: 'return-empty-container',
            label: 'Return Empty Containers',
            icon: Container,
            component: ReturnEmptyContainerPage,
            description: 'Return empty containers to carriers',
            permission: true,
            requiredPermissions: ['return_empty_container:read'],
          },
        ],
      },
      {
        id: 'cfs-export',
        path: null,
        label: 'Export',
        icon: LogOut,
        description: 'Export operations and workflows',
        permission: true,
        menuPermissions: [],
        children: [
          {
            id: 'export-service-order',
            path: 'export-service-order',
            label: 'Export - Service Order',
            icon: PackagePlus,
            component: ExportServiceOrderManagement,
            description: 'Manage export service orders',
            permission: true,
            requiredPermissions: ['export_service_order:read']
          },
          {
            id: 'export-cargo-receiving',
            path: 'export-cargo-receiving',
            label: 'Cargo Package Receiving',
            icon: PackagePlus,
            component: ExportCargoReceivingManagement,
            description: 'Receive export cargo packages by packing list',
            permission: true,
            requiredPermissions: ['cargo_package_receiving:read']
          },
          {
            id: 'stuffing-planning',
            path: 'stuffing-planning',
            label: 'Stuffing Planning',
            icon: ClipboardList,
            component: StuffingPlanWorkspace,
            description: 'Plan stuffing operations',
            permission: true,
            requiredPermissions: ['stuffing_planning:read']
          },
          {
            id: 'stuffing',
            path: 'stuffing',
            label: 'Stuffing',
            icon: PackageCheck,
            component: StuffingExecutionWorkspace,
            description: 'Container stuffing operations',
            permission: true,
            requiredPermissions: ['stuffing:read']
          },
          {
            id: 'receive-empty-container',
            path: 'receive-empty-container',
            label: 'Receive Empty Container',
            icon: Container,
            component: ReceiveEmptyContainerPage,
            description: 'Receive empty containers for export workflows',
            permission: true,
            requiredPermissions: ['receive_empty_container:read'],
          },
          {
            id: 'move-loaded-container',
            path: 'move-loaded-container',
            label: 'Move Loaded Container',
            icon: Container,
            component: MoveLoadedContainerPage,
            description: 'Move loaded containers within the yard',
            permission: true,
            requiredPermissions: ['move_loaded_container:read'],
          },
        ],
      },
      {
        id: 'forwarder-prepayments',
        path: 'forwarder-prepayments',
        label: 'Forwarder Prepayments',
        icon: Receipt,
        component: ForwarderPrepaymentOrdersPage,
        description: 'Record forwarder prepayments before destuffing or stuffing',
        permission: true,
      },
      {
        id: 'forwarder-prepayments-detail',
        path: 'forwarder-prepayments/:direction/:orderId',
        label: 'Forwarder Prepayments Detail',
        icon: Receipt,
        component: ForwarderPrepaymentContainersPage,
        description: 'Manage container prepayments for a selected order',
        permission: true,
        showInMenu: false,
      },
      {
        id: 'warehouse-management',
        path: 'warehouse-management',
        label: 'Warehouse Management',
        icon: Warehouse,
        component: WarehouseManagementPage,
        description: 'Manage warehouse operations and settings',
        permission: true,
        requiredPermissions: ['warehouse_management:read']
      },
      {
        id: 'inventory-check-management',
        path: 'inventory-check-management',
        label: 'Inventory Check Management',
        icon: PackageCheck,
        component: InventoryCheckManagementPage,
        description: 'Plan and review warehouse inventory checks',
        permission: true,
        requiredPermissions: ['inventory_check_management:read']
      },
      {
        id: 'zones-locations',
        path: 'zones-locations',
        label: 'Zones & Locations',
        icon: MapPin,
        component: ZoneLocationManagement,
        description: 'Manage warehouse zones and storage locations',
        permission: true,
        requiredPermissions: ['zone_and_location_management:read'],
      },
    ],
  },

  // Category Management
  {
    id: 'category-management',
    path: null,
    label: 'Category Management',
    icon: LayoutGrid,
    description: 'Category Management',
    permission: true,
    children: [
      {
        id: 'forwarder-management',
        path: 'forwarder-management',
        label: 'Forwarder Management',
        icon: UserCog,
        component: ForwarderManagementPage,
        description: 'Manage forwarder profiles and upcoming assignments',
        permission: true,
        requiredPermissions: ['forwarder_management:read'],
      },
      {
        id: 'shipping-line-management',
        path: 'shipping-line-management',
        label: 'Shipping Line Management',
        icon: Ship,
        component: ShippingLineManagementPage,
        description: 'Manage shipping line profiles and contracts',
        permission: true,
        requiredPermissions: ['shippingline_management:read'],
      },
      {
        id: 'container-management',
        path: null,
        label: 'Container Management',
        icon: Package,
        description: 'Master container data, lifecycle, and events',
        permission: true,
        menuPermissions: [],
        children: [
          {
            id: 'containers',
            path: 'containers',
            label: 'Containers',
            icon: PackageSearch,
            component: ContainerListPage,
            description: 'Manage master container data',
            requiredPermissions: ['container_management:read'],
            menuPermissions: [],
          },
          {
            id: 'container-detail',
            path: 'containers/:id',
            label: 'Container Detail',
            icon: PackageSearch,
            component: ContainerDetailPage,
            requiredPermissions: ['container_management:read'],
            showInMenu: false,
          },
          {
            id: 'container-types',
            path: 'container-types',
            label: 'Container Types',
            icon: LayoutGrid,
            component: ContainerTypesPage,
            description: 'ISO equipment definitions',
            requiredPermissions: ['container_management:write'],
            menuPermissions: [],
          },
          {
            id: 'container-cycles',
            path: 'container-cycles',
            label: 'Container Cycles',
            icon: Grid,
            component: ContainerCyclesPage,
            description: 'Track lifecycle states',
            requiredPermissions: ['container_management:write'],
            menuPermissions: [],
          },
          // {
          //   id: 'container-transactions',
          //   path: 'container-transactions',
          //   label: 'Container Transactions',
          //   icon: PackageCheck,
          //   component: ContainerTransactionsPage,
          //   description: 'Operational event history',
          //   requiredPermissions: ['container_receive_plan:read'],
          //   menuPermissions: [],            showInMenu: false,          // },
        ],
      },
      // {
      //   id: 'document-service-demo',
      //   path: 'document-service-demo',
      //   label: 'Document Service Demo',
      //   icon: FileText,
      //   component: DocumentServiceDemoPage,
      //   description: 'Development playground for document upload/list/download flow',
      //   permission: true,
      // },
      {
        id: 'form-printout',
        path: 'form-printout',
        label: 'Form Printout Demo',
        icon: Printer,
        component: FormPrintWorkspace,
        description: 'Development demo for printing DESTUFF CFS Receipt',
        permission: true,
      },
      // {
      //   id: 'container-picker-example',
      //   path: 'container-picker-example',
      //   label: 'Container Picker Demo',
      //   icon: Package2,
      //   component: ContainerPickerExample,
      //   description: 'Development example for container picker component',
      //   permission: true,
      // },
    ],
  },

  // // Yard Management
  // {
  //   id: 'yard-management',
  //   path: null,
  //   label: 'Yard Management',
  //   icon: LayoutGrid,
  //   description: 'Container yard layout and positioning',
  //   permission: true,
  //   children: [
  //     {
  //       id: 'yard-layout',
  //       path: 'yard-layout',
  //       label: 'Yard Layout',
  //       icon: Grid,
  //       component: ComingSoon,
  //       description: 'Configure and manage yard layout',
  //       permission: true,
  //     },
  //   ],
  // },

  // Development
  // {
  //   id: 'development',
  //   path: null,
  //   label: 'Development',
  //   icon: Container,
  //   description: 'Development examples and demos',
  //   permission: true, //import.meta.env.DEV,
  //   children: [
  //     // {
  //     //   id: 'cargo-package-selection',
  //     //   path: 'cargo-package-selection',
  //     //   label: 'Cargo Package Select Step',
  //     //   icon: PackagePlus,
  //     //   component: CargoPackageSelectionPage,
  //     //   description: 'Development view for cargo package selection feature',
  //     //   permission: true,
  //     // },
  //     // {
  //     //   id: 'export-cargo-receiving-step-page',
  //     //   path: 'export-cargo-receiving-step-page',
  //     //   label: 'Export - Cargo Package Receiving Step',
  //     //   icon: PackagePlus,
  //     //   component: ExportCargoReceivingStepPage,
  //     //   description: 'Development view for cargo package receiving create step',
  //     //   permission: true,
  //     // },
  //     // {
  //     //   id: 'cargo-package-check',
  //     //   path: 'cargo-package-check',
  //     //   label: 'Cargo Package Check Step',
  //     //   icon: PackageCheck,
  //     //   component: CargoPackageCheckPage,
  //     //   description: 'Development view for cargo package check component',
  //     //   permission: true,
  //     // },
  //     // {
  //     //   id: 'cargo-package-handover-step',
  //     //   path: 'cargo-package-handover-step',
  //     //   label: 'Cargo Package Handover Step',
  //     //   icon: Package,
  //     //   component: CargoPackageHandoverStepPage,
  //     //   description: 'Development view for cargo package handover step component',
  //     //   permission: true,
  //     // },
  //     // {
  //     //   id: 'container-picker-example',
  //     //   path: 'container-picker-example',
  //     //   label: 'Container Picker Demo',
  //     //   icon: Package2,
  //     //   component: ContainerPickerExample,
  //     //   description: 'Development example for container picker component',
  //     //   permission: true,
  //     // },
  //     // {
  //     //   id: 'dynamic-filter-example',
  //     //   path: 'dynamic-filter-example',
  //     //   label: 'Dynamic Filter Demo',
  //     //   icon: Grid,
  //     //   component: DynamicFilterExample,
  //     //   description: 'Development example for dynamic filter component',
  //     //   permission: true,
  //     // },
  //     // {
  //     //   id: 'document-service-demo',
  //     //   path: 'document-service-demo',
  //     //   label: 'Document Service Demo',
  //     //   icon: FileText,
  //     //   component: DocumentServiceDemoPage,
  //     //   description: 'Development playground for document upload/list/download flow',
  //     //   permission: true,
  //     // },
  //     // {
  //     //   id: 'form-components-example',
  //     //   path: 'form-components-example',
  //     //   label: 'Form Components Demo',
  //     //   icon: CheckSquare,
  //     //   component: FormComponentsExample,
  //     //   description: 'Development example for FormSelect and FormMultiSelect components',
  //     //   permission: true,
  //     // },
  //     {
  //       id: 'form-printout',
  //       path: 'form-printout',
  //       label: 'Form Printout Demo',
  //       icon: Printer,
  //       component: FormPrintWorkspace,
  //       description: 'Development demo for printing DESTUFF CFS Receipt',
  //       permission: true,
  //     },
  //     {
  //       id: 'hbl-import-test',
  //       path: 'hbl-import-test',
  //       label: 'HBL Import (Dev Test)',
  //       icon: FileText,
  //       component: HblImportTestPage,
  //       description: 'Development test page for generic Excel import wizard',
  //       permission: true,
  //     },
  //     // {
  //     //   id: 'container-management',
  //     //   path: null,
  //     //   label: 'Container Management',
  //     //   icon: Package,
  //     //   description: 'Master container data, lifecycle, and events',
  //     //   permission: true,
  //     //   menuPermissions: [],
  //     //   children: [
  //     //     {
  //     //       id: 'containers',
  //     //       path: 'containers',
  //     //       label: 'Containers',
  //     //       icon: PackageSearch,
  //     //       component: ContainerListPage,
  //     //       description: 'Manage master container data',
  //     //       requiredPermissions: ['container_receive_plan:read'],
  //     //       menuPermissions: [],
  //     //     },
  //     //     {
  //     //       id: 'container-detail',
  //     //       path: 'containers/:id',
  //     //       label: 'Container Detail',
  //     //       icon: PackageSearch,
  //     //       component: ContainerDetailPage,
  //     //       requiredPermissions: ['container_receive_plan:read'],
  //     //       showInMenu: false,
  //     //     },
  //     //     {
  //     //       id: 'container-types',
  //     //       path: 'container-types',
  //     //       label: 'Container Types',
  //     //       icon: LayoutGrid,
  //     //       component: ContainerTypesPage,
  //     //       description: 'ISO equipment definitions',
  //     //       requiredPermissions: ['container_receive_plan:write'],
  //     //       menuPermissions: [],
  //     //     },
  //     //     {
  //     //       id: 'container-cycles',
  //     //       path: 'container-cycles',
  //     //       label: 'Container Cycles',
  //     //       icon: Grid,
  //     //       component: ContainerCyclesPage,
  //     //       description: 'Track lifecycle states',
  //     //       requiredPermissions: ['container_receive_plan:write'],
  //     //       menuPermissions: [],
  //     //     },
  //     //     // {
  //     //     //   id: 'container-transactions',
  //     //     //   path: 'container-transactions',
  //     //     //   label: 'Container Transactions',
  //     //     //   icon: PackageCheck,
  //     //     //   component: ContainerTransactionsPage,
  //     //     //   description: 'Operational event history',
  //     //     //   requiredPermissions: ['container_receive_plan:read'],
  //     //     //   menuPermissions: [],            showInMenu: false,          // },
  //     //   ],
  //     // },
  //   ],
  // },
];

/**
 * Get page metadata for a given view
 * @param view - The view type
 * @returns Page metadata (title, icon, description)
 */
export function getPageMetadata(view: ViewType): PageMetadata {
  // Flatten all routes including children
  const flatRoutes: RouteConfig[] = [];
  const flatten = (routes: RouteConfig[]) => {
    routes.forEach((route) => {
      flatRoutes.push(route);
      if (route.children) {
        flatten(route.children);
      }
    });
  };
  flatten(routesConfig);

  // Find matching route
  const route = flatRoutes.find((r) => r.path === view);

  if (route) {
    return {
      title: route.label,
      icon: route.icon,
      description: route.description,
    };
  }

  // Default fallback
  return {
    title: 'CFS Platform',
    icon: LayoutDashboard,
    description: undefined,
  };
}
