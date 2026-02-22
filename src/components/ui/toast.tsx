"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const toastVariants = cva(
  "pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border-gray-200 bg-white text-gray-900",
        destructive:
          "border-red-500 bg-red-600 text-white",
        success:
          "border-green-500 bg-green-600 text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface ToastProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof toastVariants> {
  open?: boolean;
  onClose?: () => void;
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, open = true, onClose, children, ...props }, ref) => {
    if (!open) return null;

    return (
      <div
        ref={ref}
        data-state={open ? "open" : "closed"}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-1">{children}</div>
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Toast.displayName = "Toast";

const ToastTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

// Toast state types
type ToastVariant = "default" | "destructive" | "success";

interface ToastItem {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
}

type ToastAction =
  | { type: "ADD_TOAST"; toast: ToastItem }
  | { type: "REMOVE_TOAST"; id: string };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [...state.toasts, action.toast],
      };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.id),
      };
    default:
      return state;
  }
}

const ToastContext = React.createContext<{
  toasts: ToastItem[];
  toast: (props: Omit<ToastItem, "id">) => void;
  dismiss: (id: string) => void;
}>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
});

let toastCount = 0;

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(toastReducer, { toasts: [] });

  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: "REMOVE_TOAST", id });
  }, []);

  const toastFn = React.useCallback(
    (props: Omit<ToastItem, "id">) => {
      const id = String(toastCount++);
      const duration = props.duration ?? 5000;

      dispatch({
        type: "ADD_TOAST",
        toast: { ...props, id },
      });

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider
      value={{ toasts: state.toasts, toast: toastFn, dismiss }}
    >
      {children}
      <div className="fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]">
        {state.toasts.map((t) => (
          <Toast
            key={t.id}
            variant={t.variant}
            open={true}
            onClose={() => dismiss(t.id)}
          >
            <div className="grid gap-1">
              {t.title && <ToastTitle>{t.title}</ToastTitle>}
              {t.description && (
                <ToastDescription>{t.description}</ToastDescription>
              )}
            </div>
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastProvider,
  useToast,
  toastVariants,
};
