import MypageBilling from "@/components/MypageBilling";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "L14 - 정기구매 관리",
};

export default function MypageBillingPage() {
  return <MypageBilling />;
}
