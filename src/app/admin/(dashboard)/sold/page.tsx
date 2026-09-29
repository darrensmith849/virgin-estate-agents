import { ClosedListings } from "@/components/admin/closed-listings";

export const metadata = { title: "Sold" };

export default function SoldPage() {
  return <ClosedListings status="sold" />;
}
