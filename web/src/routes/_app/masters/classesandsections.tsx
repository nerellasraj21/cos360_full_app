import { createFileRoute } from '@tanstack/react-router'
import ClassesAndSectionsPage from '@/pages/masters/classesandsections'

export const Route = createFileRoute('/_app/masters/classesandsections')({
    component: RouteComponent,
})

function RouteComponent() {
    return <ClassesAndSectionsPage />
}
