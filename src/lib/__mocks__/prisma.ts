import { vi } from "vitest";

function createModelMock() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn(),
  };
}

export const prisma = {
  customer: createModelMock(),
  user: createModelMock(),
  userRole: createModelMock(),
  role: createModelMock(),
  permission: createModelMock(),
  productLibraryItem: createModelMock(),
  coatingPriceLabel: createModelMock(),
  contact: createModelMock(),
  shipToAddress: createModelMock(),
  carrier: createModelMock(),
  quote: createModelMock(),
  quoteComponent: createModelMock(),
  quoteDetail: createModelMock(),
  order: createModelMock(),
  orderDetail: createModelMock(),
  orderStatusHistory: createModelMock(),
  orderProcessStep: createModelMock(),
  processTemplate: createModelMock(),
  processTemplateStep: createModelMock(),
  rework: createModelMock(),
  reworkMemo: createModelMock(),
  coatingFailure: createModelMock(),
  methodFailure: createModelMock(),
  taxRate: createModelMock(),
  tool: createModelMock(),
  toolPart: createModelMock(),
  toolAssignment: createModelMock(),
  toolReceipt: createModelMock(),
};
