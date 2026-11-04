import { Schema } from 'mongoose';

/**
 * Tenant safety guard plugin:
 * In non-production environments, verifies that queries on tenant-scoped
 * collections always include shopId in their query filter.
 * Prevents cross-shop data leaks during development and testing.
 */
export function tenantGuard(schema: Schema) {
  const ops = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'countDocuments',
  ];

  ops.forEach((op) => {
    schema.pre(op as any, function (this: any) {
      if (process.env.NODE_ENV !== 'production') {
        const options = this.getOptions ? this.getOptions() : {};
        if (options?.skipTenantGuard) {
          return;
        }
        const filter = this.getFilter ? this.getFilter() : {};
        if (!filter || !('shopId' in filter)) {
          throw new Error(`[TenantGuard] Missing shopId in ${op} on ${this.model.modelName}`);
        }
      }
    });
  });
}

