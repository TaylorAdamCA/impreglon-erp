import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">New Customer</h1>
        <p className="mt-1 text-muted-foreground">
          Create a new customer record.
        </p>
      </div>

      <div className="max-w-2xl">
        <CustomerForm />
      </div>
    </div>
  );
}
