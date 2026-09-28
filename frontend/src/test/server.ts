import { setupServer } from 'msw/node'

import { ledgerHandlers } from './handlers/ledger'

export const server = setupServer(...ledgerHandlers)
