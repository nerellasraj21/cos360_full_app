import * as React from "react"
import { useState } from "react"
import * as RadixDialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  /** When true, closing the dialog shows a "Discard changes?" confirmation */
  guardDirty?: boolean
  /** Called after user confirms discard — use to reset form state */
  onDirtyDiscard?: () => void
  modal?: boolean
}

export function Dialog({ open, onOpenChange, guardDirty = false, onDirtyDiscard, children, modal }: DialogProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && guardDirty) {
      setShowConfirm(true)
    } else {
      onOpenChange?.(nextOpen)
    }
  }

  const handleConfirmDiscard = () => {
    setShowConfirm(false)
    onDirtyDiscard?.()
    onOpenChange?.(false)
  }

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={handleOpenChange} modal={modal}>
        {children}
      </RadixDialog.Root>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved data in this form. If you close now, all entered data will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirm(false)}>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>Discard & Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function DialogTrigger({ children, ...props }: React.ComponentProps<typeof RadixDialog.Trigger>) {
  return <RadixDialog.Trigger {...props}>{children}</RadixDialog.Trigger>
}

interface DialogContentProps extends React.ComponentProps<typeof RadixDialog.Content> {
  /** Allow closing by clicking outside the dialog. Default: false */
  allowOutsideClose?: boolean
  /** Allow closing by pressing Escape key. Default: true */
  allowEscapeClose?: boolean
  /** Show the close (X) button in the top-right corner. Default: true */
  showCloseButton?: boolean
  /** When true, the inner wrapper uses flex-col + overflow-hidden instead of overflow-y-auto.
   *  Use this for dialogs that manage their own internal scroll structure. */
  customLayout?: boolean
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  customLayout = false,
  allowOutsideClose = false,
  allowEscapeClose = true,
  onInteractOutside,
  onEscapeKeyDown,
  ...props
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-background shadow-lg focus:outline-none max-h-[85vh] flex flex-col overflow-hidden",
          className
        )}
        onInteractOutside={(e) => {
          if (!allowOutsideClose) {
            e.preventDefault()
            return
          }
          onInteractOutside?.(e)
        }}
        onEscapeKeyDown={(e) => {
          if (!allowEscapeClose) {
            e.preventDefault()
            return
          }
          onEscapeKeyDown?.(e)
        }}
        {...props}
      >
        {showCloseButton && (
          <RadixDialog.Close
            className="absolute right-3 top-3 z-20 rounded-full p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </RadixDialog.Close>
        )}
        {customLayout ? (
          <div className="flex-1 flex flex-col overflow-hidden p-6">
            {children}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  )
}

export function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-4 pr-8", className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof RadixDialog.Title>) {
  return <RadixDialog.Title className={cn("text-lg font-semibold", className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof RadixDialog.Description>) {
  return <RadixDialog.Description className={cn("text-muted-foreground text-sm mb-4", className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-6 flex justify-end gap-2", className)} {...props} />
}

export function DialogClose({ children, ...props }: React.ComponentProps<typeof RadixDialog.Close>) {
  return <RadixDialog.Close {...props}>{children}</RadixDialog.Close>
}
