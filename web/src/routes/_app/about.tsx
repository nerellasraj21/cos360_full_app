import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/about')({
  component: () => (
    <div className="p-4">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="mt-4">This is the about page with sidebar and navbar.</p>
    </div>
  ),
}) 