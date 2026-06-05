"use client";
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { Bell, BellOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NotifyWhenAvailableProps {
  productId: string;
  variantId?: string | null;
  variantLabel?: string;
  className?: string;
}

const NotifyWhenAvailable: React.FC<NotifyWhenAvailableProps> = ({
  productId, variantId, variantLabel, className,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["stock-notification", productId, variantId || "base"];

  const { data: subscription, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const query = supabase
        .from("stock_notifications" as any)
        .select("id, is_notified")
        .eq("user_id", user!.id)
        .eq("product_id", productId);

      if (variantId) {
        query.eq("variant_id", variantId);
      } else {
        query.is("variant_id", null);
      }

      const { data } = await query.maybeSingle();
      return data as unknown as { id: string; is_notified: boolean } | null;
    },
    enabled: !!user,
  });

  const subscribe = useMutation({
    mutationFn: async () => {
      const payload: any = {
        user_id: user!.id,
        product_id: productId,
        variant_id: variantId || null,
        email: user!.email,
      };
      await supabase.from("stock_notifications" as any).insert(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: "You'll be notified!",
        description: `We'll send you a notification${variantLabel ? ` for ${variantLabel}` : ""} when it's back in stock.`,
      });
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast({ title: "Already subscribed", description: "You're already on the waitlist." });
      } else {
        toast.error("Failed to subscribe: " + e.message);
      }
    },
  });

  const unsubscribe = useMutation({
    mutationFn: async () => {
      if (!subscription?.id) return;
      await supabase.from("stock_notifications" as any).delete().eq("id", subscription.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Notification removed" });
    },
  });

  if (!user) {
    return (
      <div className={cn("flex items-center gap-2 p-3 rounded-xl border border-border bg-secondary/10", className)}>
        <Bell className="w-4 h-4 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          <button
            onClick={() => toast({ title: "Please sign in", description: "Sign in to get notified when this item is back in stock.", variant: "destructive" })}
            className="text-primary hover:underline font-medium"
          >
            Sign in
          </button>
          {" "}to get notified when back in stock
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 p-3 rounded-xl border border-border", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking...</span>
      </div>
    );
  }

  if (subscription) {
    return (
      <div className={cn("flex items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5", className)}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">You're on the waitlist</p>
            <p className="text-xs text-muted-foreground">
              We'll notify you{variantLabel ? ` about ${variantLabel}` : ""} when it's available
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => unsubscribe.mutate()}
          disabled={unsubscribe.isPending}
          className="text-xs text-muted-foreground hover:text-destructive shrink-0"
        >
          {unsubscribe.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3 mr-1" />}
          Remove
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => subscribe.mutate()}
      disabled={subscribe.isPending}
      variant="outline"
      className={cn("w-full gap-2 border-primary/30 text-primary hover:bg-primary/10", className)}
    >
      {subscribe.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      Notify Me When Available
    </Button>
  );
};

export default NotifyWhenAvailable;
