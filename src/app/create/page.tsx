import { CreateTripForm } from '@/components/trip/create-form';

export const metadata = {
  title: 'Create a Trip — TripTangle',
};

export default function CreatePage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-brand-deep">
            Create a Trip
          </h1>
          <p className="mt-2 text-muted-foreground">
            Set up your trip details and invite your group.
          </p>
        </div>
        <div className="rounded-2xl bg-card shadow-md p-6">
          <CreateTripForm />
        </div>
      </div>
    </div>
  );
}
