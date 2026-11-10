import { ProductEditor } from "@/components/app/product-editor";
import { getUserOrRedirect } from "@/lib/server/session";
import { ensureStore } from "@/lib/server/store";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const user = await getUserOrRedirect();
  const store = await ensureStore(user.id);
  return (
    <ProductEditor
      store={{ fssaiLicense: store.fssaiLicense, ondcEnabled: store.ondcEnabled }}
      connected={{ SHOPIFY: false, AMAZON: false }}
    />
  );
}
