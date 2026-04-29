"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Slot } from "radix-ui"
import { X } from "lucide-react"
import { AnimatePresence, motion, MotionConfig } from "motion/react"

import { cn } from "@/lib/utils"

const TRANSITION = {
  type: "spring" as const,
  bounce: 0.05,
  duration: 0.3,
}

function useMounted() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  return mounted
}

function useBodyScrollLock(locked: boolean) {
  React.useEffect(() => {
    if (!locked) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [locked])
}

interface PopoverContextType {
  isOpen: boolean
  setOpen: (open: boolean) => void
  openPopover: () => void
  closePopover: () => void
  uniqueId: string
  note: string
  setNote: React.Dispatch<React.SetStateAction<string>>
}

const PopoverContext = React.createContext<PopoverContextType | undefined>(
  undefined
)

function usePopover() {
  const context = React.useContext(PopoverContext)

  if (!context) {
    throw new Error("usePopover must be used within a PopoverRoot")
  }

  return context
}

interface PopoverRootProps {
  children: React.ReactNode
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function PopoverRoot({
  children,
  className,
  open,
  onOpenChange,
}: PopoverRootProps) {
  const uniqueId = React.useId()
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const [note, setNote] = React.useState("")
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : uncontrolledOpen

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }

      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange]
  )

  const openPopover = React.useCallback(() => {
    setOpen(true)
  }, [setOpen])

  const closePopover = React.useCallback(() => {
    setOpen(false)
  }, [setOpen])

  React.useEffect(() => {
    if (!isOpen) {
      setNote("")
    }
  }, [isOpen])

  const contextValue = React.useMemo(
    () => ({
      isOpen,
      setOpen,
      openPopover,
      closePopover,
      uniqueId,
      note,
      setNote,
    }),
    [closePopover, isOpen, note, openPopover, setOpen, uniqueId]
  )

  return (
    <PopoverContext.Provider value={contextValue}>
      <MotionConfig transition={TRANSITION}>
        <div className={cn("isolate", className)}>{children}</div>
      </MotionConfig>
    </PopoverContext.Provider>
  )
}

interface PopoverTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<"button">, "children"> {
  children: React.ReactNode
  asChild?: boolean
}

export function PopoverTrigger({
  children,
  className,
  asChild = false,
  onClick,
  type,
  ...props
}: PopoverTriggerProps) {
  const { openPopover } = usePopover()
  const Comp = asChild ? Slot.Root : "button"

  const handleClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)

      if (!event.defaultPrevented) {
        openPopover()
      }
    },
    [onClick, openPopover]
  )

  return (
    <Comp
      className={cn(
        !asChild &&
          "flex h-9 items-center rounded-md border border-border bg-background px-3 text-foreground",
        className
      )}
      onClick={handleClick}
      type={asChild ? undefined : (type ?? "button")}
      {...props}
    >
      {children}
    </Comp>
  )
}

interface PopoverContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  overlayClassName?: string
}

export function PopoverContent({
  children,
  className,
  overlayClassName,
  ...props
}: PopoverContentProps) {
  const { isOpen, closePopover } = usePopover()
  const mounted = useMounted()

  useBodyScrollLock(isOpen)

  React.useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePopover()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [closePopover, isOpen])

  if (!mounted) {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.button
            key="popover-overlay"
            type="button"
            aria-label="Close popover"
            className={cn(
              "fixed inset-0 z-50 bg-background/30 backdrop-blur-[2px]",
              overlayClassName
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePopover}
          />

          <div className="fixed inset-0 z-[51] pointer-events-none">
            <div className="flex h-full justify-end p-4 sm:p-5 lg:p-6">
              <motion.div
                key="popover-content"
                role="dialog"
                aria-modal="true"
                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.98 }}
                className={cn(
                  "pointer-events-auto flex h-full w-full flex-col overflow-hidden rounded-[1.25rem] border border-border/80 bg-background text-popover-foreground shadow-[0_24px_80px_rgba(15,23,42,0.18)] ring-1 ring-foreground/10 sm:max-w-[36rem] lg:max-w-[40rem]",
                  className
                )}
                {...props}
              >
                {children}
              </motion.div>
            </div>
          </div>
        </>
      ) : null}
    </AnimatePresence>,
    document.body
  )
}

interface PopoverFormProps {
  children: React.ReactNode
  onSubmit?: (note: string) => void
  className?: string
}

export function PopoverForm({
  children,
  onSubmit,
  className,
}: PopoverFormProps) {
  const { note, closePopover } = usePopover()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    onSubmit?.(note)
    closePopover()
  }

  return (
    <form
      className={cn("flex h-full flex-col", className)}
      onSubmit={handleSubmit}
    >
      {children}
    </form>
  )
}

interface PopoverLabelProps {
  children: React.ReactNode
  className?: string
}

export function PopoverLabel({ children, className }: PopoverLabelProps) {
  const { note } = usePopover()

  return (
    <span
      aria-hidden="true"
      style={{
        opacity: note ? 0 : 1,
      }}
      className={cn(
        "absolute left-4 top-3 select-none text-sm text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

interface PopoverTextareaProps {
  className?: string
}

export function PopoverTextarea({ className }: PopoverTextareaProps) {
  const { note, setNote } = usePopover()

  return (
    <textarea
      className={cn(
        "h-full w-full resize-none rounded-md bg-transparent px-4 py-3 text-sm outline-none",
        className
      )}
      autoFocus
      value={note}
      onChange={(event) => setNote(event.target.value)}
    />
  )
}

interface PopoverFooterProps {
  children: React.ReactNode
  className?: string
}

export function PopoverFooter({ children, className }: PopoverFooterProps) {
  return (
    <div className={cn("flex justify-between px-4 py-3", className)}>
      {children}
    </div>
  )
}

interface PopoverCloseButtonProps {
  className?: string
}

export function PopoverCloseButton({ className }: PopoverCloseButtonProps) {
  const { closePopover } = usePopover()

  return (
    <button
      type="button"
      className={cn("flex items-center", className)}
      onClick={closePopover}
      aria-label="Close popover"
    >
      <X size={16} className="text-foreground" />
    </button>
  )
}

interface PopoverSubmitButtonProps {
  className?: string
}

export function PopoverSubmitButton({ className }: PopoverSubmitButtonProps) {
  return (
    <button
      className={cn(
        "relative ml-1 flex h-8 shrink-0 scale-100 select-none appearance-none items-center justify-center rounded-lg border border-border bg-transparent px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 active:scale-[0.98]",
        className
      )}
      type="submit"
      aria-label="Submit note"
    >
      Submit
    </button>
  )
}

export function PopoverHeader({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("px-4 py-2 font-semibold text-foreground", className)}>
      {children}
    </div>
  )
}

export function PopoverBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("p-4", className)}>{children}</div>
}

export function PopoverButton({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-4 py-2 text-left text-sm hover:bg-muted",
        className
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )
}
