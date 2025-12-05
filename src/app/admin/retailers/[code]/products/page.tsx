import { RetailerProductsManager } from "@/components/admin/config/retailer-products-manager";

export default async function RetailerProductsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return (
    <div className="container mx-auto px-6 py-8">
      <RetailerProductsManager retailerCode={code} />
    </div>
  );
}
