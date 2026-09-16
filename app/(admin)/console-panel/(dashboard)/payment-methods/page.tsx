import { getAdminPaymentMethods } from '@/lib/queries';
import PaymentMethodsClient from './payment-methods-client';

export const dynamic = 'force-dynamic';

export default async function PaymentMethodsPage() {
  const data = await getAdminPaymentMethods();
  return <PaymentMethodsClient initialData={data.methods} />;
}
