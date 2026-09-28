import { setupServer } from 'msw/node'

import { ledgerHandlers } from './handlers/ledger'
import { importHandlers } from './handlers/import'

export const server = setupServer(...ledgerHandlers, ...importHandlers)
