import { ClosedListings } from "@/components/admin/closed-listings";

export const metadata = { title: "Rented" };

export default function RentedPage() {
  return <ClosedListings status="rented" />;
}
