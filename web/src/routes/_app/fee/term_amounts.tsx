import { createFileRoute, redirect } from '@tanstack/react-router'

// Fee Term Amounts is not a standalone page - it's a modal in Fee Mappings
// Redirect users to the Fee Mappings page (Class Mappings tab)
export const Route = createFileRoute('/_app/fee/term_amounts')({
  beforeLoad: () => {
    throw redirect({ to: '/fee/mappings', hash: 'class-mappings', replace: true })
  },
})
