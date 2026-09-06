"use client";

import { useState, useEffect } from "react";

export function useShift() {
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const storedShift = localStorage.getItem("active_shift_id");
    const storedCashier = localStorage.getItem("active_cashier_id");
    if (storedShift && storedCashier) {
      setShiftId(storedShift);
      setCashierId(storedCashier);
    }
  }, []);

  const startShift = (cashier: string) => {
    const newShiftId = crypto.randomUUID();
    localStorage.setItem("active_shift_id", newShiftId);
    localStorage.setItem("active_cashier_id", cashier);
    setShiftId(newShiftId);
    setCashierId(cashier);
  };

  const endShift = () => {
    localStorage.removeItem("active_shift_id");
    localStorage.removeItem("active_cashier_id");
    setShiftId(null);
    setCashierId(null);
  };

  return { shiftId, cashierId, startShift, endShift };
}
