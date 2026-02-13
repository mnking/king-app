import { Container, ContainerType } from '@/features/containers/types';
import {
  mockContainers,
  mockContainerTypes,
  generateContainerId,
  generateContainerNumber,
} from '@/mocks/data/containers';

/**
 * Quick access to test containers
 */
export const testContainers = {
  standard: mockContainers[0],
  highCube: mockContainers[1],
  withoutSeal: mockContainers[2],
  reefer: mockContainers[3],
  all: mockContainers,
};

/**
 * Quick access to test container types
 */
export const testContainerTypes = {
  dry20ft: mockContainerTypes[0],
  reefer20ft: mockContainerTypes[1],
  dry40ft: mockContainerTypes[2],
  highCube40ft: mockContainerTypes[3],
  reeferHighCube: mockContainerTypes[4],
  all: mockContainerTypes,
};

/**
 * Build a container with optional overrides
 */
export const buildContainer = (overrides?: Partial<Container>): Container => ({
  ...mockContainers[0],
  id: generateContainerId(),
  number: generateContainerNumber(),
  ...overrides,
});

/**
 * Build a container type with optional overrides
 */
export const buildContainerType = (overrides?: Partial<ContainerType>): ContainerType => ({
  ...mockContainerTypes[0],
  ...overrides,
});

/**
 * Test scenarios for edge cases
 */
export const containerScenarios = {
  /** Container without seal */
  withoutSeal: () =>
    buildContainer({
      seal: undefined,
    }),

  /** Container with specific type */
  withType: (containerTypeCode: string, containerType?: ContainerType) =>
    buildContainer({
      containerTypeCode,
      containerType: containerType || mockContainerTypes.find((t) => t.code === containerTypeCode),
    }),

  /** Reefer container */
  reefer: () =>
    buildContainer({
      containerTypeCode: '22R1',
      containerType: testContainerTypes.reefer20ft,
    }),

  /** High cube container */
  highCube: () =>
    buildContainer({
      containerTypeCode: '45G1',
      containerType: testContainerTypes.highCube40ft,
    }),

  /** Batch of containers */
  batch: (count: number) => Array.from({ length: count }, () => buildContainer()),
};
