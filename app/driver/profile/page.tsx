export default async function DriverProfilePage() {
  // Without auth, we can't identify a specific driver, so show empty state
  return (
    <div className="container max-w-[1200px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center py-12">
        <h1 className="text-heading-lg font-semibold mb-4">Driver Profile</h1>
        <p className="text-muted-foreground">
          Driver profile information is not available.
        </p>
      </div>
    </div>
  );
}


