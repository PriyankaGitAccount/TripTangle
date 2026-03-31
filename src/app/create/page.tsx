import { CreateTripForm } from '@/components/trip/create-form';

export const metadata = {
  title: 'Create a Trip — TripTangle',
};

export default function CreatePage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-brand-deep">
          Create a Trip
        </h1>
        <p className="mb-8 text-muted-foreground">
          Set up your trip details and invite your group.
        </p>
        <CreateTripForm />
      </div>
    </div>
  );
}
