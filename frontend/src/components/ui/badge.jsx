import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold font-mono transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-orange-500 text-white shadow-sm hover:bg-orange-600",
        secondary:
          "border-transparent bg-slate-100 text-slate-800 hover:bg-slate-200",
        destructive:
          "border-transparent bg-red-100 text-red-700 border-red-200",
        outline: "text-slate-700 border-slate-200 bg-white",
        success:
          "border-green-200 bg-green-50 text-green-700 font-extrabold",
        warning:
          "border-orange-200 bg-orange-50 text-orange-700 font-extrabold",
        greenSolid:
          "border-transparent bg-green-600 text-white shadow-sm",
        orangeSolid:
          "border-transparent bg-orange-500 text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };

