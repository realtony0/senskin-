import Home from "@/app/page";

export const metadata = {
  title: "Administration | SKIN'S",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminPage() {
  return <Home routeMode="admin" />;
}
