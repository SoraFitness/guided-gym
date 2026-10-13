import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      theme="dark"
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-[16px] group-[.toaster]:border-hairline group-[.toaster]:bg-surface-2 group-[.toaster]:text-[14px] group-[.toaster]:text-foreground group-[.toaster]:shadow-[0_18px_40px_-16px_black]",
          error: "group-[.toaster]:text-score-low",
          success: "group-[.toaster]:text-foreground",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
