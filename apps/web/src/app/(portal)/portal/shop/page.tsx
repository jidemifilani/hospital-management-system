"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ShoppingCart, Search, Plus, Minus, Trash2, Loader2, ShoppingBag } from "lucide-react";
import { portalApi, getPortalPatient } from "@/lib/portal-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

const NGN = (n: number | string) =>
  Number(n).toLocaleString("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

interface CatalogItem {
  id: string;
  name: string;
  code: string;
  unit: string;
  sellingPrice: string;
  category: string;
  genericName?: string;
  levels: { quantity: number }[];
}

interface CartEntry { item: CatalogItem; qty: number }

export default function PortalShopPage() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"PICKUP" | "DELIVERY">("PICKUP");
  const { toast } = useToast();
  const router = useRouter();
  const patient = getPortalPatient();

  const { data: catalog = [], isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["shop-catalog"],
    queryFn: () =>
      portalApi.get("/shop/catalog").then((r) => r.data),
    staleTime: 120_000,
  });

  const filtered = useMemo(() =>
    search
      ? catalog.filter((c) =>
          `${c.name} ${c.code} ${c.category}`.toLowerCase().includes(search.toLowerCase()),
        )
      : catalog,
  [catalog, search]);

  const totalQty = cart.reduce((s, e) => s + e.qty, 0);
  const totalPrice = cart.reduce((s, e) => s + Number(e.item.sellingPrice) * e.qty, 0);

  const addToCart = (item: CatalogItem) => {
    setCart((prev) => {
      const existing = prev.find((e) => e.item.id === item.id);
      if (existing) return prev.map((e) => e.item.id === item.id ? { ...e, qty: e.qty + 1 } : e);
      return [...prev, { item, qty: 1 }];
    });
  };

  const setQty = (itemId: string, qty: number) => {
    if (qty <= 0) setCart((prev) => prev.filter((e) => e.item.id !== itemId));
    else setCart((prev) => prev.map((e) => e.item.id === itemId ? { ...e, qty } : e));
  };

  const checkout = useMutation({
    mutationFn: () =>
      portalApi.post("/shop/orders", {
        items: cart.map((e) => ({ itemId: e.item.id, quantity: e.qty })),
        deliveryMethod,
      }),
    onSuccess: ({ data }) => {
      setCart([]);
      setCartOpen(false);
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        toast({ title: "Order placed", description: `Order ${data.order.orderNumber}` });
        router.push("/portal/orders");
      }
    },
    onError: () =>
      toast({ title: "Checkout failed", description: "Please try again.", variant: "destructive" }),
  });

  // Redirecting from an effect rather than from the render.
  //
  // Calling router.replace() while rendering reaches for `location`, which
  // does not exist when the page is prerendered, so `next build` failed on
  // this page with "ReferenceError: location is not defined". The portal's
  // logout page already does it this way.
  useEffect(() => {
    if (!patient) router.replace("/portal/login");
  }, [patient, router]);

  if (!patient) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Online Pharmacy</h1>
          <p className="text-sm text-muted-foreground">Order OTC medications for pickup or delivery</p>
        </div>

        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="relative">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Cart
              {totalQty > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {totalQty}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md flex flex-col">
            <SheetHeader>
              <SheetTitle>Your Cart ({totalQty} item{totalQty !== 1 ? "s" : ""})</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Your cart is empty.</p>
              ) : cart.map((entry) => (
                <div key={entry.item.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{entry.item.name}</p>
                    <p className="text-xs text-muted-foreground">{NGN(entry.item.sellingPrice)} / {entry.item.unit}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setQty(entry.item.id, entry.qty - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border hover:bg-muted"
                    >
                      {entry.qty === 1 ? <Trash2 className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
                    </button>
                    <span className="w-6 text-center text-sm tabular-nums">{entry.qty}</span>
                    <button
                      onClick={() => setQty(entry.item.id, entry.qty + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="w-20 text-right text-sm font-semibold tabular-nums">
                    {NGN(Number(entry.item.sellingPrice) * entry.qty)}
                  </p>
                </div>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-3">
                <div className="flex gap-2">
                  {(["PICKUP", "DELIVERY"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setDeliveryMethod(m)}
                      className={`flex-1 rounded-lg border py-2 text-sm font-medium transition-colors ${
                        deliveryMethod === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {m === "PICKUP" ? "Pickup at pharmacy" : "Home delivery"}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span>{NGN(totalPrice)}</span>
                </div>
                <Button
                  className="w-full"
                  onClick={() => checkout.mutate()}
                  disabled={checkout.isPending}
                >
                  {checkout.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Pay with Paystack
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <ShoppingBag className="h-10 w-10" />
          <p className="text-sm">{search ? "No products match your search." : "No products available."}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const inCart = cart.find((e) => e.item.id === item.id);
            const totalStock = item.levels.reduce((s, l) => s + l.quantity, 0);
            return (
              <Card key={item.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col p-4 gap-2">
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.code} · {item.unit}</p>
                    {item.genericName && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.genericName}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-lg font-bold">{NGN(item.sellingPrice)}</p>
                    {totalStock === 0 ? (
                      <Badge className="bg-red-100 text-red-700 text-xs">Out of stock</Badge>
                    ) : !inCart ? (
                      <Button size="sm" onClick={() => addToCart(item)}>
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setQty(item.id, inCart.qty - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border hover:bg-muted"
                        >
                          {inCart.qty === 1 ? <Trash2 className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3" />}
                        </button>
                        <span className="w-6 text-center text-sm tabular-nums font-medium">{inCart.qty}</span>
                        <button
                          onClick={() => setQty(item.id, inCart.qty + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full border hover:bg-muted"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
