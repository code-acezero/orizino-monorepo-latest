"use client";
import React from "react";
import { motion } from "framer-motion";
import { Package, Settings, Truck, CheckCircle2, XCircle, Clock } from "lucide-react";

const STEPS = [
  { key: "pending", label: "Placed", icon: Package },
  { key: "processing", label: "Processing", icon: Settings },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

const statusIndex: Record<string, number> = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

interface Props {
  status: string;
  trackingNumber?: string | null;
  updatedAt?: string;
}

const OrderTrackingTimeline: React.FC<Props> = ({ status, trackingNumber, updatedAt }) => {
  const currentIdx = statusIndex[status] ?? -1;
  const isCancelled = status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
        <XCircle className="w-6 h-6 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-destructive">Order Cancelled</p>
          {updatedAt && <p className="text-xs text-muted-foreground">{new Date(updatedAt).toLocaleDateString()}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => {
          const isCompleted = currentIdx >= i;
          const isCurrent = currentIdx === i;
          const StepIcon = step.icon;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <motion.div
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.15 : 1,
                    backgroundColor: isCompleted ? "hsl(var(--primary))" : "hsl(var(--secondary))",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? "text-primary-foreground shadow-lg shadow-primary/30" : "text-muted-foreground"
                  }`}
                >
                  <StepIcon className="w-5 h-5" />
                </motion.div>
                <span className={`text-[10px] font-medium text-center ${isCompleted ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mt-[-18px]">
                  <motion.div
                    initial={false}
                    animate={{ scaleX: currentIdx > i ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full bg-primary origin-left rounded-full"
                    style={{ width: "100%" }}
                  />
                  {currentIdx <= i && <div className="h-full bg-border rounded-full mt-[-2px]" />}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {trackingNumber && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl px-3 py-2">
          <Truck className="w-3.5 h-3.5 text-primary" />
          <span>Tracking: <span className="font-mono text-foreground">{trackingNumber}</span></span>
        </div>
      )}
    </div>
  );
};

export default OrderTrackingTimeline;
