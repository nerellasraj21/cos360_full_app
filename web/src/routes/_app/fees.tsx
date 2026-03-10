import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/fees')({
  beforeLoad: () => {
    throw redirect({ to: '/fee/' })
  },
})
