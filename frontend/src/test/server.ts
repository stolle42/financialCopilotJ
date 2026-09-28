import { setupServer } from 'msw/node'

import { ledgerHandlers } from './handlers/ledger'
import { importHandlers } from './handlers/import'
import { insightsHandlers } from './handlers/insights'

export const server = setupServer(
  ...ledgerHandlers,
  ...importHandlers,
  ...insightsHandlers,
)
