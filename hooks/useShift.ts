"use client";

import { useState, useEffect } from "react";

export function useShift() {
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    let storedShift = localStorage.getItem("active_shift_id");
    let storedCashier = localStorage.getItem("active_cashier_id");

    const authUserStr = localStorage.getItem("auth_user");
    if (authUserStr) {
      try {
        const user = JSON.parse(authUserStr);
        const username = user.username || "Admin";

        // Automatically bind active desk person to currently logged-in account
        storedCashier = username;
        localStorage.setItem("active_cashier_id", username);
        localStorage.setItem("cashierName", username);

        if (!storedShift) {
          storedShift = `shift_${username}_${new Date().toISOString().split('T')[0]}`;
          localStorage.setItem("active_shift_id", storedShift);
        }
      } catch (e) {}
    }

    if (storedShift && storedCashier) {
      setShiftId(storedShift);
      setCashierId(storedCashier);
    }
  }, []);

  const startShift = (cashier: string) => {
    const newShiftId = crypto.randomUUID();
    localStorage.setItem("active_shift_id", newShiftId);
    localStorage.setItem("active_cashier_id", cashier);
    localStorage.setItem("cashierName", cashier);
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
