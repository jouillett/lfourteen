"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const grade = localStorage.getItem("customerGrade");
    if (isLoggedIn && grade === "8") {
      router.replace("/confidential");
    }
  }, [router]);

  return null;
}
