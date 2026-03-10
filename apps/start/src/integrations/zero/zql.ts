import { createBuilder } from '@rocicorp/zero'
import { schema } from './schema'

/**
 * Shared Zero query builder instance for all query/mutator definition modules.
 */
export const zql = createBuilder(schema)
